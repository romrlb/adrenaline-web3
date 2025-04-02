'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount, useWalletClient, useWatchContractEvent } from 'wagmi';
import { ADRENALINE_CONTRACT_ADDRESS, ADRENALINE_CONTRACT_ABI } from '@/constants/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ReloadIcon, Pencil2Icon, LockClosedIcon, LockOpen2Icon, StarIcon, PlusIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { parseEther, formatEther } from 'viem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent, Dialog } from "@/components/ui/dialog";
import Image from 'next/image';
import ClearCacheButton from './ClearCacheButton';

// New imports for SWR
import { useTicketsById, useTicket, useTicketMetadata } from '@/hooks/useBlockchain';
import { ticketMutations } from '@/lib/mutationService';

// Components
import TicketsList from './TicketsList';
import TicketCard from './TicketCard';
import CreateTicketForm from './CreateTicketForm';
import LockTicketDialog from './LockTicketDialog';
import UnlockTicketDialog from './UnlockTicketDialog';
import UseTicketDialog from './UseTicketDialog';

// Utility function to get status information (moved before components)
const getStatusInfo = (status) => {
  const statusMap = {
    0: { text: 'Available', color: 'bg-green-100 text-green-800 border-green-200' },
    1: { text: 'Locked', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    2: { text: 'For Sale', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    3: { text: 'Collector', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    4: { text: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
};

/**
 * Main component for ticket administration
 */
export default function TicketAdmin() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Range calculation based on pagination
  const startId = (currentPage - 1) * pageSize; // Remove Math.max to include ticket 0
  const endId = currentPage * pageSize; // Remove +5 to avoid duplicates
  
  // Generate array of ticket IDs to fetch using useMemo to prevent recreation on every render
  const ticketIdsToFetch = useMemo(() => {
    return Array.from(
      { length: endId - startId },
      (_, i) => startId + i
    );
  }, [startId, endId]);
  
  // Tickets data state
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, ticketId: null });
  const [nextId, setNextId] = useState(1);
  
  // Get tickets by IDs instead of using range
  const { 
    data: fetchedTickets, 
    mutate: refreshTickets, 
    isLoading: isLoadingTickets
  } = useTicketsById(ticketIdsToFetch);
  
  // Stats tracking for pagination
  const [stats, setStats] = useState({ 
    searched: 0, 
    found: 0, 
    invalid: 0 
  });
  
  const debounceTimer = useRef(null);
  
  // UI state
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Action loading states
  const [isMinting, setIsMinting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // Fetch tickets when component mounts or pagination changes
  useEffect(() => {
    if (!isLoadingTickets) {
      // Utiliser des valeurs par défaut et vérifier que fetchedTickets est un tableau
      const ticketsArray = Array.isArray(fetchedTickets) ? fetchedTickets : [];
      
      // Filter tickets for the current page
      const pageTickets = ticketsArray.filter(
        ticket => Number(ticket.id) >= startId && Number(ticket.id) < endId
      );
      
      setTickets(pageTickets);
      setIsLoading(false);
      
      // Mettre à jour les statistiques pour la pagination
      setStats({
        searched: ticketIdsToFetch.length,
        found: ticketsArray.length,
        invalid: ticketIdsToFetch.length - ticketsArray.length
      });
      
      // Estimer le nombre total d'éléments pour la pagination
      const estimatedTotal = Math.max(
        ticketsArray.length,
        pageTickets.length > 0 ? Math.max(...pageTickets.map(t => Number(t.id))) + 1 : 0
      );
      setTotalItems(estimatedTotal);
      
      // Identifier le prochain ID disponible
      if (ticketsArray.length > 0) {
        const maxId = Math.max(...ticketsArray.map(t => Number(t.id)));
        setNextId(maxId + 1);
      }
    }
  }, [fetchedTickets, isLoadingTickets, startId, endId, pageSize]);

  // Watch for contract events
  const onLogs = useCallback(
    (logs) => {
      if (!isConnected || !logs || logs.length === 0) return;

      // Utiliser un délai pour éviter le traitement trop fréquent des logs
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      debounceTimer.current = setTimeout(() => {
        console.log('TicketAdmin: Processing', logs.length, 'new event logs');
        
        const newTicketIds = logs
          .filter(log => log.eventName === 'TicketCreated')
          .map(log => Number(log.args.tokenId));
          
        if (newTicketIds.length > 0) {
          const maxId = Math.max(...newTicketIds);
          if (maxId >= nextId) {
            setNextId(maxId + 1);
          }
        }
        
        refreshTickets();
      }, 2000);
    },
    [isConnected, nextId, refreshTickets]
  );

  // Watch for contract events
  useWatchContractEvent({
    address: ADRENALINE_CONTRACT_ADDRESS,
    abi: ADRENALINE_CONTRACT_ABI,
    eventName: 'TicketCreated',
    onLogs,
    pollingInterval: 5000, // 5 secondes
  });
  
  useWatchContractEvent({
    address: ADRENALINE_CONTRACT_ADDRESS,
    abi: ADRENALINE_CONTRACT_ABI,
    eventName: 'TicketStatusChanged',
    onLogs,
    pollingInterval: 5000,
  });

  // Pagination handlers
  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };
  
  /**
   * Handle minting a new ticket
   */
  const handleMintTicket = async (formData) => {
    try {
      setIsMinting(true);
      const { productCode, price, wallet } = formData;
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'createTicket',
        args: [
          wallet,           // to
          `${productCode}`, // productCode 
          price        // price
        ]
      });
      
      toast.success(`Création du ticket en cours pour ${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      // Refresh after a delay to ensure blockchain has updated
      setTimeout(refreshTickets, 5000);
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(`Erreur lors de la création du ticket: ${error.message}`);
    } finally {
      setIsMinting(false);
    }
  };

  /**
   * Handle locking a ticket
   */
  const handleLockTicket = async (ticketId, centerCode, reservationDate) => {
    try {
      setIsLocking(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'lockTicket',
        args: [
          ticketId,
          centerCode,
          reservationDate
        ]
      });
      
      // Optimistic UI update
      ticketMutations.lockTicket(ticketId, centerCode);
      
      toast.success(`Ticket #${ticketId} verrouillé avec succès`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      closeActionDialog();
      
      // Refresh after a delay to ensure blockchain has updated
      setTimeout(refreshTickets, 5000);
      
    } catch (error) {
      console.error('Error locking ticket:', error);
      toast.error(`Erreur lors du verrouillage du ticket: ${error.message}`);
    } finally {
      setIsLocking(false);
    }
  };

  /**
   * Handle unlocking a ticket
   */
  const handleUnlockTicket = async (ticketId) => {
    try {
      setIsUnlocking(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'unlockTicket',
        args: [
          ticketId
        ]
      });
      
      // Optimistic UI update
      ticketMutations.unlockTicket(ticketId);
      
      toast.success(`Ticket #${ticketId} déverrouillé avec succès`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      closeActionDialog();
      
      // Refresh after a delay to ensure blockchain has updated
      setTimeout(refreshTickets, 5000);
      
    } catch (error) {
      console.error('Error unlocking ticket:', error);
      toast.error(`Erreur lors du déverrouillage du ticket: ${error.message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  /**
   * Handle using a ticket (changing to collector status)
   */
  const handleUseTicket = async (ticketId) => {
    try {
      setIsCollecting(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'useTicket',
        args: [
          ticketId
        ]
      });
      
      // Optimistic UI update
      ticketMutations.useTicket(ticketId);
      
      toast.success(`Ticket #${ticketId} passé à collector`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      closeActionDialog();
      
      // Refresh after a delay to ensure blockchain has updated
      setTimeout(refreshTickets, 5000);
      
    } catch (error) {
      console.error('Error using ticket:', error);
      toast.error(`Error using ticket: ${error.message}`);
    } finally {
      setIsCollecting(false);
    }
  };

  /**
   * Open the action dialog
   */
  const openActionDialog = (action, ticket) => {
    setSelectedTicket(ticket);
    setActionDialog({ open: true, action, ticketId: ticket.id });
  };
  
  /**
   * Close the action dialog
   */
  const closeActionDialog = () => {
    setActionDialog({ open: false, action: null, ticketId: null });
    setTimeout(() => setSelectedTicket(null), 300); // Delay to allow animation
  };
  
  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <Card className="w-full">
      <Tabs defaultValue="list" className="w-full">
        <CardHeader className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des tickets</CardTitle>
            <ClearCacheButton/>
          </div>
          <CardDescription>Gestion des tickets NFT</CardDescription>
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="list">Liste des tickets</TabsTrigger>
            <TabsTrigger value="mint">Créer un nouveau ticket</TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <TabsContent value="list">
          <TicketsList 
            tickets={tickets}
            isLoading={isLoading}
            isError={false}
            onRefresh={refreshTickets}
            onTicketAction={openActionDialog}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              Page {currentPage} • Affichage de {tickets.length} tickets
              {stats && ` • Total trouvé ${stats.found}`}
                              </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevPage}
                disabled={currentPage === 1 || isLoading}
              >
                Précédent
                              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage}
                disabled={tickets.length < pageSize || isLoading}
              >
                Suivant
                                </Button>
            </div>
                  </div>
        </TabsContent>
        
        <TabsContent value="mint">
          <CreateTicketForm 
            onSubmit={handleMintTicket}
            isLoading={isMinting}
            isConnected={isConnected}
          />
        </TabsContent>
      </Tabs>

      {/* Action Dialogs */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && closeActionDialog()}>
        {actionDialog.action === 'lock' && (
          <LockTicketDialog 
            isOpen={actionDialog.open}
            ticket={selectedTicket}
            onClose={closeActionDialog}
            onLock={handleLockTicket}
            isLoading={isLocking}
          />
        )}
        {actionDialog.action === 'unlock' && (
          <UnlockTicketDialog 
            isOpen={actionDialog.open}
            ticket={selectedTicket}
            onClose={closeActionDialog}
            onUnlock={handleUnlockTicket}
            isLoading={isUnlocking}
          />
        )}
        {actionDialog.action === 'use' && (
          <UseTicketDialog 
            isOpen={actionDialog.open}
            ticket={selectedTicket}
            onClose={closeActionDialog}
            onUse={handleUseTicket}
            isLoading={isCollecting}
          />
        )}
      </Dialog>
    </Card>
  );
} 