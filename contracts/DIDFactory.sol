// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./DIDRegistry.sol";
import "./VCRegistry.sol";

/**
 * @title DIDFactory
 * @dev Factory contract for managing DID and VC registries on SKALE network
 */
contract DIDFactory is Ownable, Pausable {
    
    struct RegistryInfo {
        address didRegistry;
        address vcRegistry;
        bool isActive;
        uint256 createdAt;
    }

    // Mapping from registry ID to registry info
    mapping(string => RegistryInfo) public registries;
    
    // Array of all registry IDs
    string[] public registryIds;
    
    // Events
    event RegistryCreated(string indexed registryId, address indexed didRegistry, address indexed vcRegistry);
    event RegistryDeactivated(string indexed registryId);
    event RegistryReactivated(string indexed registryId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new DID and VC registry pair
     * @param registryId Unique identifier for the registry pair
     * @return didRegistry Address of the deployed DID registry
     * @return vcRegistry Address of the deployed VC registry
     */
    function createRegistry(string calldata registryId) 
        external 
        onlyOwner 
        whenNotPaused 
        returns (address didRegistry, address vcRegistry) 
    {
        require(bytes(registryId).length > 0, "Registry ID cannot be empty");
        require(!registries[registryId].isActive, "Registry already exists");

        // Deploy DID Registry
        DIDRegistry did = new DIDRegistry();
        
        // Deploy VC Registry with reference to DID Registry
        VCRegistry vc = new VCRegistry(address(did));

        // Store registry info
        registries[registryId] = RegistryInfo({
            didRegistry: address(did),
            vcRegistry: address(vc),
            isActive: true,
            createdAt: block.timestamp
        });

        registryIds.push(registryId);

        emit RegistryCreated(registryId, address(did), address(vc));
        
        return (address(did), address(vc));
    }

    /**
     * @dev Deactivates a registry pair
     * @param registryId The registry ID to deactivate
     */
    function deactivateRegistry(string calldata registryId) external onlyOwner {
        require(registries[registryId].isActive, "Registry is not active");
        
        registries[registryId].isActive = false;
        
        emit RegistryDeactivated(registryId);
    }

    /**
     * @dev Reactivates a registry pair
     * @param registryId The registry ID to reactivate
     */
    function reactivateRegistry(string calldata registryId) external onlyOwner {
        require(registries[registryId].didRegistry != address(0), "Registry does not exist");
        require(!registries[registryId].isActive, "Registry is already active");
        
        registries[registryId].isActive = true;
        
        emit RegistryReactivated(registryId);
    }

    /**
     * @dev Gets registry information
     * @param registryId The registry ID
     * @return didRegistry Address of the DID registry
     * @return vcRegistry Address of the VC registry
     * @return isActive Whether the registry is active
     * @return createdAt When the registry was created
     */
    function getRegistry(string calldata registryId) 
        external 
        view 
        returns (
            address didRegistry,
            address vcRegistry,
            bool isActive,
            uint256 createdAt
        ) 
    {
        RegistryInfo memory info = registries[registryId];
        return (info.didRegistry, info.vcRegistry, info.isActive, info.createdAt);
    }

    /**
     * @dev Gets all registry IDs
     * @return Array of all registry IDs
     */
    function getAllRegistryIds() external view returns (string[] memory) {
        return registryIds;
    }

    /**
     * @dev Gets the count of registries
     * @return Number of registries
     */
    function getRegistryCount() external view returns (uint256) {
        return registryIds.length;
    }

    /**
     * @dev Checks if a registry exists and is active
     * @param registryId The registry ID
     * @return True if the registry exists and is active
     */
    function isRegistryActive(string calldata registryId) external view returns (bool) {
        return registries[registryId].isActive;
    }

    /**
     * @dev Pauses the factory (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the factory (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
