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
        console.log("✓ Reactive contract already configured");
    } else {
        console.log("\nUpdating reactive contract address...");
        const tx = await destinationProxy.updateReactiveContract(
            deploymentInfo.contracts.reactivePriceFeed.address
        );
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✓ Reactive contract updated");
    }

    const CALLBACK_PROXY_BY_NETWORK = {
        sepolia: "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA"
    };

    const expectedCallbackProxy = CALLBACK_PROXY_BY_NETWORK[hre.network.name];
    if (!expectedCallbackProxy) {
        console.log("\n⚠ No known callback proxy for network:", hre.network.name);
    } else {
        const currentCallbackProxy = await destinationProxy.callbackProxy();
        console.log("\nCurrent callback proxy:", currentCallbackProxy);
        if (currentCallbackProxy.toLowerCase() !== expectedCallbackProxy.toLowerCase()) {
            console.log("Updating callback proxy to:", expectedCallbackProxy);
            const tx2 = await destinationProxy.updateCallbackProxy(expectedCallbackProxy);
            console.log("Transaction hash:", tx2.hash);
            console.log("Waiting for confirmation...");
            await tx2.wait();
            console.log("✓ Callback proxy updated");
        } else {
            console.log("✓ Callback proxy already configured");
        }
    }
    
    console.log("\n✓ Configuration complete!");
    
    // Verify
    const newReactive = await destinationProxy.reactiveContract();
    const newCallbackProxy = await destinationProxy.callbackProxy();
    console.log("\nVerification:");
    console.log("  Reactive Expected:", deploymentInfo.contracts.reactivePriceFeed.address);
    console.log("  Reactive Actual:  ", newReactive);
    console.log("  Reactive Match:   ", newReactive === deploymentInfo.contracts.reactivePriceFeed.address ? "✓" : "❌");
    if (expectedCallbackProxy) {
        console.log("  Callback Expected:", expectedCallbackProxy);
        console.log("  Callback Actual:  ", newCallbackProxy);
        console.log("  Callback Match:   ", newCallbackProxy.toLowerCase() === expectedCallbackProxy.toLowerCase() ? "✓" : "❌");
    }
    
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
