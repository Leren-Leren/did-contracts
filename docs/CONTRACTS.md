## DID Storage Contracts Documentation

This document describes the smart contracts, public interfaces, events, access control, and lifecycle workflows for the DID storage system on SKALE.

### Overview

- Contracts:
  - `DIDFactory`: Deploys and manages pairs of `DIDRegistry` and `VCRegistry`
  - `DIDRegistry`: Manages DID documents and ownership
  - `VCRegistry`: Manages Verifiable Credentials (VCs) linked to DIDs
- Interfaces:
  - `IDIDRegistry`
  - `IVCRegistry`

All contracts are EVM-compatible and designed for SKALE network. They leverage OpenZeppelin’s `Ownable`, `Pausable`, and `ReentrancyGuard` where relevant.

---

### DIDRegistry (`contracts/DIDRegistry.sol`)

Manages DID documents and ownership.

#### Storage
- `mapping(string => DIDDocument) _didDocuments`
- `mapping(address => string[]) _ownerDIDs`
- `mapping(string => bool) _didExists`

`DIDDocument`:
- `string document`
- `address owner`
- `bool isActive`
- `uint256 createdAt`
- `uint256 updatedAt`

#### Events
- `event DIDCreated(string indexed did, address indexed owner, string document)`
- `event DIDUpdated(string indexed did, address indexed owner, string document)`
- `event DIDDeactivated(string indexed did, address indexed owner)`
- `event DIDOwnershipTransferred(string indexed did, address indexed previousOwner, address indexed newOwner)`

#### External Functions
- `createDID(string did, string document)`
  - Requirements: `did` and `document` non-empty, DID must not exist
  - Effects: Creates active DID owned by `msg.sender`
  - Emits: `DIDCreated`

- `updateDID(string did, string document)`
  - Requirements: DID exists, active, `msg.sender` is owner, `document` non-empty
  - Effects: Updates document and `updatedAt`
  - Emits: `DIDUpdated`

- `deactivateDID(string did)`
  - Requirements: DID exists, is active, `msg.sender` is owner
  - Effects: Sets `isActive = false`, updates `updatedAt`
  - Emits: `DIDDeactivated`

- `transferDIDOwnership(string did, address newOwner)`
  - Requirements: DID exists, active, `msg.sender` is owner, `newOwner != 0`, `newOwner != msg.sender`
  - Effects: Transfers ownership and updates owner DID lists
  - Emits: `DIDOwnershipTransferred`

- `getDID(string did) returns (string document, address owner, bool isActive, uint256 createdAt, uint256 updatedAt)`
  - Requirements: DID exists

- `isDIDActive(string did) returns (bool)`

- `getDIDOwner(string did) returns (address)`
  - Requirements: DID exists

- `getDIDsByOwner(address owner) returns (string[] dids)`

- `pause()` / `unpause()` (onlyOwner)

#### Access Control
- Create/Update/Deactivate/Transfer restricted to the DID owner
- Pause/Unpause restricted to contract owner

---

### VCRegistry (`contracts/VCRegistry.sol`)

Manages Verifiable Credentials linked to DIDs. References `IDIDRegistry` to ensure holder DID is active during issuance.

#### Storage
- `IDIDRegistry public didRegistry`
- `mapping(string => VerifiableCredential) _verifiableCredentials`
- `mapping(address => string[]) _issuerVCs`
- `mapping(string => string[]) _holderVCs`
- `mapping(string => bool) _vcExists`

`VerifiableCredential`:
- `string credential`
- `address issuer`
- `string holder` (DID)
- `bool isRevoked`
- `uint256 issuedAt`
- `uint256 updatedAt`

#### Events
- `event VCIssued(string indexed vcId, address indexed issuer, string indexed holder, string credential)`
- `event VCRevoked(string indexed vcId, address indexed issuer)`
- `event VCUpdated(string indexed vcId, address indexed issuer, string credential)`

#### External Functions
- `constructor(address _didRegistry)`
  - Requirements: `_didRegistry != address(0)`

- `issueVC(string vcId, string holder, string credential)`
  - Requirements: Non-empty `vcId/holder/credential`, VC does not exist, `didRegistry.isDIDActive(holder)`
  - Effects: Creates VC owned by `msg.sender`, indexes by issuer and holder
  - Emits: `VCIssued`

- `revokeVC(string vcId)`
  - Requirements: VC exists, `msg.sender` is issuer, not already revoked
  - Effects: Sets `isRevoked = true`, updates `updatedAt`
  - Emits: `VCRevoked`

- `updateVC(string vcId, string credential)`
  - Requirements: VC exists, `msg.sender` is issuer, not revoked, non-empty `credential`
  - Effects: Updates credential and `updatedAt`
  - Emits: `VCUpdated`

- `getVC(string vcId) returns (string credential, address issuer, string holder, bool isRevoked, uint256 issuedAt, uint256 updatedAt)`
  - Requirements: VC exists

- `isVCValid(string vcId) returns (bool)`

- `getVCsByIssuer(address issuer) returns (string[] vcIds)`

