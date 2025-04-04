import { ADRENALINE_CONTRACT_ADDRESS, ADRENALINE_CONTRACT_ABI } from '@/constants/contract';
import { formatEther } from 'viem';
import { publicClient, currentChain } from '@/utils/client';

// Function to format ticket status
export function formatTicketStatus(status) {
  const statusMap = {
    0: 'Disponible',
    1: 'Verrouillé',
    2: 'En vente',
    3: 'Collector',
    4: 'Expiré'
  };
  return statusMap[Number(status)] || 'Inconnu';
}

// Helper to create ethers contract instance
async function getContract() {
  try {
    const { ethers } = await import('ethers');
    
    // Use the RPC URL provided by utils/client
    const networkName = process.env.NEXT_PUBLIC_NETWORK || 'hardhat';
    const rpcUrl = currentChain.rpcUrls?.default?.http?.[0] || 'http://127.0.0.1:8545';
    
    console.log(`Connexion au contrat sur ${networkName} via ${rpcUrl}`);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Création of the contract instance
    return new ethers.Contract(
      ADRENALINE_CONTRACT_ADDRESS,
      ADRENALINE_CONTRACT_ABI,
      provider
    );
  } catch (error) {
    console.error('Error creating contract instance:', error);
    throw error;
  }
}

// Function to get information about a ticket
export async function getTicketInfo(tokenId) {
  try {
    const contract = await getContract();
    
    try {
      // Call the getTicketInfo function
      const ticketData = await contract.getTicketInfo(tokenId);
      
      // Format the ticket data
      let ticketInfo;
      
      if (Array.isArray(ticketData)) {
        // Parse tuple response
        ticketInfo = {
          id: tokenId.toString(),
          wallet: ticketData[1] || '',
          productCode: ticketData[2] || '',
          centerCode: ticketData[3] || '',
          status: Number(ticketData[0] || 0),
          price: ticketData[4]?.toString() || '0',
          priceFormatted: formatEther(ticketData[4] || '0'),
          formattedStatus: formatTicketStatus(ticketData[0]),
          limitDate: ticketData[5]?.toString() || '',
          reservationDate: ticketData[6]?.toString() || ''
        };
      } else {
        // Standard object response
        ticketInfo = {
          id: tokenId.toString(),
          wallet: ticketData.wallet,
          productCode: ticketData.productCode,
          centerCode: ticketData.centerCode || '',
          status: Number(ticketData.status),
          price: ticketData.price?.toString() || '0',
          priceFormatted: formatEther(ticketData.price || '0'),
          formattedStatus: formatTicketStatus(ticketData.status),
          limitDate: ticketData.limitDate?.toString() || '',
          reservationDate: ticketData.reservationDate?.toString() || ''
        };
      }
      
      return {
        success: true,
        ticketInfo
      };
    } catch (callError) {
      // Try alternative method
      try {
        // Check if ticket exists using ownerOf
        if (contract.ownerOf) {
          const owner = await contract.ownerOf(tokenId);
          
          return {
            success: true,
            ticketInfo: {
              id: tokenId.toString(),
              wallet: owner,
              status: 0,
              formattedStatus: formatTicketStatus(0),
              limitDate: '',
              reservationDate: ''
            }
          };
        }
      } catch (altError) {
        // Ignore alternative error and use the original one
      }
      
      throw callError;
    }
  } catch (error) {
    // Check for invalid ID errors
    if (
      error.message && (
        error.message.includes('InvalidId') || 
        error.message.includes('reverted') ||
        error.message.includes("token doesn't exist") ||
        error.message.includes("ERC721NonexistentToken") ||
        error.message.includes("call revert exception")
      )
    ) {
      return {
        success: false,
        notFound: true,
        error: `Token #${tokenId} does not exist`,
        ticketInfo: null
      };
    }
    
    return {
      success: false,
      error: error.message,
      ticketInfo: null
    };
  }
}

// Function to get all tickets of a user
export async function getUserTickets(address) {
  if (!address) {
    return {
      success: false,
      error: 'No address provided',
      tickets: []
    };
  }
  
  try {
    const contract = await getContract();
    
    // Get the number of tokens owned by the user
    console.log(`Fetching tickets for user ${address}...`);
    const tokenIds = await contract.getTicketsOfOwner(address);
    console.log(`Retrieved ${tokenIds.length} token IDs for user ${address}`);
    
    // Get the details for each ticket
    const ticketsPromises = tokenIds.map(id => 
      getTicketInfo(id.toString())
        .then(result => result.success ? result.ticketInfo : null)
        .catch((err) => {
          console.error(`Error fetching ticket #${id}:`, err);
          return null;
        })
    );
    
    const ticketsResults = await Promise.all(ticketsPromises);
    const tickets = ticketsResults.filter(ticket => ticket !== null);
    
    console.log(`Successfully loaded ${tickets.length} of ${tokenIds.length} tickets`);
    
    return {
      success: true,
      tickets
    };
  } catch (error) {
    console.error('Error loading user tickets:', error);
    
    // Fallback to old method using balanceOf and tokenOfOwnerByIndex if necessary
    try {
      console.log('Falling back to legacy method (balanceOf + tokenOfOwnerByIndex)');
      const contract = await getContract();
      
      // Get the number of tokens owned by the user
      const balance = await contract.balanceOf(address);
      console.log(`User ${address} has ${balance.toString()} tickets (legacy method)`);
      
      // Get each token ID using tokenOfOwnerByIndex
      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        tokenIds.push(tokenId.toString());
      }
      
      console.log(`Retrieved token IDs: ${tokenIds.join(', ')}`);
      
      // Get the details for each ticket
      const ticketsPromises = tokenIds.map(id => 
        getTicketInfo(id)
          .then(result => result.success ? result.ticketInfo : null)
          .catch(() => null)
      );
      
      const ticketsResults = await Promise.all(ticketsPromises);
      const tickets = ticketsResults.filter(ticket => ticket !== null);
      
      return {
        success: true,
        tickets
      };
    } catch (fallbackError) {
      console.error('Error using fallback method for getting user tickets:', fallbackError);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve tickets',
        tickets: []
      };
    }
  }
}

  // Function to get URI of a ticket
export async function getTicketURI(tokenId) {
  try {
    const contract = await getContract();
    
    const uri = await contract.tokenURI(tokenId);
    
    return {
      success: true,
      uri,
      method: 'tokenURI'
    };
  } catch (error) {
    console.error(`Error getting URI for token #${tokenId}:`, error);
    return {
      success: false,
      error: error.message,
      uri: null
    };
  }
}

// Function to fetch metadata from a URI
export async function fetchMetadata(uri) {
  if (!uri) {
    return { success: false, error: 'URI is undefined or null', metadata: null };
  }

  try {
    // Gestion IPFS
    const fetchUrl = uri.startsWith('ipfs://') 
      ? `https://ipfs.io/ipfs/${uri.substring(7)}`
      : uri;
    
    // Get the metadata
    const response = await fetch(fetchUrl, { 
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const metadata = await response.json();
    
    // Convert IPFS URLs to image
    if (metadata.image && metadata.image.startsWith('ipfs://')) {
      metadata.image = `https://ipfs.io/ipfs/${metadata.image.substring(7)}`;
    }
    
    return { success: true, metadata };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return { success: false, error: error.message, metadata: null };
  }
}

// Export the main functions
export default {
  getTicketInfo,
  getUserTickets,
  getTicketURI,
  fetchMetadata,
  formatTicketStatus
}; 