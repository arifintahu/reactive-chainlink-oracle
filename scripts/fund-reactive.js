const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsDir = path.join(__dirname, "../deployments");
  const files = fs.readdirSync(deploymentsDir).filter((f) => f.startsWith("deployment-"));
  if (files.length === 0) {
    console.error("No deployment info found");
    process.exit(1);
  }

  const latestDeployment = files.sort().reverse()[0];
  const deploymentInfo = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestDeployment), "utf8"));
  const reactiveAddr = deploymentInfo.contracts?.reactivePriceFeed?.address;
  if (!reactiveAddr) {
    console.error("reactivePriceFeed address not found in deployments");
    process.exit(1);
  }

  const [sender] = await hre.ethers.getSigners();
  const value = hre.ethers.parseEther("0.3");

  console.log("Network:", hre.network.name);
  console.log("From:", sender.address);
  console.log("To:", reactiveAddr);
  console.log("Amount:", hre.ethers.formatEther(value), "REACT");

  const balBefore = await hre.ethers.provider.getBalance(sender.address);
  console.log("Balance before:", hre.ethers.formatEther(balBefore), "REACT");

  const tx = await sender.sendTransaction({ to: reactiveAddr, value });
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  const balAfter = await hre.ethers.provider.getBalance(sender.address);
  console.log("Balance after:", hre.ethers.formatEther(balAfter), "REACT");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

