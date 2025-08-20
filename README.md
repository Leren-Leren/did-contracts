# Decast.live - DID Storage Contracts on SKALE Network

A decentralized identity (DID) solution built on SKALE network for storing DID documents and Verifiable Credentials (VCs) on-chain. This project provides a complete infrastructure for managing decentralized identities and their associated credentials in a gas-efficient and scalable manner.

## 🌟 Features

- **DID Document Management**: Create, update, and deactivate DID documents
- **Verifiable Credentials**: Issue, revoke, and update VCs with full lifecycle management
- **Ownership Control**: Transfer DID ownership between addresses
- **SKALE Integration**: Optimized for SKALE network's high throughput and low gas costs
- **Event-Driven Architecture**: Comprehensive event logging for all operations
- **Gas Optimized**: Efficient smart contracts designed for cost-effective operations

## 🏗️ Architecture

### Smart Contracts

1. **DIDRegistry** (`contracts/DIDRegistry.sol`)
   - Manages DID document lifecycle
   - Handles DID creation, updates, and deactivation
   - Controls DID ownership transfers
   - Stores DID documents on-chain

2. **VCRegistry** (`contracts/VCRegistry.sol`)
   - Manages Verifiable Credentials lifecycle
   - Handles VC issuance, revocation, and updates
   - Links VCs to DID holders
   - Provides credential validation

3. **DIDFactory** (`contracts/DIDFactory.sol`)
   - Factory pattern for creating new DID instances
   - Simplifies DID creation process
   - Provides batch operations

### Key Interfaces

- **IDIDRegistry** (`contracts/IDIDRegistry.sol`): Interface for DID operations
- **IVCRegistry** (`contracts/IVCRegistry.sol`): Interface for VC operations

## 🚀 Quick Start

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher) or yarn
- Hardhat
- SKALE network access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd did-storage-contracts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   PRIVATE_KEY=your_private_key_here
   SKALE_RPC_URL=https://mainnet.skalenodes.com/v1/your-chain-id
   SKALE_CHAIN_ID=your_chain_id
   SKALE_TESTNET_RPC_URL=https://testnet.skalenodes.com/v1/your-testnet-chain-id
   SKALE_TESTNET_CHAIN_ID=your_testnet_chain_id
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
```

### Local Development

```bash
# Start local Hardhat node
npm run node

# Deploy to local network
npm run deploy:local
```

## 🌐 Deployment

### SKALE Network Deployment

1. **Configure SKALE Network**
   
   Update your `hardhat.config.js` with your SKALE chain details:
   ```javascript
   skale: {
     url: process.env.SKALE_RPC_URL,
     accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
     chainId: parseInt(process.env.SKALE_CHAIN_ID),
     gasPrice: "auto",
   }
   ```

2. **Deploy Contracts**
   ```bash
   npm run deploy:skale
   ```

3. **Verify Contracts** (Optional)
   ```bash
   npm run verify -- --network skale <contract-address>
   ```

### Available SKALE Chains

- **SKALE Europa Hub**: Chain ID 2046399126
- **SKALE Calypso Hub**: Chain ID 344106930
- **SKALE Nebula Hub**: Chain ID 1482601649
- **SKALE Titan Hub**: Chain ID 1350216234

## 📖 Usage Examples

### DID Operations

```javascript
// Create a DID
const did = "did:skale:123456789abcdef";
const didDocument = JSON.stringify({
  "@context": "https://www.w3.org/ns/did/v1",
  "id": did,
  "verificationMethod": [{
    "id": `${did}#keys-1`,
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": did,
    "publicKeyHex": "02..."
  }]
});

await didRegistry.createDID(did, didDocument);

// Update DID document
const updatedDocument = JSON.stringify({
  "@context": "https://www.w3.org/ns/did/v1",
  "id": did,
  "verificationMethod": [{
    "id": `${did}#keys-1`,
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": did,
    "publicKeyHex": "03..."
  }],
  "service": [{
    "id": `${did}#linked-domain`,
    "type": "LinkedDomains",
    "serviceEndpoint": "https://example.com"
  }]
});

await didRegistry.updateDID(did, updatedDocument);

// Transfer DID ownership
await didRegistry.transferDIDOwnership(did, newOwnerAddress);

// Deactivate DID
await didRegistry.deactivateDID(did);
```

### Verifiable Credentials Operations

```javascript
// Issue a VC
const vcId = "vc:skale:credential:123";
const holderDid = "did:skale:123456789abcdef";
const credential = JSON.stringify({
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "id": vcId,
  "type": ["VerifiableCredential", "UniversityDegreeCredential"],
  "issuer": "did:skale:issuer:456",
  "issuanceDate": "2023-01-01T00:00:00Z",
  "credentialSubject": {
    "id": holderDid,
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science in Computer Science"
    }
  }
});

await vcRegistry.issueVC(vcId, holderDid, credential);

// Revoke a VC
await vcRegistry.revokeVC(vcId);

