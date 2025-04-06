# Adrenaline NFT Ticket Platform

A decentralized application for purchasing, managing, and using NFT-based tickets for extreme sports activities.

## Project Overview

This platform allows users to purchase digital tickets as NFTs (Non-Fungible Tokens) for various extreme sports activities like skydiving. Users can buy tickets through the platform, view their purchased tickets, and use them at partner activity centers.

### Key Features

- Purchase tickets for extreme sports activities using cryptocurrency
- Tickets are minted as NFTs on the Ethereum blockchain
- View and manage owned tickets through a modern dashboard
- Admin tools for creating tickets and managing the platform
- Ticket validation and usage tracking by activity centers
- Integration with Ethereum wallets for seamless transactions

## Project Structure

```
project/
├── backend/           # Smart contracts and blockchain integration
├── frontend/          # Next.js web application
├── supabase/          # Supabase Edge Functions for server-side operations
├── pinata/            # IPFS metadata and assets for NFTs
└── .github/           # GitHub workflows and CI/CD configuration
```

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS, wagmi, RainbowKit
- **Smart Contracts**: Solidity, Hardhat, ethers.js
- **Backend Services**: Supabase Edge Functions
- **Storage**: IPFS via Pinata
- **Blockchain**: Ethereum (Sepolia testnet / Mainnet)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Git
- Ethereum wallet (MetaMask recommended)
- Supabase CLI (for Edge Functions)
- Yarn or NPM

### Installation

1. Clone the repository:
```bash
git clone https://github.com/romrlb/adrenaline-web3.git
cd adrenaline-web3
```

2. Install dependencies for each component:

```bash
# Install frontend dependencies
cd project/frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Install Supabase dependencies
cd ../supabase
npm install
```

3. Configure environment variables:

```bash
# Frontend configuration
cp project/frontend/.env.local.example project/frontend/.env.local

# Supabase configuration
cp project/supabase/.env.local.example project/supabase/.env.local
```

4. Set up the required variables in each `.env.local` file (see respective README files in each directory for details).

### Development Environment Setup

#### Smart Contracts (Backend)

```bash
cd project/backend

# Start a local Hardhat node
npx hardhat node

# Deploy contracts to local network
npx hardhat run --network localhost scripts/deploy.js
```

#### Frontend Application

```bash
cd project/frontend

# Start development server
npm run dev
```

#### Supabase Edge Functions

```bash
cd project/supabase

# Start local Supabase services
npx supabase start

# Serve Edge Functions locally
npx supabase functions serve --no-verify-jwt
```

Visit `http://localhost:3000` to access the application.

## Component Documentation

Each component has its own detailed documentation:

- [Frontend Documentation](./frontend/README.md)
- [Backend/Smart Contract Documentation](./backend/README.md)
- [Supabase Edge Functions Documentation](./supabase/README.md)
- [IPFS/Pinata Configuration](./pinata/README.md)

## Testing

```bash
# Frontend tests
cd project/frontend
npm test

# Smart contract tests
cd project/backend
npx hardhat test
```

## Deployment

### Smart Contracts

```bash
cd project/backend
npx hardhat run --network sepolia scripts/deploy.js
```

### Frontend

```bash
cd project/frontend
npm run build
```

### Supabase Edge Functions

```bash
cd project/supabase
npx supabase functions deploy createticket
npx supabase functions deploy health
```

## License

MIT

## Contributors

- Development Team @ Adrenaline NFT
