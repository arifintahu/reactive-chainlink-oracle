const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Verify the complete setup is working correctly
 */

async function main() {
    console.log("=".repeat(60));
    console.log("Verifying Cross-Chain Oracle Setup");
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
    
    console.log("\nDeployment:", latestDeployment);
    console.log("\n" + "=".repeat(60));
    console.log("Contract Addresses");
    console.log("=".repeat(60));
    
    let allChecks = [];
    
    // Check 1: Destination Proxy exists
    console.log("\n1. Checking Destination Proxy...");
    const proxyAddress = deploymentInfo.contracts.destinationFeedProxy?.address;
    
    if (!proxyAddress) {
        console.log("   ❌ Destination proxy not deployed");
        allChecks.push(false);
    } else {
        console.log("   ✓ Address:", proxyAddress);
        
        try {
            const proxy = await hre.ethers.getContractAt("DestinationFeedProxy", proxyAddress);
            
            // Check contract exists
            const code = await hre.ethers.provider.getCode(proxyAddress);
            if (code === '0x') {
                console.log("   ❌ No contract at address");
                allChecks.push(false);
            } else {
                console.log("   ✓ Contract deployed");
                
                // Check metadata
                const decimals = await proxy.decimals();
                const description = await proxy.description();
                const version = await proxy.version();
                
                console.log(`   ✓ Decimals: ${decimals}`);
                console.log(`   ✓ Description: ${description}`);
                console.log(`   ✓ Version: ${version}`);
                
                allChecks.push(true);
            }
        } catch (error) {
            console.log("   ❌ Error checking proxy:", error.message);
            allChecks.push(false);
        }
    }
    
    // Check 2: Reactive Contract exists
    console.log("\n2. Checking Reactive Contract...");
    const reactiveAddress = deploymentInfo.contracts.reactivePriceFeed?.address;
    
    if (!reactiveAddress) {
        console.log("   ❌ Reactive contract not deployed");
        console.log("   → Run: npx hardhat run scripts/deploy-reactive.js --network reactive");
        allChecks.push(false);
    } else {
        console.log("   ✓ Address:", reactiveAddress);
        console.log("   ✓ Subscription ID:", deploymentInfo.contracts.reactivePriceFeed.subscriptionId);
        allChecks.push(true);
    }
    
    // Check 3: Configuration
    console.log("\n3. Checking Configuration...");
    
    if (!proxyAddress || !reactiveAddress) {
        console.log("   ⚠ Skipping (contracts not deployed)");
    } else {
        try {
            const proxy = await hre.ethers.getContractAt("DestinationFeedProxy", proxyAddress);
            const configuredReactive = await proxy.reactiveContract();
            
            if (configuredReactive.toLowerCase() === reactiveAddress.toLowerCase()) {
                console.log("   ✓ Reactive contract configured correctly");
                allChecks.push(true);
            } else {
                console.log("   ❌ Reactive contract not configured");
                console.log("   Expected:", reactiveAddress);
                console.log("   Actual:  ", configuredReactive);
                console.log("   → Run: npx hardhat run scripts/configure.js --network sepolia");
                allChecks.push(false);
            }
        } catch (error) {
            console.log("   ❌ Error checking configuration:", error.message);
            allChecks.push(false);
        }
    }

    // Check 3.1: Callback Proxy
    console.log("\n3.1 Checking Callback Proxy...");
    const CALLBACK_PROXY_BY_NETWORK = {
        sepolia: "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA"
    };
    const expectedCallbackProxy = CALLBACK_PROXY_BY_NETWORK[hre.network.name];
    if (!proxyAddress) {
        console.log("   ⚠ Skipping (proxy not deployed)");
    } else if (!expectedCallbackProxy) {
        console.log("   ⚠ No known callback proxy for network:", hre.network.name);
        allChecks.push(true);
    } else {
        try {
            const proxy = await hre.ethers.getContractAt("DestinationFeedProxy", proxyAddress);
            const currentCallbackProxy = await proxy.callbackProxy();
            console.log("   ✓ Expected:", expectedCallbackProxy);
            console.log("   ✓ Actual:  ", currentCallbackProxy);
            const match = currentCallbackProxy.toLowerCase() === expectedCallbackProxy.toLowerCase();
            console.log("   Match:", match ? "✓" : "❌");
            allChecks.push(match);
        } catch (error) {
            console.log("   ❌ Error checking callback proxy:", error.message);
            allChecks.push(false);
        }
    }
    
    // Check 4: Price Data
    console.log("\n4. Checking Price Data...");
    
    if (!proxyAddress) {
        console.log("   ⚠ Skipping (proxy not deployed)");
    } else {
        try {
            const proxy = await hre.ethers.getContractAt("DestinationFeedProxy", proxyAddress);
            const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
                await proxy.latestRoundData();
            
            console.log("   ✓ Latest price data available:");
            console.log(`     Round ID: ${roundId}`);
            console.log(`     Price: ${hre.ethers.formatUnits(answer, 8)} USD`);
            console.log(`     Updated: ${new Date(Number(updatedAt) * 1000).toLocaleString()}`);
            
            // Check if data is stale (>1 hour old)
            const now = Math.floor(Date.now() / 1000);
            const age = now - Number(updatedAt);
            
            if (age > 3600) {
                console.log(`   ⚠ Price data is ${Math.floor(age / 60)} minutes old`);
            } else {
                console.log(`   ✓ Price data is fresh (${Math.floor(age / 60)} minutes old)`);
            }
            
            allChecks.push(true);
        } catch (error) {
            if (error.message.includes("No data available")) {
                console.log("   ⚠ No price data yet - waiting for first update");
                console.log("   → Ensure reactive contract is funded with REACT");
            } else {
                console.log("   ❌ Error:", error.message);
            }
            allChecks.push(false);
        }
    }
    
    // Check 5: Event History
    console.log("\n5. Checking Event History...");
    
    if (!proxyAddress) {
        console.log("   ⚠ Skipping (proxy not deployed)");
    } else {
        try {
            const proxy = await hre.ethers.getContractAt("DestinationFeedProxy", proxyAddress);
            const currentBlock = await hre.ethers.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            
            const filter = proxy.filters.AnswerUpdated();
            const events = await proxy.queryFilter(filter, fromBlock);
            
            if (events.length === 0) {
                console.log("   ⚠ No update events found yet");
                console.log("   → Wait for Chainlink to publish new prices");
            } else {
                console.log(`   ✓ Found ${events.length} price updates`);
                console.log(`   Latest update: block ${events[events.length - 1].blockNumber}`);
            }
            
            allChecks.push(events.length > 0);
        } catch (error) {
            console.log("   ❌ Error checking events:", error.message);
            allChecks.push(false);
        }
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Verification Summary");
    console.log("=".repeat(60));
    
    const passedChecks = allChecks.filter(c => c === true).length;
    const totalChecks = allChecks.length;
    
    console.log(`\n${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks) {
        console.log("\n✅ All checks passed! Your oracle is ready.");
        console.log("\nTo monitor live updates:");
        console.log("  npx hardhat run scripts/monitor-events.js --network sepolia");
    } else {
        console.log("\n⚠️ Some checks failed. Please review the output above.");
    }
    
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
