const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Deploy Reactive Contract on Reactive Network
 * Run this AFTER deploying DestinationFeedProxy
 */

async function main() {
    console.log("=".repeat(60));
    console.log("Deploying Reactive Contract on Reactive Network");
    console.log("=".repeat(60));
    
    // Load previous deployment info
    const deploymentsDir = path.join(__dirname, '../deployments');
    const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith('deployment-'));
    
    if (files.length === 0) {
        console.error("❌ No deployment info found. Deploy destination proxy first!");
        process.exit(1);
    }
    
    const latestDeployment = files.sort().reverse()[0];
    const deploymentInfo = JSON.parse(
        fs.readFileSync(path.join(deploymentsDir, latestDeployment), 'utf8')
    );
    
    console.log("\nLoaded deployment info from:", latestDeployment);
    console.log("Destination Proxy:", deploymentInfo.contracts.destinationFeedProxy.address);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("\nDeploying with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "REACT");
    
    // Deploy Reactive Contract
    console.log("\n" + "=".repeat(60));
    console.log("Deploying PriceFeedReactiveContract...");
    console.log("=".repeat(60));
    
    const PriceFeedReactiveContract = await hre.ethers.getContractFactory("PriceFeedReactiveContract");
    
    const reactiveContract = await PriceFeedReactiveContract.deploy(
        deploymentInfo.configuration.chainlinkAggregator,
        deploymentInfo.configuration.originChainId,
        deploymentInfo.configuration.destinationChainId,
        deploymentInfo.contracts.destinationFeedProxy.address,
        deploymentInfo.configuration.decimals,
        deploymentInfo.configuration.description
    );
    
    await reactiveContract.waitForDeployment();
    const reactiveContractAddress = await reactiveContract.getAddress();
    
    console.log("✓ PriceFeedReactiveContract deployed at:", reactiveContractAddress);
    
    const tx = await reactiveContract.setupSubscription();
    await tx.wait();

    console.log("✓ Subscription created");
    
    // Update deployment info
    deploymentInfo.contracts.reactivePriceFeed = {
        address: reactiveContractAddress,
        chain: "reactive",
        subscription: true
    };
    
    // Save updated deployment info
    fs.writeFileSync(
        path.join(deploymentsDir, latestDeployment),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n" + "=".repeat(60));
    console.log("Deployment Complete!");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("  Reactive Contract:", reactiveContractAddress);
    console.log("  Destination Proxy:", deploymentInfo.contracts.destinationFeedProxy.address);
    console.log("  Subscription:", "created");
    
    console.log("\n" + "=".repeat(60));
    console.log("IMPORTANT: Next Steps");
    console.log("=".repeat(60));
    console.log("\n1. Update Destination Proxy:");
    console.log("   Switch back to destination network and run:");
    console.log(`   await destinationProxy.updateReactiveContract("${reactiveContractAddress}")`);
    
    console.log("\n2. Fund the Reactive Contract:");
    console.log("   The reactive contract needs REACT tokens to pay for callbacks.");
    console.log("   Send REACT to:", reactiveContractAddress);
    console.log("   Recommended: 0.1 - 1 REACT for testing");
    
    console.log("\n3. Monitor Events:");
    console.log("   - Origin: Chainlink AnswerUpdated events");
    console.log("   - Reactive: FeedUpdateRelayed events");
    console.log("   - Destination: AnswerUpdated events");
    
    console.log("\n✓ Setup complete! Price feed updates will now be relayed automatically.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
