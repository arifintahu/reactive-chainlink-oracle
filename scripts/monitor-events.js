const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Monitor price feed update events on destination chain
 */

async function main() {
    console.log("=".repeat(60));
    console.log("Monitoring Price Feed Events");
    console.log("=".repeat(60));
    
    // Load deployment info
    const deploymentsDir = path.join(__dirname, '../deployments');
    const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith('deployment-'));
    
    if (files.length === 0) {
        console.error("❌ No deployment info found!");
        process.exit(1);
    }
    
    const latestDeployment = files.sort().reverse()[0];
    const deploymentInfo = JSON.parse(
        fs.readFileSync(path.join(deploymentsDir, latestDeployment), 'utf8')
    );
    
    console.log("\nMonitoring contract:", deploymentInfo.contracts.destinationFeedProxy.address);
    console.log("Press Ctrl+C to stop\n");
    
    // Get destination proxy contract
    const destinationProxy = await hre.ethers.getContractAt(
        "DestinationFeedProxy",
        deploymentInfo.contracts.destinationFeedProxy.address
    );
    
    // Display current state
    try {
        const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
            await destinationProxy.latestRoundData();
        
        console.log("Current State:");
        console.log("  Round ID:", roundId.toString());
        console.log("  Price:", hre.ethers.formatUnits(answer, 8), "USD");
        console.log("  Updated:", new Date(Number(updatedAt) * 1000).toLocaleString());
        console.log("  Decimals:", await destinationProxy.decimals());
        console.log("\n" + "-".repeat(60));
    } catch (error) {
        console.log("Current State: No data available yet");
        console.log("\n" + "-".repeat(60));
    }
    
    // Listen for AnswerUpdated events
    destinationProxy.on("AnswerUpdated", (current, roundId, updatedAt, event) => {
        console.log("\n🔔 NEW PRICE UPDATE");
        console.log("  Time:", new Date(Number(updatedAt) * 1000).toLocaleString());
        console.log("  Round ID:", roundId.toString());
        console.log("  Price:", hre.ethers.formatUnits(current, 8), "USD");
        console.log("  Transaction:", event.log.transactionHash);
        console.log("  Block:", event.log.blockNumber);
        console.log("-".repeat(60));
    });
    
    // Listen for NewRound events
    destinationProxy.on("NewRound", (roundId, startedBy, startedAt, event) => {
        console.log("\n📢 NEW ROUND STARTED");
        console.log("  Round ID:", roundId.toString());
        console.log("  Started By:", startedBy);
        console.log("  Started At:", new Date(Number(startedAt) * 1000).toLocaleString());
        console.log("  Transaction:", event.log.transactionHash);
        console.log("-".repeat(60));
    });
    
    // Listen for ReactiveContractUpdated events
    destinationProxy.on("ReactiveContractUpdated", (oldContract, newContract, event) => {
        console.log("\n⚙️ REACTIVE CONTRACT UPDATED");
        console.log("  Old:", oldContract);
        console.log("  New:", newContract);
        console.log("  Transaction:", event.log.transactionHash);
        console.log("-".repeat(60));
    });
    
    console.log("\n👂 Listening for events...\n");
    
    // Query historical events
    const fromBlock = (await hre.ethers.provider.getBlockNumber()) - 1000;
    const answerUpdatedFilter = destinationProxy.filters.AnswerUpdated();
    const events = await destinationProxy.queryFilter(answerUpdatedFilter, fromBlock);
    
    if (events.length > 0) {
        console.log(`\n📋 Recent events (last ${events.length}):\n`);
        
        for (const event of events.slice(-5)) {
            const block = await event.getBlock();
            console.log(`  Block ${event.blockNumber} (${new Date(block.timestamp * 1000).toLocaleString()})`);
            console.log(`    Round: ${event.args[1].toString()}`);
            console.log(`    Price: ${hre.ethers.formatUnits(event.args[0], 8)} USD`);
            console.log(`    TX: ${event.transactionHash}\n`);
        }
        console.log("-".repeat(60));
    }
    
    // Keep the script running
    await new Promise(() => {});
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });