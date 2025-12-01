# ZKStarvion 🛡️⚡

> **Bridging Privacy to Programmability.**
> The first privacy-preserving messaging layer connecting **Zcash (Shielded)** to **Starknet (L2).**

![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-Hackathon_MVP-success)
![Stack](https://img.shields.io/badge/stack-Zcash_Core_%7C_Starknet_%7C_Docker_%7C_React-orange)

## 🚨 The Problem

The Blockchain Trilemma has created a divide:

1.  **Layer 2s (Starknet)** offer massive scalability and programmability, but **zero privacy**. Funding a fresh wallet publicly links it to your identity forever.
2.  **Privacy Chains (Zcash)** offer mathematical anonymity, but **lack smart contract capabilities** (DeFi, Gaming, DAOs).

## 💡 The Solution

**ZKStarvion** acts as a cryptographically secure bridge between these two worlds.

It allows a user to trigger execution on Starknet by sending a **Shielded Zcash Transaction**.

- **Input:** Anonymous ZEC (via Encrypted Memo).
- **Output:** Clean, untraceable execution on Starknet.

---

## 🏗️ Architecture

<details>
  <summary><strong>Click to view Technical Architecture Diagram</strong></summary>

<img width="2816" height="1536" alt="architecture" src="https://github.com/user-attachments/assets/74976017-3283-4f0d-b58d-42fde522a3bb" />
</details>

The system consists of three core components:

1.  **The Listener (Zcash Core Node):**

    - Runs inside a **Docker Container** (Regtest/Mainnet).
    - Decrypts incoming transactions using the **Viewing Key**.
    - Extracts the "Memo" field (e.g., "Mint 100 Tokens").

2.  **The Relayer (Node.js/Express):**

    - Listens to the Zcash Node.
    - **Hashes** the Zcash TxID + Payload using **Pedersen Hash**.
    - **Signs** the hash using the Relayer's Private Key (ECDSA).
    - Submits the transaction to the Starknet Sequencer.

3.  **The Verifier (Cairo Smart Contract):**
    - Deployed on **Starknet Sepolia**.
    - Verifies the Relayer's signature on-chain.
    - Executes the payload (e.g., Mints tokens, funds gas).

---

## 🚀 One-Click Quick Start

We have automated the entire infrastructure setup (Blockchain, Wallets, Mining) into a single script.

### Prerequisites

- Node.js (v18+)
- Docker Desktop (Must be running)
- Scarb (for compiling cairo contracts)

### 1. Setup Environment

#### file structure

```
.
├── README.md
├── scripts
├── start_offline.sh
├── verifier_contract
├── zcash_relayer
└── zcash-starknet-ui
```

## 2. Magic Start

Run this command in the root directory to spin up the local Zcash blockchain, fund wallets, start the relayer and start the local UI:

```Bash
chmod +x ./start_offline.sh
```

```
./start_offline.sh
```

🐳 Starts Zcash Docker Node

⛏️ Mines 101 Blocks (to generate ZEC)

🛡️ Creates Shielded Wallets

🔥 Starts the Express API

Access the UI: http://localhost:5173

## 🧪 How to Test (The Demo Flow)

### 1. Open the Dashboard:

You will see the "Zcash Shielded" panel on the left and "Starknet Sepolia" on the right.

### 2. Bridge Assets:

- Enter an amount (e.g., 100).

- Click "Initiate Bridge".

### 3. Watch the Magic:

- The UI sends a request to the local Zcash Node.

- The Node generates a Zero-Knowledge Proof (takes ~2s).

- The Relayer detects the transaction, signs it, and forwards it to Starknet.

### 4. Verify:

- Click the "View on Starkscan" link in the history log.

- Check the Calldata/Events tab on Starkscan. You will see your value (0x64 for 100) permanently recorded on L2.

## 🛠️ Technical Details

### Cryptography

Since Zcash uses Jubjub curves and Starknet uses STARK curves, direct cryptographic verification is computationally expensive.

#### Current Approach:

Proof of Authority (PoA) via a trusted Relayer signature (ECDSA on StarkCurve).

#### Future Roadmap:

Implement a Zcash Light Client Verifier directly in Cairo to allow trustless header verification.

## Docker Configuration

We use the official electriccoinco/zcashd image with custom regtest flags to simulate the full Zcash mainnet environment locally without the 50GB sync overhead.

## 🔮 Future Roadmap

- [ ] Rust Rewrite: Port the Node.js relayer to Rust for native integration with librustzcash.

- [ ] Mainnet Deployment: Switch from Zcash Regtest to Zcash Mainnet using Light Client (Zingo) architecture.

- [ ] Cross-Chain AA: Implement a Starknet Paymaster that accepts ZEC as gas payment.

## 🏆 Hackathon Submission

This project was built for the Starknet <-> ZCash Hackathon track.

Team: [Felix Awere, Peter Kagwe, Ted Adams]
