# NFT Ticket Creation Service using Supabase Edge Functions

This project contains Supabase Edge Functions used to interact with the Adrenaline NFT ticket smart contract.

## Features

- **NFT Ticket Creation**: API for creating NFT tickets on the Ethereum blockchain
- **Service Health Check**: Diagnostic endpoint to verify configuration

## Project Structure

```
project/supabase/
├── .env.local.example    # Example configuration file
├── .env.local            # Local configuration (not versioned)
├── import_map.json       # Deno import configuration
├── functions/            # Edge Functions
│   ├── createticket/     # NFT ticket creation
│   │   └── index.ts      # Entry point
│   └── health/           # Service health check
│       └── index.ts      # Entry point
└── README.md             # This file
```

## Configuration

1. Copy the example configuration file:

```bash
cp .env.local.example .env.local
```

2. Modify the `.env.local` file with your own values:

```
# Supabase URLs and keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Blockchain configuration
CONTRACT_ADDRESS=0xyour_contract_address
ADMIN_PRIVATE_KEY=0xyour_private_key
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key

# Optional configuration
SIMULATION_MODE=false  # Set to true to simulate without blockchain interaction
```

> **IMPORTANT**: Never share your private key! It should only be accessible by the Supabase service.

## Deployment

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- A Supabase project created
- An admin account for the Adrenaline smart contract

### Deployment Steps

1. Connect to Supabase and associate your project:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
```

2. Configure secrets:

```bash
npx supabase secrets set --env-file .env.local
```

3. Deploy functions:

```bash
npx supabase functions deploy createticket
npx supabase functions deploy health
```

4. Verify the deployment:

```bash
curl https://your-project.supabase.co/functions/v1/health
```