const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DID Storage Contracts to SKALE Network...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy DID Factory first
  console.log("\nDeploying DIDFactory...");
  const DIDFactory = await ethers.getContractFactory("DIDFactory");
  const didFactory = await DIDFactory.deploy();
  await didFactory.deployed();
  console.log("DIDFactory deployed to:", didFactory.address);

  // Create a registry using the factory
  console.log("\nCreating registry via factory...");
  const registryId = "main-registry-v1";
  const tx = await didFactory.createRegistry(registryId);
  const receipt = await tx.wait();
  
  // Get the registry addresses from the event
  const event = receipt.events.find(e => e.event === 'RegistryCreated');
  const didRegistryAddress = event.args.didRegistry;
  const vcRegistryAddress = event.args.vcRegistry;
  
  console.log("Registry created with ID:", registryId);
  console.log("DID Registry deployed to:", didRegistryAddress);
  console.log("VC Registry deployed to:", vcRegistryAddress);

  // Verify the deployment
  console.log("\nVerifying deployment...");
  const registryInfo = await didFactory.getRegistry(registryId);
  console.log("Registry info:", {
    didRegistry: registryInfo.didRegistry,
    vcRegistry: registryInfo.vcRegistry,
    isActive: registryInfo.isActive,
    createdAt: new Date(registryInfo.createdAt.toNumber() * 1000).toISOString()
  });

  // Get contract instances for verification
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const VCRegistry = await ethers.getContractFactory("VCRegistry");
  
  const didRegistry = DIDRegistry.attach(didRegistryAddress);
  const vcRegistry = VCRegistry.attach(vcRegistryAddress);

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nContract Addresses:");
  console.log("DIDFactory:", didFactory.address);
  console.log("DIDRegistry:", didRegistryAddress);
  console.log("VCRegistry:", vcRegistryAddress);
  console.log("\nRegistry ID:", registryId);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      didFactory: didFactory.address,
      didRegistry: didRegistryAddress,
      vcRegistry: vcRegistryAddress
    },
    registryId: registryId,
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Example usage
  console.log("\n📝 Example Usage:");
  console.log("1. Create a DID:");
  console.log(`   await didRegistry.createDID("did:example:123", '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:123"}'`);
  
  console.log("\n2. Issue a VC:");
  console.log(`   await vcRegistry.issueVC("vc:example:456", "did:example:123", '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"]}'`);
  
  console.log("\n3. Check if DID is active:");
  console.log(`   await didRegistry.isDIDActive("did:example:123")`);
  
  console.log("\n4. Check if VC is valid:");
  console.log(`   await vcRegistry.isVCValid("vc:example:456")`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
