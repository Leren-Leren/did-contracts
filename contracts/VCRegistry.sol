// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVCRegistry.sol";
import "./IDIDRegistry.sol";

/**
 * @title VCRegistry
 * @dev Smart contract for storing and managing Verifiable Credentials on SKALE network
 */
contract VCRegistry is IVCRegistry, Ownable, Pausable, ReentrancyGuard {
    
    struct VerifiableCredential {
        string credential;
        address issuer;
        string holder;
        bool isRevoked;
        uint256 issuedAt;
        uint256 updatedAt;
    }

    // Reference to DID Registry
    IDIDRegistry public didRegistry;

    // Mapping from VC ID to VerifiableCredential
    mapping(string => VerifiableCredential) private _verifiableCredentials;
    
    // Mapping from issuer address to array of VC IDs they issued
    mapping(address => string[]) private _issuerVCs;
    
    // Mapping from holder DID to array of VC IDs they hold
    mapping(string => string[]) private _holderVCs;
    
    // Mapping to track if a VC exists
    mapping(string => bool) private _vcExists;

    // Events
    // event VCIssued(string indexed vcId, address indexed issuer, string indexed holder, string credential);
    // event VCRevoked(string indexed vcId, address indexed issuer);
    // event VCUpdated(string indexed vcId, address indexed issuer, string credential);

    constructor(address _didRegistry) Ownable(msg.sender) {
        require(_didRegistry != address(0), "DID Registry address cannot be zero");
        didRegistry = IDIDRegistry(_didRegistry);
    }

    /**
     * @dev Issues a new Verifiable Credential
     * @param vcId The unique identifier of the VC
     * @param holder The DID of the holder
     * @param credential The VC document in JSON format
     */
    function issueVC(string calldata vcId, string calldata holder, string calldata credential) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(vcId).length > 0, "VC ID cannot be empty");
        require(bytes(holder).length > 0, "Holder DID cannot be empty");
        require(bytes(credential).length > 0, "Credential cannot be empty");
        require(!_vcExists[vcId], "VC already exists");
        require(didRegistry.isDIDActive(holder), "Holder DID must be active");

        _verifiableCredentials[vcId] = VerifiableCredential({
            credential: credential,
            issuer: msg.sender,
            holder: holder,
            isRevoked: false,
            issuedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _vcExists[vcId] = true;
        _issuerVCs[msg.sender].push(vcId);
        _holderVCs[holder].push(vcId);

        emit VCIssued(vcId, msg.sender, holder, credential);
    }

    /**
     * @dev Revokes a Verifiable Credential
     * @param vcId The unique identifier of the VC
     */
    function revokeVC(string calldata vcId) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(_vcExists[vcId], "VC does not exist");
        require(_verifiableCredentials[vcId].issuer == msg.sender, "Only issuer can revoke VC");
        require(!_verifiableCredentials[vcId].isRevoked, "VC is already revoked");

        _verifiableCredentials[vcId].isRevoked = true;
        _verifiableCredentials[vcId].updatedAt = block.timestamp;

        emit VCRevoked(vcId, msg.sender);
    }

    /**
     * @dev Updates an existing Verifiable Credential
     * @param vcId The unique identifier of the VC
     * @param credential The updated VC document in JSON format
     */
    function updateVC(string calldata vcId, string calldata credential) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(_vcExists[vcId], "VC does not exist");
        require(_verifiableCredentials[vcId].issuer == msg.sender, "Only issuer can update VC");
        require(!_verifiableCredentials[vcId].isRevoked, "Cannot update revoked VC");
        require(bytes(credential).length > 0, "Credential cannot be empty");

        _verifiableCredentials[vcId].credential = credential;
        _verifiableCredentials[vcId].updatedAt = block.timestamp;

        emit VCUpdated(vcId, msg.sender, credential);
    }

    /**
     * @dev Retrieves a Verifiable Credential
     * @param vcId The unique identifier of the VC
     * @return credential The VC document
     * @return issuer The issuer of the VC
     * @return holder The holder of the VC
     * @return isRevoked Whether the VC is revoked
     * @return issuedAt The timestamp when the VC was issued
     * @return updatedAt The timestamp when the VC was last updated
     */
    function getVC(string calldata vcId) 
        external 
        view 
        override 
        returns (
            string memory credential,
            address issuer,
            string memory holder,
            bool isRevoked,
            uint256 issuedAt,
            uint256 updatedAt
        ) 
    {
        require(_vcExists[vcId], "VC does not exist");
        
        VerifiableCredential memory vc = _verifiableCredentials[vcId];
        return (vc.credential, vc.issuer, vc.holder, vc.isRevoked, vc.issuedAt, vc.updatedAt);
    }

    /**
     * @dev Checks if a VC is valid (not revoked)
     * @param vcId The unique identifier of the VC
     * @return True if the VC is valid
     */
    function isVCValid(string calldata vcId) external view override returns (bool) {
        return _vcExists[vcId] && !_verifiableCredentials[vcId].isRevoked;
    }

    /**
     * @dev Gets all VCs issued by an address
     * @param issuer The issuer address
     * @return Array of VC IDs issued by the address
     */
    function getVCsByIssuer(address issuer) external view override returns (string[] memory) {
        return _issuerVCs[issuer];
    }

    /**
     * @dev Gets all VCs held by a DID
     * @param holder The holder DID
     * @return Array of VC IDs held by the DID
     */
    function getVCsByHolder(string calldata holder) external view override returns (string[] memory) {
        return _holderVCs[holder];
    }

    /**
     * @dev Updates the DID Registry reference (only owner)
     * @param newDidRegistry The new DID Registry address
     */
    function updateDidRegistry(address newDidRegistry) external onlyOwner {
        require(newDidRegistry != address(0), "DID Registry address cannot be zero");
        didRegistry = IDIDRegistry(newDidRegistry);
    }

    /**
     * @dev Pauses the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
