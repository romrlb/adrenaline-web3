'use client';

import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { sepolia } from '@/utils/sepolia'

const SUPPORTED_NETWORKS = {
  hardhat,
  sepolia
};

// Determine the chain to use based on the environment
const getChain = () => {
  const networkName = process.env.NEXT_PUBLIC_NETWORK || 'hardhat';
  
  if (SUPPORTED_NETWORKS[networkName]) {
    console.log(`🌐 Using ${networkName} network`);
    return SUPPORTED_NETWORKS[networkName];
  }
  
  console.log('⚠️ Network not supported, using Hardhat by default');
  return hardhat;
};

// Get the configured RPC URL or use the default one
const getRpcUrl = () => {
  const chain = getChain();
  const networkName = process.env.NEXT_PUBLIC_NETWORK || 'hardhat';
  
  // Mapping of URLs in environment variables
  const ENV_RPC_URLS = {
    sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
    // Add other RPC URLs here if needed
  };
  
  // Use the configured URL if available
  if (ENV_RPC_URLS[networkName]) {
    return ENV_RPC_URLS[networkName];
  }
  
  // If no URL is configured, use the default URL of the chain if available
  if (chain.rpcUrls?.default?.http?.[0]) {
    return chain.rpcUrls.default.http[0];
  }
  
  // For Hardhat, always use the local URL
  if (networkName === 'hardhat') {
    return 'http://127.0.0.1:8545';
  }
  
  // Fallback
  return 'http://127.0.0.1:8545';
};

// Defined as let to be initialized only on the client side
let _publicClient;

// Function to create or retrieve the client
const getPublicClient = () => {
  if (typeof window === 'undefined') {
    console.log('⚠️ Server-side rendering detected, returning empty client placeholder');
    // On server side, return a minimal client that will be replaced on the client side
    return {
      getBlockNumber: async () => Promise.resolve(0),
      chain: getChain()
    };
  }
  
  if (!_publicClient) {
    const rpcUrl = getRpcUrl();
    const chain = getChain();
    console.log(`🔌 Creating public client with RPC URL: ${rpcUrl} for chain: ${chain.name}`);
    
    _publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });
  }
  
  return _publicClient;
};

// Verify the connection to the network
export const verifyConnection = async () => {
  try {
    if (typeof window === 'undefined') {
      console.log('⚠️ Skip connection verification on server');
      return false;
    }
    
    const client = getPublicClient();
    const blockNumber = await client.getBlockNumber();
    console.log(`✅ Connected to ${client.chain.name}, current block: ${blockNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to blockchain: ${error.message}`);
    return false;
  }
};

// Expose the client as a property (not as an object) to avoid issues with imports
export const publicClient = getPublicClient();

// Export the chain type as well
export const currentChain = getChain();

// Export the list of supported chains for reference
export const supportedNetworks = Object.keys(SUPPORTED_NETWORKS);