- `getVCsByHolder(string holder) returns (string[] vcIds)`

- `updateDidRegistry(address newDidRegistry)` (onlyOwner)
  - Requirements: `newDidRegistry != address(0)`

- `pause()` / `unpause()` (onlyOwner)

#### Access Control
- Issue/Update/Revoke restricted to the VC issuer (`msg.sender`)
- Pause/Unpause and DID registry updates restricted to contract owner

---

### DIDFactory (`contracts/DIDFactory.sol`)

Deploys and manages registry pairs.

#### Storage
- `mapping(string => RegistryInfo) registries`
- `string[] registryIds`

`RegistryInfo`:
- `address didRegistry`
- `address vcRegistry`
- `bool isActive`
- `uint256 createdAt`

#### Events
- `event RegistryCreated(string indexed registryId, address indexed didRegistry, address indexed vcRegistry)`
- `event RegistryDeactivated(string indexed registryId)`
- `event RegistryReactivated(string indexed registryId)`

#### External Functions
- `createRegistry(string registryId) returns (address didRegistry, address vcRegistry)` (onlyOwner, whenNotPaused)
  - Requirements: Non-empty `registryId`, not already active
  - Effects: Deploys new `DIDRegistry` and `VCRegistry` linked together; stores metadata
  - Emits: `RegistryCreated`

- `deactivateRegistry(string registryId)` (onlyOwner)
  - Requirements: Registry active
  - Effects: Marks registry inactive
  - Emits: `RegistryDeactivated`

- `reactivateRegistry(string registryId)` (onlyOwner)
  - Requirements: Registry exists and inactive
  - Effects: Marks registry active
  - Emits: `RegistryReactivated`

- `getRegistry(string registryId) returns (address didRegistry, address vcRegistry, bool isActive, uint256 createdAt)`

- `getAllRegistryIds() returns (string[] registryIds)`

- `getRegistryCount() returns (uint256)`

- `isRegistryActive(string registryId) returns (bool)`

- `pause()` / `unpause()` (onlyOwner)

---

### Lifecycle Workflows

#### 1) DID Lifecycle
1. Create DID
   - Caller: end-user/wallet
   - Call: `DIDRegistry.createDID(did, didDocumentJson)`
   - Emit: `DIDCreated`
2. Update DID (optional, repeatable)
   - Caller: DID owner
   - Call: `DIDRegistry.updateDID(did, updatedDocumentJson)`
   - Emit: `DIDUpdated`
3. Transfer DID (optional)
   - Caller: DID owner
   - Call: `DIDRegistry.transferDIDOwnership(did, newOwner)`
   - Emit: `DIDOwnershipTransferred`
4. Deactivate DID (finalize)
   - Caller: DID owner
   - Call: `DIDRegistry.deactivateDID(did)`
   - Emit: `DIDDeactivated`

#### 2) VC Lifecycle
1. Issue VC
   - Preconditions: Holder DID exists and is active
   - Caller: Issuer
   - Call: `VCRegistry.issueVC(vcId, holderDid, credentialJson)`
   - Emit: `VCIssued`
2. Update VC (optional)
   - Caller: Issuer
   - Call: `VCRegistry.updateVC(vcId, updatedCredentialJson)`
   - Emit: `VCUpdated`
3. Revoke VC (finalize)
   - Caller: Issuer
   - Call: `VCRegistry.revokeVC(vcId)`
   - Emit: `VCRevoked`

#### 3) Registry Pair Lifecycle (Admin)
1. Create registry pair
   - Caller: Factory owner
   - Call: `DIDFactory.createRegistry(registryId)`
   - Emit: `RegistryCreated`
2. Deactivate/Reactivate registry pair
   - Caller: Factory owner
   - Calls: `deactivateRegistry(registryId)` / `reactivateRegistry(registryId)`
   - Emits: `RegistryDeactivated` / `RegistryReactivated`

---

### Query Patterns
- DID:
  - `getDID(did)` -> full record
  - `isDIDActive(did)` -> quick active check
  - `getDIDOwner(did)` -> owner
  - `getDIDsByOwner(owner)` -> list of DIDs
- VC:
  - `getVC(vcId)` -> full record
  - `isVCValid(vcId)` -> validity (not revoked)
  - `getVCsByIssuer(issuer)` -> list of VC IDs
  - `getVCsByHolder(holderDid)` -> list of VC IDs

---

### Errors and Reverts (Common)
- Empty identifiers or documents
- DID/VC existence checks
- Ownership/issuer authorization checks
- Active/inactive state checks
- Zero address checks (for new owner, registry address)

---

### Security Notes
- State-changing methods are `nonReentrant` where applicable
- Owner-only administrative controls for pausing and configuration
- Events emitted for all state transitions for off-chain indexing

---

### Integration Tips
- Store large documents off-chain and keep on-chain documents concise; consider hashing for integrity
- Subscribe to events to maintain an off-chain index
- Validate DID activity before issuing VCs
- Use `getDIDsByOwner` / `getVCsByHolder` for UX listings



