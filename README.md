# 🧬 FHEGenerativeArt dApp

A **Fully Homomorphic Encryption (FHE)**–powered decentralized application that allows each user to **create one unique encrypted generative art entry**.  
All art data is stored and handled **privately on-chain**, ensuring confidentiality even from smart contract logic.

---

## 📜 Smart Contract: `FHEGenerativeArt.sol`

### Overview

`FHEGenerativeArt` is a Solidity contract demonstrating **privacy-preserving art creation** using **Zama’s FHEVM (Fully Homomorphic Encryption Virtual Machine)**.  
Each user can submit a single encrypted “art choice,” which represents some generative art configuration, without revealing it publicly on-chain.

- Built on: `@fhevm/solidity`
- Network config: `SepoliaConfig` (can be switched for other networks)

---

### 🔐 Features

| Feature | Description |
|----------|--------------|
| **Private Art Storage** | Each user’s art data is encrypted using FHE and never revealed on-chain. |
| **Single Entry per User** | Each wallet can create only one art entry to ensure uniqueness. |
| **Decryption Control** | Only the creator and the contract have permission to decrypt their data. |

---

### 🧠 Contract Functions

#### `createArt(externalEuint32 choiceEncrypted, bytes proof)`
Creates a new encrypted art record for the sender.

- **Parameters:**
  - `choiceEncrypted`: FHE-encrypted `uint32` value representing the art choice.
  - `proof`: Zero-knowledge proof verifying the encrypted input.
- **Rules:**
  - Each address can only create once.
  - Grants decryption permission to both the user and the contract.

---

#### `hasCreated(address user) → bool`
Checks if a user has already created an art entry.

- **Returns:** `true` if the address has already created one.

---

#### `getMyArt(address user) → euint32`
Retrieves the encrypted art data of a user.

- **Note:** The returned value is **encrypted** (`euint32`).
- Only the user or the contract can decrypt it using their FHE permissions.

---

### 🧩 Example Workflow

1. The frontend encrypts a user’s chosen art parameter (e.g., color palette ID or pattern seed) using FHE.
2. It sends the encrypted value and proof to `createArt()`.
3. The contract stores it securely and allows decryption permissions.
4. The frontend (or authorized viewer) can later decrypt it locally for display.

---

## 💻 Frontend: FHEVM React Template

This dApp uses a **minimal React template** preconfigured for FHEVM integration.

### 🔧 Includes

- **FHEVM React Hooks:**  
  Simplified interaction with encrypted contract data (`useFHEDecrypt`, etc.)
- **Ethers.js + FHEVM Plugin:**  
  To handle encrypted calls, proofs, and local decryption.
- **Example Integration:**  
  Demonstrates how to call `createArt`, `hasCreated`, and decrypt `getMyArt`.

---
## 📋 Prerequinextjss

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd fhevm-react-template

# Initialize submodules (includes fhevm-hardhat-template)
git submodule update --init --recursive

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/nextjs/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/nextjs/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/nextjs/scaffold.config.ts`.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:
1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:
1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## 📁 Project Structure

This template uses a monorepo structure with three main packages:

```
FHEVM-Art-Creator/
├── packages/
│   ├── fhevm-hardhat-template/    # Smart contracts & deployment
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── nextjs/                      # React frontend application
└── scripts/                       # Build and deployment scripts
```

### Key Components

#### 🔗 FHEVM Integration (`packages/nextjs/hooks`)
- **`useFHEGenerativeArt.tsx`**: Example hook demonstrating FHEVM contract interaction
- Essential hooks for FHEVM-enabled smart contract communication
- Easily copyable to any FHEVM + React project

#### 🎣 Wallet Management (`packages/nextjs/hooks/helper/`)
- MetaMask wallet provider hooks
- Compatible with EIP-6963 standard
- Easily adaptable for other wallet providers

#### 🔧 Flexibility
- Replace `ethers.js` with `Wagmi` or other React-friendly libraries
- Modular architecture for easy customization
- Support for multiple wallet providers

## 📚 Additional Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Development Tools
- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [React Documentation](https://reactjs.org/) - React framework guide

### Community & Support
- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues) - Bug reports & feature requests

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.
