const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Configure the destination proxy with reactive contract address
 */

async function main() {
    console.log("=".repeat(60));
    console.log("Configuring Destination Proxy");
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
    
    console.log("\nLoaded deployment:", latestDeployment);
    console.log("Destination Proxy:", deploymentInfo.contracts.destinationFeedProxy.address);
    console.log("Reactive Contract:", deploymentInfo.contracts.reactivePriceFeed?.address || "NOT DEPLOYED");
    
    if (!deploymentInfo.contracts.reactivePriceFeed) {
        console.error("\n❌ Reactive contract not deployed yet!");
        console.log("Run: npx hardhat run scripts/deploy-reactive.js --network reactive");
        process.exit(1);
    }
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("\nConfiguring with account:", deployer.address);
    
    // Get destination proxy contract
    const destinationProxy = await hre.ethers.getContractAt(
        "DestinationFeedProxy",
        deploymentInfo.contracts.destinationFeedProxy.address
    );
    
    // Check current reactive contract
    const currentReactive = await destinationProxy.reactiveContract();
    console.log("\nCurrent reactive contract:", currentReactive);
    
    if (currentReactive === deploymentInfo.contracts.reactivePriceFeed.address) {
        console.log("✓ Already configured correctly!");
        return;
    }
    
    // Update reactive contract address
    console.log("\nUpdating reactive contract address...");
    const tx = await destinationProxy.updateReactiveContract(
        deploymentInfo.contracts.reactivePriceFeed.address
    );
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    
    console.log("✓ Configuration complete!");
    
    // Verify
    const newReactive = await destinationProxy.reactiveContract();
    console.log("\nVerification:");
    console.log("  Expected:", deploymentInfo.contracts.reactivePriceFeed.address);
    console.log("  Actual:  ", newReactive);
    console.log("  Match:   ", newReactive === deploymentInfo.contracts.reactivePriceFeed.address ? "✓" : "❌");
    
    console.log("\n" + "=".repeat(60));
    console.log("Next Steps");
    console.log("=".repeat(60));
    console.log("1. Fund the reactive contract with REACT tokens");
    console.log("   Address:", deploymentInfo.contracts.reactivePriceFeed.address);
    console.log("   Amount: 0.1 - 1 REACT");
    console.log("\n2. Monitor for price updates:");
    console.log("   npx hardhat run scripts/monitor-events.js --network sepolia");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });