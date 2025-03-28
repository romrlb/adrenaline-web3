require('@nomicfoundation/hardhat-toolbox')
require('dotenv/config')
require('@nomicfoundation/hardhat-verify')
require('solidity-coverage')

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ''
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.29'
      }
    ]
  },
  defaultNetwork: 'hardhat',
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 11155111
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      loggingEnabled: true // Active les logs
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  }
}