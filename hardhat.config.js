require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        // Ethereum Sepolia Testnet
        sepolia: {
            url: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111,
            gasMultiplier: 1.2,
        },
        
        // Reactive Network Kopli Testnet
        reactive: {
            url: process.env.REACTIVE_RPC || "https://lasna-rpc.rnk.dev",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 5318007,
            gasMultiplier: 1.2,
        },
        
        // Reactive Network Mainnet
        reactiveMainnet: {
            url: "https://mainnet-rpc.rnk.dev",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 1597, // To be confirmed
            gasMultiplier: 1.2,
        },
        
        // Ethereum Mainnet
        mainnet: {
            url: process.env.MAINNET_RPC || "https://eth.llamarpc.com",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 1,
            gasMultiplier: 1.2,
        },
        
        // Hardhat local network
        hardhat: {
            chainId: 31337,
            forking: process.env.SEPOLIA_RPC ? {
                url: process.env.SEPOLIA_RPC,
                blockNumber: 6000000
            } : undefined
        }
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
            mainnet: process.env.ETHERSCAN_API_KEY || ""
        }
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
        gasPrice: 50,
        coinmarketcap: process.env.COINMARKETCAP_API_KEY
    },
    mocha: {
        timeout: 60000
    }
};