import useSWR from 'swr';
import { useAccount } from 'wagmi';
import { useCallback, useRef, useMemo } from 'react';
import { getTicketInfo, getUserTickets, getTicketURI, fetchMetadata } from '@/lib/contractService';
import { ADRENALINE_CONTRACT_ADDRESS, ADRENALINE_CONTRACT_ABI } from '@/constants/contract';
import { toast } from 'sonner';
import { useWriteContract } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { currentChain } from '@/utils/client';

// Mapping of chains for write operations
const CHAIN_MAPPING = {
  hardhat,
  sepolia
  // To add more networks, add them here
};

// Get the appropriate chain for write operations
const getChainForWrite = () => {
  const networkName = process.env.NEXT_PUBLIC_NETWORK || 'hardhat';
  return CHAIN_MAPPING[networkName] || hardhat;
};

// Fetchers
const ticketFetcher = async (tokenId) => {
  const result = await getTicketInfo(tokenId);
  if (!result.success) throw new Error(result.error);
  return result.ticketInfo;
};

const metadataFetcher = async (tokenId) => {
  const uriResult = await getTicketURI(tokenId);
  if (!uriResult.success || !uriResult.uri) return null;
  
  const metadataResult = await fetchMetadata(uriResult.uri);
  if (!metadataResult.success) return null;
  
  return {
    ...metadataResult.metadata,
    uri: uriResult.uri
  };
};

// const userTicketsFetcher = async (address) => {
//   const result = await getUserTickets(address);
//   if (!result.success) throw new Error(result.error);
//   return result.tickets;
// };

// Global configuration for SWR
const defaultConfig = {
  revalidateOnFocus: false,
  refreshInterval: 30000,
  errorRetryCount: 3,
  dedupingInterval: 5000
};

// Hook to get the information of a ticket
export function useTicket(tokenId) {
  return useSWR(
    tokenId !== undefined && tokenId !== null ? ['ticket', tokenId] : null,
    ([_, id]) => ticketFetcher(id),
    defaultConfig
  );
}

// Hook to get the metadata of a ticket
export function useTicketMetadata(tokenId) {
  const metadataFetcher = useCallback(async () => {
    if (tokenId === undefined || tokenId === null) return null;
    
    try {
      // Get the URI for the token
      const uriResult = await getTicketURI(tokenId);
      
      if (!uriResult.success) {
        return null;
      }
      
      // Get the metadata from the URI
      const metadataResult = await fetchMetadata(uriResult.uri);
      
      if (!metadataResult.success) {
        return null;
      }
      
      // Add the URI to the metadata for reference
      const finalMetadata = { 
        ...metadataResult.metadata, 
        uri: uriResult.uri 
      };
      
      return finalMetadata;
    } catch (error) {
      return null;
    }
  }, [tokenId]);
  
  return useSWR(
    tokenId !== undefined && tokenId !== null ? ['metadata', tokenId] : null,
    metadataFetcher,
    {
      ...defaultConfig,
      errorRetryCount: 2,
      refreshInterval: 60000,
      dedupingInterval: 30000,
      revalidateIfStale: false
    }
  );
}

// // Hook to get all tickets of a user
// export function useUserTickets() {
//   const { address, isConnected } = useAccount();
  
//   return useSWR(
//     isConnected && address ? ['user-tickets', address] : null,
//     ([_, addr]) => userTicketsFetcher(addr),
//     { 
//       ...defaultConfig,
//       revalidateOnFocus: true 
//     }
//   );
// }

