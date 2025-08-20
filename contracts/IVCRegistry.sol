// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVCRegistry
 * @dev Interface for Verifiable Credentials Registry operations
 */
interface IVCRegistry {
    /**
     * @dev Emitted when a VC is issued
     * @param vcId The unique identifier of the VC
     * @param issuer The address that issued the VC
     * @param holder The DID of the holder
     * @param credential The VC document
     */
    event VCIssued(string indexed vcId, address indexed issuer, string indexed holder, string credential);

    /**
     * @dev Emitted when a VC is revoked
     * @param vcId The unique identifier of the VC
     * @param issuer The address that revoked the VC
     */
    event VCRevoked(string indexed vcId, address indexed issuer);

    /**
     * @dev Emitted when a VC is updated
     * @param vcId The unique identifier of the VC
     * @param issuer The address that updated the VC
     * @param credential The updated VC document
     */
    event VCUpdated(string indexed vcId, address indexed issuer, string credential);

    /**
     * @dev Issues a new Verifiable Credential
     * @param vcId The unique identifier of the VC
     * @param holder The DID of the holder
     * @param credential The VC document in JSON format
     */
    function issueVC(string calldata vcId, string calldata holder, string calldata credential) external;

    /**
     * @dev Revokes a Verifiable Credential
     * @param vcId The unique identifier of the VC
     */
    function revokeVC(string calldata vcId) external;

    /**
     * @dev Updates an existing Verifiable Credential
     * @param vcId The unique identifier of the VC
     * @param credential The updated VC document in JSON format
     */
    function updateVC(string calldata vcId, string calldata credential) external;

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
    function getVC(string calldata vcId) external view returns (
        string memory credential,
        address issuer,
        string memory holder,
        bool isRevoked,
        uint256 issuedAt,
        uint256 updatedAt
    );

    /**
     * @dev Checks if a VC is valid (not revoked)
     * @param vcId The unique identifier of the VC
     * @return True if the VC is valid
     */
    function isVCValid(string calldata vcId) external view returns (bool);

    /**
     * @dev Gets all VCs issued by an address
     * @param issuer The issuer address
     * @return Array of VC IDs issued by the address
     */
    function getVCsByIssuer(address issuer) external view returns (string[] memory);

    /**
     * @dev Gets all VCs held by a DID
     * @param holder The holder DID
     * @return Array of VC IDs held by the DID
     */
    function getVCsByHolder(string calldata holder) external view returns (string[] memory);
}
