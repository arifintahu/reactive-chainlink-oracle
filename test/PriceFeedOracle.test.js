const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Cross-Chain Price Feed Oracle", function () {
    let destinationProxy;
    let reactiveContract;
    let owner;
    let reactive;
    let unauthorized;
    
    const CHAINLINK_AGGREGATOR = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const ORIGIN_CHAIN_ID = 11155111; // Sepolia
    const DESTINATION_CHAIN_ID = 11155111;
    const DECIMALS = 8;
    const DESCRIPTION = "ETH / USD";
    
    beforeEach(async function () {
        [owner, reactive, unauthorized] = await ethers.getSigners();
        
        // Deploy DestinationFeedProxy
        const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
        destinationProxy = await DestinationFeedProxy.deploy(
            reactive.address,
            DECIMALS,
            DESCRIPTION
        );
        await destinationProxy.waitForDeployment();
    });
    
    describe("DestinationFeedProxy", function () {
        describe("Deployment", function () {
            it("Should set the correct reactive contract", async function () {
                expect(await destinationProxy.reactiveContract()).to.equal(reactive.address);
            });
            
            it("Should set the correct decimals", async function () {
                expect(await destinationProxy.decimals()).to.equal(DECIMALS);
            });
            
            it("Should set the correct description", async function () {
                expect(await destinationProxy.description()).to.equal(DESCRIPTION);
            });
            
            it("Should set the correct owner", async function () {
                expect(await destinationProxy.owner()).to.equal(owner.address);
            });
            
            it("Should set version to 1", async function () {
                expect(await destinationProxy.version()).to.equal(1);
            });
        });
        
        describe("updateAnswer", function () {
            const roundId = 100;
            const answer = ethers.parseUnits("2000", 8); // $2000
            let updatedAt;
            let startedAt;
            
            beforeEach(async function () {
                updatedAt = await time.latest();
                startedAt = updatedAt - 60; // 60 seconds before
            });
            
            it("Should allow reactive contract to update answer", async function () {
                await expect(
                    destinationProxy.connect(reactive).updateAnswer(
                        roundId,
                        answer,
                        updatedAt,
                        startedAt,
                        DECIMALS,
                        DESCRIPTION
                    )
                ).to.emit(destinationProxy, "AnswerUpdated")
                 .withArgs(answer, roundId, updatedAt);
            });
            
            it("Should reject updates from unauthorized addresses", async function () {
                await expect(
                    destinationProxy.connect(unauthorized).updateAnswer(
                        roundId,
                        answer,
                        updatedAt,
                        startedAt,
                        DECIMALS,
                        DESCRIPTION
                    )
                ).to.be.revertedWith("Only reactive contract");
            });
            
            it("Should store round data correctly", async function () {
                await destinationProxy.connect(reactive).updateAnswer(
                    roundId,
                    answer,
                    updatedAt,
                    startedAt,
                    DECIMALS,
                    DESCRIPTION
                );
                
                const [rId, ans, sAt, uAt, aInR] = await destinationProxy.getRoundData(roundId);
                
                expect(rId).to.equal(roundId);
                expect(ans).to.equal(answer);
                expect(sAt).to.equal(startedAt);
                expect(uAt).to.equal(updatedAt);
                expect(aInR).to.equal(roundId);
            });
            
            it("Should update latestRound correctly", async function () {
                await destinationProxy.connect(reactive).updateAnswer(
                    roundId,
                    answer,
                    updatedAt,
                    startedAt,
                    DECIMALS,
                    DESCRIPTION
                );
                
                const [rId, ans, sAt, uAt, aInR] = await destinationProxy.latestRoundData();
                
                expect(rId).to.equal(roundId);
                expect(ans).to.equal(answer);
                expect(sAt).to.equal(startedAt);
                expect(uAt).to.equal(updatedAt);
                expect(aInR).to.equal(roundId);
            });
            
            it("Should reject non-increasing round IDs", async function () {
                // First update
                await destinationProxy.connect(reactive).updateAnswer(
                    roundId,
                    answer,
                    updatedAt,
                    startedAt,
                    DECIMALS,
                    DESCRIPTION
                );
                
                // Try to update with same or lower round ID
                await expect(
                    destinationProxy.connect(reactive).updateAnswer(
                        roundId,
                        answer,
                        updatedAt + 100,
                        startedAt + 100,
                        DECIMALS,
                        DESCRIPTION
                    )
                ).to.be.revertedWith("Round ID must increase");
            });
            
            it("Should reject negative answers", async function () {
                await expect(
                    destinationProxy.connect(reactive).updateAnswer(
                        roundId,
                        -1,
                        updatedAt,
                        startedAt,
                        DECIMALS,
                        DESCRIPTION
                    )
                ).to.be.revertedWith("Invalid answer");
            });
            
            it("Should emit NewRound event", async function () {
                await expect(
                    destinationProxy.connect(reactive).updateAnswer(
                        roundId,
                        answer,
                        updatedAt,
                        startedAt,
                        DECIMALS,
                        DESCRIPTION
                    )
                ).to.emit(destinationProxy, "NewRound")
                 .withArgs(roundId, reactive.address, startedAt);
            });
        });
        
        describe("AggregatorV3Interface Compatibility", function () {
            const roundId = 100;
            const answer = ethers.parseUnits("2000", 8);
            let updatedAt;
            let startedAt;
            
            beforeEach(async function () {
                updatedAt = await time.latest();
                startedAt = updatedAt - 60;
                
                await destinationProxy.connect(reactive).updateAnswer(
                    roundId,
                    answer,
                    updatedAt,
                    startedAt,
                    DECIMALS,
                    DESCRIPTION
                );
            });
            
            it("Should return correct latestAnswer", async function () {
                expect(await destinationProxy.latestAnswer()).to.equal(answer);
            });
            
            it("Should return correct latestTimestamp", async function () {
                expect(await destinationProxy.latestTimestamp()).to.equal(updatedAt);
            });
            
            it("Should return correct latestRound", async function () {
                expect(await destinationProxy.latestRound()).to.equal(roundId);
            });
            
            it("Should return correct getAnswer", async function () {
                expect(await destinationProxy.getAnswer(roundId)).to.equal(answer);
            });
            
            it("Should return correct getTimestamp", async function () {
                expect(await destinationProxy.getTimestamp(roundId)).to.equal(updatedAt);
            });
            
            it("Should revert when querying non-existent round", async function () {
                await expect(
                    destinationProxy.getRoundData(999)
                ).to.be.revertedWith("No data for round");
            });
        });
        
        describe("Access Control", function () {
            it("Should allow owner to update reactive contract", async function () {
                const newReactive = unauthorized.address;
                
                await expect(
                    destinationProxy.updateReactiveContract(newReactive)
                ).to.emit(destinationProxy, "ReactiveContractUpdated")
                 .withArgs(reactive.address, newReactive);
                
                expect(await destinationProxy.reactiveContract()).to.equal(newReactive);
            });
            
            it("Should reject reactive contract update from non-owner", async function () {
                await expect(
                    destinationProxy.connect(unauthorized).updateReactiveContract(unauthorized.address)
                ).to.be.revertedWith("Only owner");
            });
            
            it("Should reject zero address for reactive contract", async function () {
                await expect(
                    destinationProxy.updateReactiveContract(ethers.ZeroAddress)
                ).to.be.revertedWith("Invalid address");
            });
            
            it("Should allow owner to transfer ownership", async function () {
                await destinationProxy.transferOwnership(unauthorized.address);
                expect(await destinationProxy.owner()).to.equal(unauthorized.address);
            });
            
            it("Should reject ownership transfer from non-owner", async function () {
                await expect(
                    destinationProxy.connect(unauthorized).transferOwnership(unauthorized.address)
                ).to.be.revertedWith("Only owner");
            });
        });
        
        describe("Multiple Round Updates", function () {
            it("Should handle multiple sequential updates", async function () {
                const rounds = [
                    { id: 100, price: ethers.parseUnits("2000", 8) },
                    { id: 101, price: ethers.parseUnits("2050", 8) },
                    { id: 102, price: ethers.parseUnits("1980", 8) },
                ];
                
                for (const round of rounds) {
                    const updatedAt = await time.latest();
                    const startedAt = updatedAt - 60;
                    
                    await destinationProxy.connect(reactive).updateAnswer(
                        round.id,
                        round.price,
                        updatedAt,
                        startedAt,
                        DECIMALS,
                        DESCRIPTION
                    );
                    
                    // Verify each round
                    const [, ans] = await destinationProxy.getRoundData(round.id);
                    expect(ans).to.equal(round.price);
                    
                    // Advance time
                    await time.increase(60);
                }
                
                // Verify latest is the last one
                const [latestRoundId, latestAnswer] = await destinationProxy.latestRoundData();
                expect(latestRoundId).to.equal(rounds[rounds.length - 1].id);
                expect(latestAnswer).to.equal(rounds[rounds.length - 1].price);
            });
        });
        
        describe("Edge Cases", function () {
            it("Should revert when querying data before any updates", async function () {
                const newProxy = await (await ethers.getContractFactory("DestinationFeedProxy"))
                    .deploy(reactive.address, DECIMALS, DESCRIPTION);
                
                await expect(
                    newProxy.latestRoundData()
                ).to.be.revertedWith("No data available");
            });
            
            it("Should handle very large round IDs", async function () {
                const largeRoundId = 2n ** 80n - 1n; // Max uint80
                const answer = ethers.parseUnits("2000", 8);
                const updatedAt = await time.latest();
                
                await destinationProxy.connect(reactive).updateAnswer(
                    largeRoundId,
                    answer,
                    updatedAt,
                    updatedAt - 60,
                    DECIMALS,
                    DESCRIPTION
                );
                
                const [rId] = await destinationProxy.latestRoundData();
                expect(rId).to.equal(largeRoundId);
            });
            
            it("Should handle very large prices", async function () {
                const largePrice = 2n ** 255n - 1n; // Max int256
                const roundId = 100;
                const updatedAt = await time.latest();
                
                await destinationProxy.connect(reactive).updateAnswer(
                    roundId,
                    largePrice,
                    updatedAt,
                    updatedAt - 60,
                    DECIMALS,
                    DESCRIPTION
                );
                
                const [, ans] = await destinationProxy.latestRoundData();
                expect(ans).to.equal(largePrice);
            });
        });
    });
});