// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IDIDRegistry.sol";

/**
 * @title DIDRegistry
 * @dev Smart contract for storing and managing DID documents on SKALE network
 */
contract DIDRegistry is IDIDRegistry, Ownable, Pausable, ReentrancyGuard {
    
    struct DIDDocument {
        string document;
        address owner;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Mapping from DID to DIDDocument
    mapping(string => DIDDocument) private _didDocuments;
    
    // Mapping from owner address to array of DIDs they own
    mapping(address => string[]) private _ownerDIDs;
    
    // Mapping to track if a DID exists
    mapping(string => bool) private _didExists;

    // Events
    // event DIDCreated(string indexed did, address indexed owner, string document);
    // event DIDUpdated(string indexed did, address indexed owner, string document);
    // event DIDDeactivated(string indexed did, address indexed owner);
    // event DIDOwnershipTransferred(string indexed did, address indexed previousOwner, address indexed newOwner);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new DID
     * @param did The DID identifier
     * @param document The DID document in JSON format
     */
    function createDID(string calldata did, string calldata document) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(bytes(document).length > 0, "Document cannot be empty");
        require(!_didExists[did], "DID already exists");

        _didDocuments[did] = DIDDocument({
            document: document,
            owner: msg.sender,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _didExists[did] = true;
        _ownerDIDs[msg.sender].push(did);

        emit DIDCreated(did, msg.sender, document);
    }

    /**
     * @dev Updates an existing DID document
     * @param did The DID identifier
     * @param document The updated DID document in JSON format
     */
    function updateDID(string calldata did, string calldata document) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(_didExists[did], "DID does not exist");
        require(_didDocuments[did].isActive, "DID is not active");
        require(_didDocuments[did].owner == msg.sender, "Only owner can update DID");
        require(bytes(document).length > 0, "Document cannot be empty");

        _didDocuments[did].document = document;
        _didDocuments[did].updatedAt = block.timestamp;

        emit DIDUpdated(did, msg.sender, document);
    }

    /**
     * @dev Deactivates a DID
     * @param did The DID identifier
     */
    function deactivateDID(string calldata did) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(_didExists[did], "DID does not exist");
        require(_didDocuments[did].isActive, "DID is already deactivated");
        require(_didDocuments[did].owner == msg.sender, "Only owner can deactivate DID");

        _didDocuments[did].isActive = false;
        _didDocuments[did].updatedAt = block.timestamp;

        emit DIDDeactivated(did, msg.sender);
    }

    /**
     * @dev Transfers ownership of a DID to a new address
     * @param did The DID identifier
     * @param newOwner The new owner address
     */
    function transferDIDOwnership(string calldata did, address newOwner) 
        external 
        override 
        whenNotPaused 
        nonReentrant 
    {
        require(_didExists[did], "DID does not exist");
        require(_didDocuments[did].isActive, "DID is not active");
        require(_didDocuments[did].owner == msg.sender, "Only owner can transfer DID");
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != msg.sender, "New owner cannot be current owner");

        address previousOwner = _didDocuments[did].owner;
        _didDocuments[did].owner = newOwner;
        _didDocuments[did].updatedAt = block.timestamp;

        // Remove DID from previous owner's list
        _removeDIDFromOwner(previousOwner, did);
        
        // Add DID to new owner's list
        _ownerDIDs[newOwner].push(did);

        emit DIDOwnershipTransferred(did, previousOwner, newOwner);
    }

    /**
     * @dev Retrieves the DID document
     * @param did The DID identifier
     * @return document The DID document
     * @return owner The owner of the DID
     * @return isActive Whether the DID is active
     * @return createdAt The timestamp when the DID was created
     * @return updatedAt The timestamp when the DID was last updated
     */
    function getDID(string calldata did) 
        external 
        view 
        override 
        returns (
            string memory document,
            address owner,
            bool isActive,
            uint256 createdAt,
            uint256 updatedAt
        ) 
    {
        require(_didExists[did], "DID does not exist");
        
        DIDDocument memory doc = _didDocuments[did];
        return (doc.document, doc.owner, doc.isActive, doc.createdAt, doc.updatedAt);
    }

    /**
     * @dev Checks if a DID exists and is active
     * @param did The DID identifier
     * @return True if the DID exists and is active
     */
    function isDIDActive(string calldata did) external view override returns (bool) {
        return _didExists[did] && _didDocuments[did].isActive;
    }

    /**
     * @dev Gets the owner of a DID
     * @param did The DID identifier
     * @return The owner address
     */
    function getDIDOwner(string calldata did) external view override returns (address) {
        require(_didExists[did], "DID does not exist");
        return _didDocuments[did].owner;
    }

    /**
     * @dev Gets all DIDs owned by an address
     * @param owner The owner address
     * @return Array of DIDs owned by the address
     */
    function getDIDsByOwner(address owner) external view returns (string[] memory) {
        return _ownerDIDs[owner];
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

    /**
     * @dev Removes a DID from an owner's list
     * @param owner The owner address
     * @param did The DID to remove
     */
    function _removeDIDFromOwner(address owner, string memory did) private {
        string[] storage dids = _ownerDIDs[owner];
        for (uint256 i = 0; i < dids.length; i++) {
            if (keccak256(bytes(dids[i])) == keccak256(bytes(did))) {
                dids[i] = dids[dids.length - 1];
                dids.pop();
                break;
            }
        }
    }
}
