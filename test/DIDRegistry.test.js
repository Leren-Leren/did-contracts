const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDRegistry", function () {
  let didRegistry;
  let owner;
  let user1;
  let user2;
  let user3;

  const sampleDID = "did:example:123";
  const sampleDocument = '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:123","verificationMethod":[{"id":"did:example:123#key-1","type":"Ed25519VerificationKey2018","controller":"did:example:123","publicKeyBase58":"123456789abcdef"}]}';
  const updatedDocument = '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:123","verificationMethod":[{"id":"did:example:123#key-1","type":"Ed25519VerificationKey2018","controller":"did:example:123","publicKeyBase58":"987654321fedcba"}]}';

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await didRegistry.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await didRegistry.paused()).to.be.false;
    });
  });

  describe("DID Creation", function () {
    it("Should create a DID successfully", async function () {
      await expect(didRegistry.connect(user1).createDID(sampleDID, sampleDocument))
        .to.emit(didRegistry, "DIDCreated")
        .withArgs(sampleDID, user1.address, sampleDocument);

      const didInfo = await didRegistry.getDID(sampleDID);
      expect(didInfo.document).to.equal(sampleDocument);
      expect(didInfo.owner).to.equal(user1.address);
      expect(didInfo.isActive).to.be.true;
    });

    it("Should fail to create DID with empty DID", async function () {
      await expect(
        didRegistry.connect(user1).createDID("", sampleDocument)
      ).to.be.revertedWith("DID cannot be empty");
    });

    it("Should fail to create DID with empty document", async function () {
      await expect(
        didRegistry.connect(user1).createDID(sampleDID, "")
      ).to.be.revertedWith("Document cannot be empty");
    });

    it("Should fail to create duplicate DID", async function () {
      await didRegistry.connect(user1).createDID(sampleDID, sampleDocument);
      
      await expect(
        didRegistry.connect(user2).createDID(sampleDID, sampleDocument)
      ).to.be.revertedWith("DID already exists");
    });

    it("Should fail to create DID when contract is paused", async function () {
      await didRegistry.pause();
      
      await expect(
        didRegistry.connect(user1).createDID(sampleDID, sampleDocument)
      ).to.be.revertedWithCustomError(didRegistry, "EnforcedPause");
    });
  });

  describe("DID Updates", function () {
    beforeEach(async function () {
      await didRegistry.connect(user1).createDID(sampleDID, sampleDocument);
    });

    it("Should update DID document successfully", async function () {
      await expect(didRegistry.connect(user1).updateDID(sampleDID, updatedDocument))
        .to.emit(didRegistry, "DIDUpdated")
        .withArgs(sampleDID, user1.address, updatedDocument);

      const didInfo = await didRegistry.getDID(sampleDID);
      expect(didInfo.document).to.equal(updatedDocument);
    });

    it("Should fail to update non-existent DID", async function () {
      await expect(
        didRegistry.connect(user1).updateDID("did:example:456", updatedDocument)
      ).to.be.revertedWith("DID does not exist");
    });

    it("Should fail to update DID by non-owner", async function () {
      await expect(
        didRegistry.connect(user2).updateDID(sampleDID, updatedDocument)
      ).to.be.revertedWith("Only owner can update DID");
    });

    it("Should fail to update deactivated DID", async function () {
      await didRegistry.connect(user1).deactivateDID(sampleDID);
      
      await expect(
        didRegistry.connect(user1).updateDID(sampleDID, updatedDocument)
      ).to.be.revertedWith("DID is not active");
    });

    it("Should fail to update with empty document", async function () {
      await expect(
        didRegistry.connect(user1).updateDID(sampleDID, "")
      ).to.be.revertedWith("Document cannot be empty");
    });
  });

  describe("DID Deactivation", function () {
    beforeEach(async function () {
      await didRegistry.connect(user1).createDID(sampleDID, sampleDocument);
    });

    it("Should deactivate DID successfully", async function () {
      await expect(didRegistry.connect(user1).deactivateDID(sampleDID))
        .to.emit(didRegistry, "DIDDeactivated")
        .withArgs(sampleDID, user1.address);

      const didInfo = await didRegistry.getDID(sampleDID);
      expect(didInfo.isActive).to.be.false;
    });

    it("Should fail to deactivate non-existent DID", async function () {
      await expect(
        didRegistry.connect(user1).deactivateDID("did:example:456")
      ).to.be.revertedWith("DID does not exist");
    });

    it("Should fail to deactivate DID by non-owner", async function () {
      await expect(
        didRegistry.connect(user2).deactivateDID(sampleDID)
      ).to.be.revertedWith("Only owner can deactivate DID");
    });

    it("Should fail to deactivate already deactivated DID", async function () {
      await didRegistry.connect(user1).deactivateDID(sampleDID);
      
      await expect(
        didRegistry.connect(user1).deactivateDID(sampleDID)
      ).to.be.revertedWith("DID is already deactivated");
    });
  });

  describe("DID Ownership Transfer", function () {
    beforeEach(async function () {
      await didRegistry.connect(user1).createDID(sampleDID, sampleDocument);
    });

    it("Should transfer DID ownership successfully", async function () {
      await expect(didRegistry.connect(user1).transferDIDOwnership(sampleDID, user2.address))
        .to.emit(didRegistry, "DIDOwnershipTransferred")
        .withArgs(sampleDID, user1.address, user2.address);

      const didInfo = await didRegistry.getDID(sampleDID);
      expect(didInfo.owner).to.equal(user2.address);
    });

    it("Should fail to transfer non-existent DID", async function () {
      await expect(
        didRegistry.connect(user1).transferDIDOwnership("did:example:456", user2.address)
      ).to.be.revertedWith("DID does not exist");
    });

    it("Should fail to transfer by non-owner", async function () {
      await expect(
        didRegistry.connect(user2).transferDIDOwnership(sampleDID, user3.address)
      ).to.be.revertedWith("Only owner can transfer DID");
    });

    it("Should fail to transfer deactivated DID", async function () {
      await didRegistry.connect(user1).deactivateDID(sampleDID);
      
      await expect(
        didRegistry.connect(user1).transferDIDOwnership(sampleDID, user2.address)
      ).to.be.revertedWith("DID is not active");
    });

    it("Should fail to transfer to zero address", async function () {
      await expect(
        didRegistry.connect(user1).transferDIDOwnership(sampleDID, ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });

    it("Should fail to transfer to current owner", async function () {
      await expect(
        didRegistry.connect(user1).transferDIDOwnership(sampleDID, user1.address)
      ).to.be.revertedWith("New owner cannot be current owner");
    });
  });

  describe("DID Queries", function () {
    beforeEach(async function () {
      await didRegistry.connect(user1).createDID(sampleDID, sampleDocument);
    });

    it("Should return correct DID information", async function () {
      const didInfo = await didRegistry.getDID(sampleDID);
      
      expect(didInfo.document).to.equal(sampleDocument);
      expect(didInfo.owner).to.equal(user1.address);
      expect(didInfo.isActive).to.be.true;
      expect(didInfo.createdAt).to.be.gt(0);
      expect(didInfo.updatedAt).to.be.gt(0);
    });

    it("Should return correct owner", async function () {
      const owner = await didRegistry.getDIDOwner(sampleDID);
      expect(owner).to.equal(user1.address);
    });

    it("Should return true for active DID", async function () {
      const isActive = await didRegistry.isDIDActive(sampleDID);
      expect(isActive).to.be.true;
    });

    it("Should return false for deactivated DID", async function () {
      await didRegistry.connect(user1).deactivateDID(sampleDID);
      
      const isActive = await didRegistry.isDIDActive(sampleDID);
      expect(isActive).to.be.false;
    });

    it("Should return false for non-existent DID", async function () {
      const isActive = await didRegistry.isDIDActive("did:example:456");
      expect(isActive).to.be.false;
    });

    it("Should return DIDs by owner", async function () {
      const did2 = "did:example:456";
      const document2 = '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:456"}';
      
      await didRegistry.connect(user1).createDID(did2, document2);
      
      const userDIDs = await didRegistry.getDIDsByOwner(user1.address);
      expect(userDIDs).to.include(sampleDID);
      expect(userDIDs).to.include(did2);
      expect(userDIDs.length).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await didRegistry.pause();
      expect(await didRegistry.paused()).to.be.true;
      
      await didRegistry.unpause();
      expect(await didRegistry.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        didRegistry.connect(user1).pause()
      ).to.be.revertedWithCustomError(didRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to unpause", async function () {
      await didRegistry.pause();
      
      await expect(
        didRegistry.connect(user1).unpause()
      ).to.be.revertedWithCustomError(didRegistry, "OwnableUnauthorizedAccount");
    });
  });
});
