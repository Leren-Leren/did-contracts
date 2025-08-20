const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDFactory", function () {
  let didFactory;
  let owner;
  let user1;
  let user2;

  const registryId = "test-registry-v1";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const DIDFactory = await ethers.getContractFactory("DIDFactory");
    didFactory = await DIDFactory.deploy();
    await didFactory.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await didFactory.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await didFactory.paused()).to.be.false;
    });

    it("Should start with zero registries", async function () {
      expect(await didFactory.getRegistryCount()).to.equal(0);
    });
  });

  describe("Registry Creation", function () {
    it("Should create a registry successfully", async function () {
      await expect(didFactory.createRegistry(registryId))
        .to.emit(didFactory, "RegistryCreated")
        .withArgs(registryId, expect.any(String), expect.any(String));

      const registryInfo = await didFactory.getRegistry(registryId);
      expect(registryInfo.didRegistry).to.not.equal(ethers.constants.AddressZero);
      expect(registryInfo.vcRegistry).to.not.equal(ethers.constants.AddressZero);
      expect(registryInfo.isActive).to.be.true;
      expect(registryInfo.createdAt).to.be.gt(0);
    });

    it("Should increment registry count", async function () {
      await didFactory.createRegistry(registryId);
      expect(await didFactory.getRegistryCount()).to.equal(1);
    });

    it("Should add registry ID to the list", async function () {
      await didFactory.createRegistry(registryId);
      const registryIds = await didFactory.getAllRegistryIds();
      expect(registryIds).to.include(registryId);
      expect(registryIds.length).to.equal(1);
    });

    it("Should fail to create registry with empty ID", async function () {
      await expect(
        didFactory.createRegistry("")
      ).to.be.revertedWith("Registry ID cannot be empty");
    });

    it("Should fail to create duplicate registry", async function () {
      await didFactory.createRegistry(registryId);
      
      await expect(
        didFactory.createRegistry(registryId)
      ).to.be.revertedWith("Registry already exists");
    });

    it("Should fail to create registry when contract is paused", async function () {
      await didFactory.pause();
      
      await expect(
        didFactory.createRegistry(registryId)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should fail to create registry by non-owner", async function () {
      await expect(
        didFactory.connect(user1).createRegistry(registryId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should deploy working DID and VC registries", async function () {
      const tx = await didFactory.createRegistry(registryId);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === 'RegistryCreated');
      const didRegistryAddress = event.args.didRegistry;
      const vcRegistryAddress = event.args.vcRegistry;

      // Test DID Registry functionality
      const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
      const didRegistry = DIDRegistry.attach(didRegistryAddress);
      
      const testDID = "did:example:123";
      const testDocument = '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:123"}';
      
      await didRegistry.connect(user1).createDID(testDID, testDocument);
      expect(await didRegistry.isDIDActive(testDID)).to.be.true;

      // Test VC Registry functionality
      const VCRegistry = await ethers.getContractFactory("VCRegistry");
      const vcRegistry = VCRegistry.attach(vcRegistryAddress);
      
      const testVCId = "vc:example:456";
      const testCredential = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"]}';
      
      await vcRegistry.connect(user2).issueVC(testVCId, testDID, testCredential);
      expect(await vcRegistry.isVCValid(testVCId)).to.be.true;
    });
  });

  describe("Registry Management", function () {
    beforeEach(async function () {
      await didFactory.createRegistry(registryId);
    });

    it("Should deactivate registry successfully", async function () {
      await expect(didFactory.deactivateRegistry(registryId))
        .to.emit(didFactory, "RegistryDeactivated")
        .withArgs(registryId);

      const registryInfo = await didFactory.getRegistry(registryId);
      expect(registryInfo.isActive).to.be.false;
    });

    it("Should reactivate registry successfully", async function () {
      await didFactory.deactivateRegistry(registryId);
      
      await expect(didFactory.reactivateRegistry(registryId))
        .to.emit(didFactory, "RegistryReactivated")
        .withArgs(registryId);

      const registryInfo = await didFactory.getRegistry(registryId);
      expect(registryInfo.isActive).to.be.true;
    });

    it("Should fail to deactivate non-existent registry", async function () {
      await expect(
        didFactory.deactivateRegistry("non-existent")
      ).to.be.revertedWith("Registry is not active");
    });

    it("Should fail to deactivate already deactivated registry", async function () {
      await didFactory.deactivateRegistry(registryId);
      
      await expect(
        didFactory.deactivateRegistry(registryId)
      ).to.be.revertedWith("Registry is not active");
    });

    it("Should fail to reactivate non-existent registry", async function () {
      await expect(
        didFactory.reactivateRegistry("non-existent")
      ).to.be.revertedWith("Registry does not exist");
    });

    it("Should fail to reactivate already active registry", async function () {
      await expect(
        didFactory.reactivateRegistry(registryId)
      ).to.be.revertedWith("Registry is already active");
    });

    it("Should fail to deactivate by non-owner", async function () {
      await expect(
        didFactory.connect(user1).deactivateRegistry(registryId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to reactivate by non-owner", async function () {
      await didFactory.deactivateRegistry(registryId);
      
      await expect(
        didFactory.connect(user1).reactivateRegistry(registryId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Registry Queries", function () {
    beforeEach(async function () {
      await didFactory.createRegistry(registryId);
    });

    it("Should return correct registry information", async function () {
      const registryInfo = await didFactory.getRegistry(registryId);
      
      expect(registryInfo.didRegistry).to.not.equal(ethers.constants.AddressZero);
      expect(registryInfo.vcRegistry).to.not.equal(ethers.constants.AddressZero);
      expect(registryInfo.isActive).to.be.true;
      expect(registryInfo.createdAt).to.be.gt(0);
    });

    it("Should return true for active registry", async function () {
      const isActive = await didFactory.isRegistryActive(registryId);
      expect(isActive).to.be.true;
    });

    it("Should return false for deactivated registry", async function () {
      await didFactory.deactivateRegistry(registryId);
      
      const isActive = await didFactory.isRegistryActive(registryId);
      expect(isActive).to.be.false;
    });

    it("Should return false for non-existent registry", async function () {
      const isActive = await didFactory.isRegistryActive("non-existent");
      expect(isActive).to.be.false;
    });

    it("Should return all registry IDs", async function () {
      const registryId2 = "test-registry-v2";
      await didFactory.createRegistry(registryId2);
      
      const registryIds = await didFactory.getAllRegistryIds();
      expect(registryIds).to.include(registryId);
      expect(registryIds).to.include(registryId2);
      expect(registryIds.length).to.equal(2);
    });

    it("Should return correct registry count", async function () {
      expect(await didFactory.getRegistryCount()).to.equal(1);
      
      const registryId2 = "test-registry-v2";
      await didFactory.createRegistry(registryId2);
      
      expect(await didFactory.getRegistryCount()).to.equal(2);
    });
  });

  describe("Multiple Registries", function () {
    it("Should handle multiple registries correctly", async function () {
      const registryId1 = "registry-1";
      const registryId2 = "registry-2";
      const registryId3 = "registry-3";

      // Create multiple registries
      await didFactory.createRegistry(registryId1);
      await didFactory.createRegistry(registryId2);
      await didFactory.createRegistry(registryId3);

      expect(await didFactory.getRegistryCount()).to.equal(3);

      const registryIds = await didFactory.getAllRegistryIds();
      expect(registryIds).to.include(registryId1);
      expect(registryIds).to.include(registryId2);
      expect(registryIds).to.include(registryId3);

      // Deactivate one registry
      await didFactory.deactivateRegistry(registryId2);
      expect(await didFactory.isRegistryActive(registryId1)).to.be.true;
      expect(await didFactory.isRegistryActive(registryId2)).to.be.false;
      expect(await didFactory.isRegistryActive(registryId3)).to.be.true;

      // Reactivate the deactivated registry
      await didFactory.reactivateRegistry(registryId2);
      expect(await didFactory.isRegistryActive(registryId2)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await didFactory.pause();
      expect(await didFactory.paused()).to.be.true;
      
      await didFactory.unpause();
      expect(await didFactory.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        didFactory.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to unpause", async function () {
      await didFactory.pause();
      
      await expect(
        didFactory.connect(user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