// Hook simplified to get individual tickets by ID
export function useTicketsById(ticketIds = []) {
  // Use a reference to check if the IDs have actually changed
  const ticketIdsRef = useRef(ticketIds);
  const ticketIdsKey = useMemo(() => {
    // Check if the IDs have changed significantly
    const currentIds = [...ticketIds].sort((a, b) => a - b).join(',');
    const prevIds = [...ticketIdsRef.current].sort((a, b) => a - b).join(',');
    
    if (currentIds !== prevIds) {
      ticketIdsRef.current = ticketIds;
      return currentIds;
    }
    
    return prevIds;
  }, [ticketIds]);
  
  const fetcher = useCallback(async () => {
    if (!ticketIdsRef.current || ticketIdsRef.current.length === 0) {
      return [];
    }
    
    // Get each ticket individually
    const promises = ticketIdsRef.current.map(id => 
      getTicketInfo(id)
        .then(result => {
          if (result.success) {
            return { ...result.ticketInfo, id };
          }
          return null;
        })
        .catch(() => null)
    );
    
    const results = await Promise.all(promises);
    return results.filter(ticket => ticket !== null);
  }, [ticketIdsKey]);
  
  const { data, error, isLoading, mutate } = useSWR(
    ticketIds.length > 0 ? ['tickets-by-id', ticketIdsKey] : null,
    fetcher,
    defaultConfig
  );
  
  return { 
    data,
    error,
    isLoading,
    mutate
  };
}

// Hook to manage the creation of a ticket
export function useMintTicket() {
  const { data: hash, isPending, isError, error, writeContract } = useWriteContract();
  
  const mintTicket = useCallback(
    async ({ to, productCode, centerCode, price }) => {
      if (!to || !productCode) throw new Error('Missing required parameters');
      
      try {
        await writeContract({
          abi: ADRENALINE_CONTRACT_ABI,
          address: ADRENALINE_CONTRACT_ADDRESS,
          functionName: 'mintTicket',
          args: [to, productCode, centerCode || '', price || 0],
          chain: getChainForWrite()
        });
        
        toast.success('Transaction sent successfully');
        return true;
      } catch (error) {
        toast.error(`Error: ${error.message || 'Unknown error'}`);
        return false;
      }
    },
    [writeContract]
  );
  
  return { mintTicket, hash, isPending, isError, error };
}

// Hook to manage lock/unlock of a the ticket
export function useTicketLock() {
  const { data: hash, isPending, isError, error, writeContract } = useWriteContract();
  
  const lockTicket = useCallback(
    async (tokenId, centerCode, reservationDate) => {
      try {
        await writeContract({
          abi: ADRENALINE_CONTRACT_ABI,
          address: ADRENALINE_CONTRACT_ADDRESS,
          functionName: 'lockTicket',
          args: [tokenId, centerCode, reservationDate],
          chain: getChainForWrite()
        });
        
        toast.success(`Ticket #${tokenId} locked successfully`);
        return true;
      } catch (error) {
        toast.error(`Error: ${error.message || 'Unknown error'}`);
        return false;
      }
    },
    [writeContract]
  );
  
  const unlockTicket = useCallback(
    async (tokenId) => {
      try {
        await writeContract({
          abi: ADRENALINE_CONTRACT_ABI,
          address: ADRENALINE_CONTRACT_ADDRESS,
          functionName: 'unlockTicket',
          args: [tokenId],
          chain: getChainForWrite()
        });
        
        toast.success(`Ticket #${tokenId} unlocked successfully`);
        return true;
      } catch (error) {
        toast.error(`Error: ${error.message || 'Unknown error'}`);
        return false;
      }
    },
    [writeContract]
  );
  
  return { lockTicket, unlockTicket, hash, isPending, isError, error };
}

// Hook to mark a ticket as used (collector)
export function useTicketUsage() {
  const { data: hash, isPending, isError, error, writeContract } = useWriteContract();
  
  const useTicket = useCallback(
    async (tokenId) => {
      try {
        await writeContract({
          abi: ADRENALINE_CONTRACT_ABI,
          address: ADRENALINE_CONTRACT_ADDRESS,
          functionName: 'useTicket',
          args: [tokenId],
          chain: getChainForWrite()
        });
        
        toast.success(`Ticket #${tokenId} marked as used`);
        return true;
      } catch (error) {
        toast.error(`Error: ${error.message || 'Unknown error'}`);
        return false;
      }
    },
    [writeContract]
  );
  
  return { useTicket, hash, isPending, isError, error };
}

export default {
  useTicket,
  useTicketMetadata,
  // useUserTickets,
  useTicketsById,
  useMintTicket,
  useTicketLock,
  useTicketUsage
}; 