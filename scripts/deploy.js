const hre = require("hardhat");

/**
 * Deployment script for Cross-Chain Price Feed Oracle
 * 
 * This script deploys:
 * 1. DestinationFeedProxy on destination chain
 * 2. PriceFeedReactiveContract on Reactive Network
 */

// Configuration
const CONFIG = {
    // Chainlink ETH/USD Price Feed on Sepolia
    CHAINLINK_AGGREGATOR: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    ORIGIN_CHAIN_ID: 11155111, // Sepolia
    DESTINATION_CHAIN_ID: 11155111, // Sepolia (for testing)
    DECIMALS: 8,
    DESCRIPTION: "ETH / USD",
    
    // Network RPC URLs (configure in hardhat.config.js)
    REACTIVE_RPC: process.env.REACTIVE_RPC || "https://kopli-rpc.reactive.network",
    DESTINATION_RPC: process.env.DESTINATION_RPC || process.env.SEPOLIA_RPC,
};

async function main() {
    console.log("=".repeat(60));
    console.log("Cross-Chain Price Feed Oracle Deployment");
    console.log("=".repeat(60));
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("\nDeploying with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
    
    // Step 1: Deploy DestinationFeedProxy on destination chain
    console.log("\n" + "=".repeat(60));
    console.log("Step 1: Deploying DestinationFeedProxy on Destination Chain");
    console.log("=".repeat(60));
    
    const DestinationFeedProxy = await hre.ethers.getContractFactory("DestinationFeedProxy");
    
    // Temporarily use deployer address as reactive contract (will update later)
    const destinationProxy = await DestinationFeedProxy.deploy(
        deployer.address, // Temporary, will update after reactive contract deployment
        CONFIG.DECIMALS,
        CONFIG.DESCRIPTION
    );
    
    await destinationProxy.waitForDeployment();
    const destinationProxyAddress = await destinationProxy.getAddress();
    
    console.log("✓ DestinationFeedProxy deployed at:", destinationProxyAddress);
    console.log("  Decimals:", CONFIG.DECIMALS);
    console.log("  Description:", CONFIG.DESCRIPTION);
    
    // Step 2: Deploy PriceFeedReactiveContract on Reactive Network
    console.log("\n" + "=".repeat(60));
    console.log("Step 2: Deploying PriceFeedReactiveContract on Reactive Network");
    console.log("=".repeat(60));
    console.log("⚠ Switch to Reactive Network in your Hardhat config");
    console.log("  Then run: npx hardhat run scripts/deploy-reactive.js --network reactive");
    
    console.log("\nUse these parameters:");
    console.log({
        chainlinkAggregator: CONFIG.CHAINLINK_AGGREGATOR,
        originChainId: CONFIG.ORIGIN_CHAIN_ID,
        destinationChainId: CONFIG.DESTINATION_CHAIN_ID,
        destinationFeedProxy: destinationProxyAddress,
        decimals: CONFIG.DECIMALS,
        description: CONFIG.DESCRIPTION
    });
    
    // Step 3: Update DestinationFeedProxy with reactive contract address
    console.log("\n" + "=".repeat(60));
    console.log("Step 3: Post-deployment configuration");
    console.log("=".repeat(60));
    console.log("After deploying reactive contract, update the destination proxy:");
    console.log("  await destinationProxy.updateReactiveContract(REACTIVE_CONTRACT_ADDRESS)");
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            destinationFeedProxy: {
                address: destinationProxyAddress,
                chain: "destination",
                chainId: CONFIG.DESTINATION_CHAIN_ID
            }
        },
        configuration: {
            chainlinkAggregator: CONFIG.CHAINLINK_AGGREGATOR,
            originChainId: CONFIG.ORIGIN_CHAIN_ID,
            destinationChainId: CONFIG.DESTINATION_CHAIN_ID,
            decimals: CONFIG.DECIMALS,
            description: CONFIG.DESCRIPTION
        }
    };
    
    console.log("\n" + "=".repeat(60));
    console.log("Deployment Summary");
    console.log("=".repeat(60));
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '../deployments');
    
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filename = `deployment-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentsDir, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n✓ Deployment info saved to:", filename);
    console.log("\nNext steps:");
    console.log("1. Deploy reactive contract on Reactive Network");
    console.log("2. Update destination proxy with reactive contract address");
    console.log("3. Fund reactive contract with REACT tokens");
    console.log("4. Monitor price feed updates!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });