// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDIDRegistry
 * @dev Interface for DID Registry operations
 */
interface IDIDRegistry {
    /**
     * @dev Emitted when a DID is created
     * @param did The DID identifier
     * @param owner The address that owns the DID
     * @param document The DID document
     */
    event DIDCreated(string indexed did, address indexed owner, string document);

    /**
     * @dev Emitted when a DID document is updated
     * @param did The DID identifier
     * @param owner The address that owns the DID
     * @param document The updated DID document
     */
    event DIDUpdated(string indexed did, address indexed owner, string document);

    /**
     * @dev Emitted when a DID is deactivated
     * @param did The DID identifier
     * @param owner The address that owned the DID
     */
    event DIDDeactivated(string indexed did, address indexed owner);

    /**
     * @dev Emitted when a DID ownership is transferred
     * @param did The DID identifier
     * @param previousOwner The previous owner
     * @param newOwner The new owner
     */
    event DIDOwnershipTransferred(string indexed did, address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Creates a new DID
     * @param did The DID identifier
     * @param document The DID document in JSON format
     */
    function createDID(string calldata did, string calldata document) external;

    /**
     * @dev Updates an existing DID document
     * @param did The DID identifier
     * @param document The updated DID document in JSON format
     */
    function updateDID(string calldata did, string calldata document) external;

    /**
     * @dev Deactivates a DID
     * @param did The DID identifier
     */
    function deactivateDID(string calldata did) external;

    /**
     * @dev Transfers ownership of a DID to a new address
     * @param did The DID identifier
     * @param newOwner The new owner address
     */
    function transferDIDOwnership(string calldata did, address newOwner) external;

    /**
     * @dev Retrieves the DID document
     * @param did The DID identifier
     * @return document The DID document
     * @return owner The owner of the DID
     * @return isActive Whether the DID is active
     * @return createdAt The timestamp when the DID was created
     * @return updatedAt The timestamp when the DID was last updated
     */
    function getDID(string calldata did) external view returns (
        string memory document,
        address owner,
        bool isActive,
        uint256 createdAt,
        uint256 updatedAt
    );

    /**
     * @dev Checks if a DID exists and is active
     * @param did The DID identifier
     * @return True if the DID exists and is active
     */
    function isDIDActive(string calldata did) external view returns (bool);

    /**
     * @dev Gets the owner of a DID
     * @param did The DID identifier
     * @return The owner address
     */
    function getDIDOwner(string calldata did) external view returns (address);
}