// Update a VC
const updatedCredential = JSON.stringify({
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "id": vcId,
  "type": ["VerifiableCredential", "UniversityDegreeCredential"],
  "issuer": "did:skale:issuer:456",
  "issuanceDate": "2023-01-01T00:00:00Z",
  "credentialSubject": {
    "id": holderDid,
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science in Computer Science",
      "university": "SKALE University"
    }
  }
});

await vcRegistry.updateVC(vcId, updatedCredential);
```

### Query Operations

```javascript
// Get DID information
const didInfo = await didRegistry.getDID(did);
console.log("DID Document:", didInfo.document);
console.log("Owner:", didInfo.owner);
console.log("Active:", didInfo.isActive);

// Check if DID is active
const isActive = await didRegistry.isDIDActive(did);

// Get VC information
const vcInfo = await vcRegistry.getVC(vcId);
console.log("VC Document:", vcInfo.credential);
console.log("Issuer:", vcInfo.issuer);
console.log("Valid:", !vcInfo.isRevoked);

// Get VCs by issuer
const issuerVCs = await vcRegistry.getVCsByIssuer(issuerAddress);

// Get VCs by holder
const holderVCs = await vcRegistry.getVCsByHolder(holderDid);
```

### Verification Example (UniversityDegreeCredential)

```javascript
// Verify a UniversityDegreeCredential VC
const vcId = "vc:skale:credential:123";
const expectedIssuer = "0xYourIssuerAddress"; // replace with expected issuer address
const expectedHolderDid = "did:skale:123456789abcdef"; // replace with expected holder DID

// Fetch VC from chain
const vcInfo = await vcRegistry.getVC(vcId);

// Parse VC JSON
const data = JSON.parse(vcInfo.credential);

// Semantic checks
const isUniversityDegree = Array.isArray(data.type) && data.type.includes("UniversityDegreeCredential");
const holderMatches = data.credentialSubject?.id === expectedHolderDid;
const issuerMatches = vcInfo.issuer.toLowerCase() === expectedIssuer.toLowerCase();

// On-chain revocation check
const notRevoked = await vcRegistry.isVCValid(vcId);

console.log("Issuer OK:", issuerMatches);
console.log("Holder DID OK:", holderMatches);
console.log("Type OK (UniversityDegreeCredential):", isUniversityDegree);
console.log("On-chain revocation OK:", notRevoked);
```

## 🔧 Development

### Project Structure

```
did-storage-contracts/
├── contracts/           # Smart contracts
│   ├── DIDFactory.sol
│   ├── DIDRegistry.sol
│   ├── IDIDRegistry.sol
│   ├── IVCRegistry.sol
│   └── VCRegistry.sol
├── scripts/            # Deployment scripts
│   └── deploy.js
├── test/              # Test files
│   ├── DIDFactory.test.js
│   ├── DIDRegistry.test.js
│   └── VCRegistry.test.js
├── hardhat.config.js  # Hardhat configuration
└── package.json       # Dependencies
```

### Available Scripts

- `npm run compile` - Compile smart contracts
- `npm run test` - Run test suite
- `npm run deploy:skale` - Deploy to SKALE network
- `npm run deploy:local` - Deploy to local network
- `npm run node` - Start local Hardhat node
- `npm run clean` - Clean build artifacts
- `npm run coverage` - Generate test coverage report

### Testing

The project includes comprehensive tests for all smart contract functionality:

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/DIDRegistry.test.js

# Run with coverage
npm run coverage
```

## 📚 Contracts Documentation

Detailed contract APIs, events, storage layout, access control, and lifecycle workflows are documented here:

- See `docs/CONTRACTS.md` for full reference.

## 🛠️ CI Workflow

A GitHub Actions workflow is included to compile, test, and run coverage on each push/PR to `main`/`master` with Node 18.

- Workflow file: `.github/workflows/ci.yml`
- Jobs: install (npm ci), compile, test, coverage

## 🔒 Security

### Best Practices

- **Access Control**: All critical functions include proper access control
- **Input Validation**: Comprehensive input validation for all parameters
- **Event Logging**: All state changes are logged as events
- **Gas Optimization**: Contracts optimized for SKALE network efficiency
- **Upgradeable**: Contracts designed with upgradeability in mind

### Audit Considerations

- Use OpenZeppelin contracts for security
- Comprehensive test coverage
- Gas optimization for SKALE network
- Event-driven architecture for transparency

## 🌍 SKALE Network Benefits

- **High Throughput**: 2,000+ TPS per chain
- **Low Gas Costs**: Fraction of Ethereum gas costs
- **Ethereum Compatibility**: Full EVM compatibility
- **Instant Finality**: Sub-second finality
- **Scalability**: Horizontal scaling across multiple chains

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation**: [Project Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)

## 🔗 Related Links

- [SKALE Network Documentation](https://docs.skale.network/)
- [DID Specification](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [Hardhat Documentation](https://hardhat.org/docs)

---

**Built with ❤️ for the decentralized identity ecosystem on SKALE network**
