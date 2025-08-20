const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VCRegistry", function () {
  let vcRegistry;
  let didRegistry;
  let owner;
  let issuer;
  let holder;
  let user3;

  const sampleDID = "did:example:123";
  const sampleDocument = '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:example:123"}';
  const sampleVCId = "vc:example:456";
  const sampleCredential = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"],"issuer":"did:example:issuer","credentialSubject":{"id":"did:example:123","name":"John Doe"}}';
  const updatedCredential = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"],"issuer":"did:example:issuer","credentialSubject":{"id":"did:example:123","name":"John Doe Updated"}}';

  beforeEach(async function () {
    [owner, issuer, holder, user3] = await ethers.getSigners();
    
    // Deploy DID Registry first
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.deployed();

    // Deploy VC Registry with reference to DID Registry
    const VCRegistry = await ethers.getContractFactory("VCRegistry");
    vcRegistry = await VCRegistry.deploy(didRegistry.address);
    await vcRegistry.deployed();

    // Create a DID for the holder
    await didRegistry.connect(holder).createDID(sampleDID, sampleDocument);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vcRegistry.owner()).to.equal(owner.address);
    });

    it("Should set the correct DID registry reference", async function () {
      expect(await vcRegistry.didRegistry()).to.equal(didRegistry.address);
    });

    it("Should not be paused initially", async function () {
      expect(await vcRegistry.paused()).to.be.false;
    });
  });

  describe("VC Issuance", function () {
    it("Should issue a VC successfully", async function () {
      await expect(vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential))
        .to.emit(vcRegistry, "VCIssued")
        .withArgs(sampleVCId, issuer.address, sampleDID, sampleCredential);

      const vcInfo = await vcRegistry.getVC(sampleVCId);
      expect(vcInfo.credential).to.equal(sampleCredential);
      expect(vcInfo.issuer).to.equal(issuer.address);
      expect(vcInfo.holder).to.equal(sampleDID);
      expect(vcInfo.isRevoked).to.be.false;
    });

    it("Should fail to issue VC with empty VC ID", async function () {
      await expect(
        vcRegistry.connect(issuer).issueVC("", sampleDID, sampleCredential)
      ).to.be.revertedWith("VC ID cannot be empty");
    });

    it("Should fail to issue VC with empty holder", async function () {
      await expect(
        vcRegistry.connect(issuer).issueVC(sampleVCId, "", sampleCredential)
      ).to.be.revertedWith("Holder DID cannot be empty");
    });

    it("Should fail to issue VC with empty credential", async function () {
      await expect(
        vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, "")
      ).to.be.revertedWith("Credential cannot be empty");
    });

    it("Should fail to issue duplicate VC", async function () {
      await vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential);
      
      await expect(
        vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential)
      ).to.be.revertedWith("VC already exists");
    });

    it("Should fail to issue VC for inactive DID", async function () {
      await didRegistry.connect(holder).deactivateDID(sampleDID);
      
      await expect(
        vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential)
      ).to.be.revertedWith("Holder DID must be active");
    });

    it("Should fail to issue VC when contract is paused", async function () {
      await vcRegistry.pause();
      
      await expect(
        vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("VC Revocation", function () {
    beforeEach(async function () {
      await vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential);
    });

    it("Should revoke VC successfully", async function () {
      await expect(vcRegistry.connect(issuer).revokeVC(sampleVCId))
        .to.emit(vcRegistry, "VCRevoked")
        .withArgs(sampleVCId, issuer.address);

      const vcInfo = await vcRegistry.getVC(sampleVCId);
      expect(vcInfo.isRevoked).to.be.true;
    });

    it("Should fail to revoke non-existent VC", async function () {
      await expect(
        vcRegistry.connect(issuer).revokeVC("vc:example:789")
      ).to.be.revertedWith("VC does not exist");
    });

    it("Should fail to revoke VC by non-issuer", async function () {
      await expect(
        vcRegistry.connect(user3).revokeVC(sampleVCId)
      ).to.be.revertedWith("Only issuer can revoke VC");
    });

    it("Should fail to revoke already revoked VC", async function () {
      await vcRegistry.connect(issuer).revokeVC(sampleVCId);
      
      await expect(
        vcRegistry.connect(issuer).revokeVC(sampleVCId)
      ).to.be.revertedWith("VC is already revoked");
    });
  });

  describe("VC Updates", function () {
    beforeEach(async function () {
      await vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential);
    });

    it("Should update VC successfully", async function () {
      await expect(vcRegistry.connect(issuer).updateVC(sampleVCId, updatedCredential))
        .to.emit(vcRegistry, "VCUpdated")
        .withArgs(sampleVCId, issuer.address, updatedCredential);

      const vcInfo = await vcRegistry.getVC(sampleVCId);
      expect(vcInfo.credential).to.equal(updatedCredential);
    });

    it("Should fail to update non-existent VC", async function () {
      await expect(
        vcRegistry.connect(issuer).updateVC("vc:example:789", updatedCredential)
      ).to.be.revertedWith("VC does not exist");
    });

    it("Should fail to update VC by non-issuer", async function () {
      await expect(
        vcRegistry.connect(user3).updateVC(sampleVCId, updatedCredential)
      ).to.be.revertedWith("Only issuer can update VC");
    });

    it("Should fail to update revoked VC", async function () {
      await vcRegistry.connect(issuer).revokeVC(sampleVCId);
      
      await expect(
        vcRegistry.connect(issuer).updateVC(sampleVCId, updatedCredential)
      ).to.be.revertedWith("Cannot update revoked VC");
    });

    it("Should fail to update with empty credential", async function () {
      await expect(
        vcRegistry.connect(issuer).updateVC(sampleVCId, "")
      ).to.be.revertedWith("Credential cannot be empty");
    });
  });

  describe("VC Queries", function () {
    beforeEach(async function () {
      await vcRegistry.connect(issuer).issueVC(sampleVCId, sampleDID, sampleCredential);
    });

    it("Should return correct VC information", async function () {
      const vcInfo = await vcRegistry.getVC(sampleVCId);
      
      expect(vcInfo.credential).to.equal(sampleCredential);
      expect(vcInfo.issuer).to.equal(issuer.address);
      expect(vcInfo.holder).to.equal(sampleDID);
      expect(vcInfo.isRevoked).to.be.false;
      expect(vcInfo.issuedAt).to.be.gt(0);
      expect(vcInfo.updatedAt).to.be.gt(0);
    });

    it("Should return true for valid VC", async function () {
      const isValid = await vcRegistry.isVCValid(sampleVCId);
      expect(isValid).to.be.true;
    });

    it("Should return false for revoked VC", async function () {
      await vcRegistry.connect(issuer).revokeVC(sampleVCId);
      
      const isValid = await vcRegistry.isVCValid(sampleVCId);
      expect(isValid).to.be.false;
    });

    it("Should return false for non-existent VC", async function () {
      const isValid = await vcRegistry.isVCValid("vc:example:789");
      expect(isValid).to.be.false;
    });

    it("Should return VCs by issuer", async function () {
      const vcId2 = "vc:example:789";
      const credential2 = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"]}';
      
      await vcRegistry.connect(issuer).issueVC(vcId2, sampleDID, credential2);
      
      const issuerVCs = await vcRegistry.getVCsByIssuer(issuer.address);
      expect(issuerVCs).to.include(sampleVCId);
      expect(issuerVCs).to.include(vcId2);
      expect(issuerVCs.length).to.equal(2);
    });

    it("Should return VCs by holder", async function () {
      const vcId2 = "vc:example:789";
      const credential2 = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"]}';
      
      await vcRegistry.connect(issuer).issueVC(vcId2, sampleDID, credential2);
      
      const holderVCs = await vcRegistry.getVCsByHolder(sampleDID);
      expect(holderVCs).to.include(sampleVCId);
      expect(holderVCs).to.include(vcId2);
      expect(holderVCs.length).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await vcRegistry.pause();
      expect(await vcRegistry.paused()).to.be.true;
      
      await vcRegistry.unpause();
      expect(await vcRegistry.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        vcRegistry.connect(issuer).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to unpause", async function () {
      await vcRegistry.pause();
      
      await expect(
        vcRegistry.connect(issuer).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update DID registry reference", async function () {
      const newDidRegistry = ethers.Wallet.createRandom().address;
      await vcRegistry.updateDidRegistry(newDidRegistry);
      expect(await vcRegistry.didRegistry()).to.equal(newDidRegistry);
    });

    it("Should not allow non-owner to update DID registry reference", async function () {
      const newDidRegistry = ethers.Wallet.createRandom().address;
      await expect(
        vcRegistry.connect(issuer).updateDidRegistry(newDidRegistry)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow setting DID registry to zero address", async function () {
      await expect(
        vcRegistry.updateDidRegistry(ethers.constants.AddressZero)
      ).to.be.revertedWith("DID Registry address cannot be zero");
    });
  });
});
