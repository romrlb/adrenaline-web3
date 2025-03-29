'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, useWatchContractEvent, useContractRead } from 'wagmi';
import { ADRENALINE_CONTRACT_ADDRESS, ADRENALINE_CONTRACT_ABI } from '@/constants/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ReloadIcon, Pencil2Icon, LockClosedIcon, LockOpen2Icon, StarIcon, PlusIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { parseEther, formatEther } from 'viem';
import { publicClient } from '@/utils/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent, Dialog } from "@/components/ui/dialog";
import Image from 'next/image';

const client = await publicClient

export default function TicketAdmin() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tickets, setTickets] = useState([]);
  const [ticketMetadata, setTicketMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [nextId, setNextId] = useState(0);
  const hasInitiallyLoaded = useRef(false);
  
  // Form states
  const [mintForm, setMintForm] = useState({
    centerCode: '',
    productCode: '',
    price: '',
    wallet: ''
  });

  const [lockForm, setLockForm] = useState({
    tokenId: '',
    centerCode: ''
  });

  const [unlockForm, setUnlockForm] = useState({
    tokenId: '',
    centerCode: ''
  });
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);

  // Function to fetch ticket URI
  const fetchTicketURI = async (tokenId) => {
    try {
      // First try to get a specific token URI
      let uri = await client.readContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'getTokenURI',
        args: [tokenId]
      });
      
      // If no specific URI, get the product code URI
      if (!uri || uri === '') {
        const ticketInfo = await client.readContract({
          address: ADRENALINE_CONTRACT_ADDRESS,
          abi: ADRENALINE_CONTRACT_ABI,
          functionName: 'getTicketInfo',
          args: [tokenId]
        });
        
        if (ticketInfo && ticketInfo.productCode) {
          uri = await client.readContract({
            address: ADRENALINE_CONTRACT_ADDRESS,
            abi: ADRENALINE_CONTRACT_ABI,
            functionName: 'getProductCodeURI',
            args: [ticketInfo.productCode]
          });
        }
      }
      
      // If still no URI, try the tokenURI function (fallback to base)
      if (!uri || uri === '') {
        uri = await client.readContract({
          address: ADRENALINE_CONTRACT_ADDRESS,
          abi: ADRENALINE_CONTRACT_ABI,
          functionName: 'tokenURI',
          args: [tokenId]
        });
      }
      
      return uri;
    } catch (error) {
      console.error(`Error fetching URI for token ${tokenId}:`, error);
      return null;
    }
  };
  
  // Function to fetch metadata from URI
  const fetchMetadata = async (uri) => {
    if (!uri) return null;
    
    try {
      // Handle IPFS URIs
      const url = uri.startsWith('ipfs://') 
        ? `https://ipfs.io/ipfs/${uri.substring(7)}`
        : uri;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const metadata = await response.json();
      
      // Process image URI if it's IPFS
      if (metadata.image) {
        // Handle IPFS URI
        if (metadata.image.startsWith('ipfs://')) {
          metadata.image = `https://ipfs.io/ipfs/${metadata.image.substring(7)}`;
        }
        // Handle IPFS CID directly (without protocol)
        else if (metadata.image.startsWith('Qm') && !metadata.image.includes('/')) {
          metadata.image = `https://ipfs.io/ipfs/${metadata.image}`;
        }
        // Handle other relative paths
        else if (!metadata.image.startsWith('http') && !metadata.image.startsWith('/')) {
          metadata.image = `/${metadata.image}`;
        }
      }
      
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata from ${uri}:`, error);
      return null;
    }
  };
  
  // Load ticket metadata
  const loadTicketMetadata = async (tickets) => {
    if (!tickets || tickets.length === 0) return;
    
    setIsLoadingMetadata(true);
    const metadataPromises = tickets.map(async (ticket) => {
      try {
        const uri = await fetchTicketURI(ticket.id);
        if (uri) {
          const metadata = await fetchMetadata(uri);
          return { id: ticket.id, metadata, uri };
        }
      } catch (error) {
        console.error(`Error loading metadata for ticket ${ticket.id}:`, error);
      }
      return { id: ticket.id, metadata: null, uri: null };
    });
    
    const metadataResults = await Promise.all(metadataPromises);
    const newMetadata = {};
    
    metadataResults.forEach(result => {
      if (result && result.metadata) {
        newMetadata[result.id] = {
          ...result.metadata,
          uri: result.uri
        };
      }
    });
    
    setTicketMetadata(newMetadata);
    setIsLoadingMetadata(false);
  };

  // Function to fetch tickets directly from the blockchain
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const tempTickets = [];
      
      console.log("Fetching tickets...");
      
      let tokenId = 0;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3; // Stop after 3 consecutive failures
      const maxTokensToCheck = 50; // Maximum limit to avoid infinite loop
      
      while (tokenId < maxTokensToCheck && consecutiveFailures < maxConsecutiveFailures) {
        try {
          // Try to get the ticket information
          const ticketInfo = await client.readContract({
            address: ADRENALINE_CONTRACT_ADDRESS,
            abi: ADRENALINE_CONTRACT_ABI,
            functionName: 'getTicketInfo',
            args: [tokenId]
          });
          
          // Si nous arrivons ici sans erreur, le ticket existe
          console.log(`Found ticket ${tokenId}`);
          
          // Check if the wallet is valid
          if (ticketInfo && ticketInfo.wallet && ticketInfo.wallet !== '0x0000000000000000000000000000000000000000') {
            tempTickets.push({
              id: tokenId,
              ...ticketInfo
            });
            
            if (tokenId >= nextId) {
              setNextId(tokenId + 1);
            }
            
            // Reset the failure counter
            consecutiveFailures = 0;
          } else {
            // Ticket exists but has invalid wallet
            consecutiveFailures++;
            console.log(`Ticket ${tokenId} exists but has invalid wallet`);
          }
          
        } catch (error) {
          // Error when retrieving the ticket - probably non-existent
          consecutiveFailures++;
          console.log(`No ticket at ID ${tokenId}: ${error.message}`);
        }
        
        tokenId++;
      }
      
      console.log(`Found ${tempTickets.length} tickets`);
      setTickets(tempTickets);
      
      // Load metadata for tickets
      await loadTicketMetadata(tempTickets);
      
      if (tempTickets.length === 0) {
        toast.info('Aucun ticket trouvé');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erreur lors du chargement des tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually trigger token refresh
  const handleRefreshTokens = () => {
    fetchTickets();
    toast.success('Rafraîchissement des tickets en cours...', {
      description: 'Cette opération peut prendre quelques secondes.',
      duration: 3000,
    });
  };

  // Watch for TicketCreated events
  useWatchContractEvent({
    address: ADRENALINE_CONTRACT_ADDRESS,
    abi: ADRENALINE_CONTRACT_ABI,
    eventName: 'TicketCreated',
    fromBlock: process.env.NEXT_PUBLIC_FROM_BLOCK
    ? BigInt(process.env.NEXT_PUBLIC_FROM_BLOCK)
    : 0n,
    toBlock: 'latest',
    onLogs(logs) {
      console.log("Ticket created event:", logs);
      logs.forEach(log => {
        const tokenId = Number(log.args.tokenId);
        if (tokenId >= nextId) {
          setNextId(tokenId + 1);
        }
      });
    },
  });

  // Load tickets only on initial component load
  useEffect(() => {
    if (isConnected && walletClient && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      fetchTickets();
    }
  }, [isConnected, walletClient]); // fetchTickets removed from dependencies to avoid the circular reference
  
  const getStatusInfo = (status) => {
    const statusMap = {
      0: { text: 'Disponible', color: 'bg-green-100 text-green-800 border-green-200' },
      1: { text: 'Verrouillé', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      2: { text: 'En vente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      3: { text: 'Collector', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      4: { text: 'Expiré', color: 'bg-red-100 text-red-800 border-red-200' }
    };
    return statusMap[status] || { text: 'Inconnu', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };
  
  const handleMintTicket = async (e) => {
    e.preventDefault();
    
    try {
      setIsMinting(true);
      const { centerCode, productCode, price, wallet } = mintForm;
      
      if (!centerCode || !productCode || !price || !wallet) {
        toast.error('Tous les champs sont requis');
        return;
      }
      
      // Validate wallet address format
      if (!wallet.startsWith('0x') || wallet.length !== 42) {
        toast.error('L&apos;adresse du portefeuille est invalide');
        return;
      }
      
      const priceInWei = parseEther(price);
      
      console.log('Creating ticket with args:', {
        wallet,
        productCode,
        priceInWei: priceInWei.toString()
      });
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'createTicket',
        args: [
          wallet,           // to
          `${productCode}`, // productCode 
          priceInWei        // price
        ]
      });
      
      toast.success(`Ticket en cours de création pour ${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      console.log('Transaction hash:', hash);
      
      // Clear form fields after successful mint
      setMintForm({
        centerCode: '',
        productCode: '',
        price: '',
        wallet: ''
      });
      

      setTimeout(() => {
        fetchTickets();
      }, 5000);
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(`Erreur lors de la création du ticket: ${error.message}`);
    } finally {
      setIsMinting(false);
    }
  };

  const handleLockTicket = async (tokenId, centerCode) => {
    if (tokenId === undefined || tokenId === null || centerCode === undefined || centerCode === '') {
      toast.error('ID du ticket et code du centre sont requis');
      return;
    }

    try {
      setIsLocking(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'lockTicket',
        args: [BigInt(tokenId), centerCode]
      });
      
      toast.success(`Ticket #${tokenId} en cours de verrouillage`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      setTimeout(() => {
        fetchTickets();
        setActionDialog(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error locking ticket:', error);
      toast.error(`Erreur lors du verrouillage du ticket: ${error.message}`);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockTicket = async (tokenId, centerCode) => {
    if (tokenId === undefined || tokenId === null || centerCode === undefined || centerCode === '') {
      toast.error('ID du ticket et code du centre sont requis');
      return;
    }

    try {
      setIsUnlocking(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'unlockTicket',
        args: [BigInt(tokenId), centerCode]
      });
      
      toast.success(`Ticket #${tokenId} en cours de déverrouillage`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      setTimeout(() => {
        fetchTickets();
        setActionDialog(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error unlocking ticket:', error);
      toast.error(`Erreur lors du déverrouillage du ticket: ${error.message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleUseTicket = async (tokenId) => {
    if (tokenId === undefined || tokenId === null) {
      toast.error('ID du ticket est requis');
      return;
    }

    try {
      setIsCollecting(true);
      
      const hash = await walletClient.writeContract({
        address: ADRENALINE_CONTRACT_ADDRESS,
        abi: ADRENALINE_CONTRACT_ABI,
        functionName: 'useTicket',
        args: [BigInt(tokenId)]
      });
      
      toast.success(`Ticket #${tokenId} en cours d'utilisation (passage en collector)`, {
        description: `Transaction: ${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      });
      
      setTimeout(() => {
        fetchTickets();
        setActionDialog(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error using ticket:', error);
      toast.error(`Erreur lors de l'utilisation du ticket: ${error.message}`);
    } finally {
      setIsCollecting(false);
    }
  };

  const openActionDialog = (action, ticket) => {
    if (!ticket || ticket.id === undefined || ticket.id === null) {
      toast.error('Ticket invalide');
      return;
    }
    
    setSelectedTicket(ticket);
    setActionDialog(action);
    
    // Pre-fill the forms with the ticket ID
    if (action === 'lock') {
      setLockForm({ tokenId: ticket.id.toString(), centerCode: '' });
    } else if (action === 'unlock') {
      setUnlockForm({ tokenId: ticket.id.toString(), centerCode: ticket.centerCode });
    }
  };

  return (
    <Card className="w-full">
      <Tabs defaultValue="list" className="w-full">
        <CardHeader>
          <CardTitle>Gestion des Tickets</CardTitle>
          <CardDescription>Administrez les tickets NFT Adrenaline</CardDescription>
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="list">Liste des tickets</TabsTrigger>
            <TabsTrigger value="mint">Créer un ticket</TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Liste des tickets</CardTitle>
                  <CardDescription>Tous les tickets créés</CardDescription>
                </div>
                <Button onClick={handleRefreshTokens} disabled={isLoading} variant="outline" size="sm">
                  {isLoading ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4" />
                      Rafraîchir
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">
                  <ReloadIcon className="inline-block h-8 w-8 animate-spin mb-4" />
                  <p>Chargement des tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500 mb-4">Aucun ticket trouvé</p>
                  <Button onClick={handleRefreshTokens} variant="outline" size="sm">
                    <ReloadIcon className="mr-2 h-4 w-4" />
                    Rafraîchir
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-500">{tickets.length} ticket(s) trouvé(s)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {tickets.map((ticket) => {
                      const status = getStatusInfo(Number(ticket.status));
                      
                      return (
                        <Card key={ticket.id} className="overflow-hidden border-2 border-gray-400 hover:border-gray-600 shadow-sm hover:shadow flex flex-col">
                          {/* Image en haut de la carte avec une taille fixe carrée */}
                          {ticketMetadata[ticket.id] && ticketMetadata[ticket.id].image && (
                            <div className="relative w-full aspect-square">
                              <Image 
                                src={ticketMetadata[ticket.id].image}
                                alt={ticketMetadata[ticket.id].name || `Ticket #${ticket.id}`}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="transition-all hover:scale-105"
                                unoptimized={ticketMetadata[ticket.id].image.startsWith('https://ipfs.io/')}
                              />
                              {/* Badge de statut superposé sur l'image */}
                              <div className="absolute top-3 right-3">
                                <Badge variant="outline" className={`${status.color} shadow-sm`}>
                                  {status.text}
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">Ticket #{ticket.id}</CardTitle>
                                <CardDescription>Code produit: {ticket.productCode}</CardDescription>
                              </div>
                              {/* Badge affiché uniquement si pas d'image */}
                              {(!ticketMetadata[ticket.id] || !ticketMetadata[ticket.id].image) && (
                                <Badge variant="outline" className={status.color}>
                                  {status.text}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Titre et description des métadonnées */}
                            {ticketMetadata[ticket.id] && ticketMetadata[ticket.id].name && (
                              <div className="mt-2">
                                <h3 className="font-medium">{ticketMetadata[ticket.id].name}</h3>
                                {ticketMetadata[ticket.id].description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ticketMetadata[ticket.id].description}</p>
                                )}
                              </div>
                            )}
                          </CardHeader>
                          
                          <CardContent className="pb-2 pt-0 flex-grow">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Centre:</span>
                                <span className="font-medium">{ticket.centerCode}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Prix:</span>
                                <span className="font-medium">{formatEther(ticket.price)} ETH</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Propriétaire:</span>
                                <span className="font-mono text-xs">
                                  {ticket.wallet ? 
                                    `${ticket.wallet.substring(0, 6)}...${ticket.wallet.substring(ticket.wallet.length - 4)}` : 
                                    'N/A'}
                                </span>
                              </div>
                              
                              {ticketMetadata[ticket.id] && ticketMetadata[ticket.id].uri && (
                                <div className="flex justify-end pt-1">
                                  <a 
                                    href={ticketMetadata[ticket.id].uri.startsWith('ipfs://') 
                                      ? `https://ipfs.io/ipfs/${ticketMetadata[ticket.id].uri.substring(7)}`
                                      : ticketMetadata[ticket.id].uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs flex items-center text-blue-600 hover:text-blue-800"
                                  >
                                    Voir métadonnées
                                    <ExternalLinkIcon className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          
                          <CardFooter className="flex justify-end gap-1 pt-0 mt-auto border-t border-gray-100 bg-gray-50">
                            {Number(ticket.status) === 0 && ( // Available
                              <Button size="icon" variant="ghost" title="Lock" onClick={() => openActionDialog('lock', ticket)}>
                                <LockClosedIcon className="h-4 w-4" />
                              </Button>
                            )}
                            {Number(ticket.status) === 1 && ( // Locked
                              <>
                                <Button size="icon" variant="ghost" title="Déverrouiller" onClick={() => openActionDialog('unlock', ticket)}>
                                  <LockOpen2Icon className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Utiliser (passage en collector)" onClick={() => openActionDialog('use', ticket)}>
                                  <StarIcon className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mint">
          <Card>
            <CardHeader>
              <CardTitle>Créer un nouveau ticket</CardTitle>
              <CardDescription>Minter un nouveau NFT dans le contrat</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMintTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="centerCode">Code du Centre</Label>
                    <Input
                      id="centerCode"
                      value={mintForm.centerCode}
                      onChange={(e) => setMintForm({ ...mintForm, centerCode: e.target.value })}
                      placeholder="000001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productCode">Code du Produit</Label>
                    <Input
                      id="productCode"
                      value={mintForm.productCode}
                      onChange={(e) => setMintForm({ ...mintForm, productCode: e.target.value })}
                      placeholder="P01T01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (ETH)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={mintForm.price}
                      onChange={(e) => setMintForm({ ...mintForm, price: e.target.value })}
                      placeholder="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wallet">Portefeuille Destinataire</Label>
                    <Input
                      id="wallet"
                      value={mintForm.wallet}
                      onChange={(e) => setMintForm({ ...mintForm, wallet: e.target.value })}
                      placeholder="0x..."
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isMinting || !isConnected}
                >
                  {isMinting ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Créer le ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog to lock a ticket */}
      <Dialog open={actionDialog === 'lock'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verrouiller le ticket #{selectedTicket?.id}</DialogTitle>
            <DialogDescription>
              Verrouille le ticket en l'attribuant à un centre spécifique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lockCenterCode">Code du centre</Label>
              <Input
                id="lockCenterCode"
                value={lockForm.centerCode}
                onChange={(e) => setLockForm({ ...lockForm, centerCode: e.target.value })}
                placeholder="000001"
              />
              <p className="text-sm text-gray-500">
                Entrez le code du centre qui réserve ce ticket.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if ((lockForm.tokenId === '0' || lockForm.tokenId) && lockForm.centerCode) {
                  handleLockTicket(lockForm.tokenId, lockForm.centerCode);
                } else {
                  toast.error('ID du ticket et code du centre sont requis');
                }
              }}
              disabled={isLocking || lockForm.centerCode === undefined || lockForm.centerCode === ''}
            >
              {isLocking ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Verrouillage...
                </>
              ) : (
                <>
                  <LockClosedIcon className="mr-2 h-4 w-4" />
                  Verrouiller
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setActionDialog(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to unlock a ticket */}
      <Dialog open={actionDialog === 'unlock'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Déverrouiller le ticket #{selectedTicket?.id}</DialogTitle>
            <DialogDescription>
              Déverrouille le ticket pour le rendre à nouveau disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unlockCenterCode">Code du centre</Label>
              <Input
                id="unlockCenterCode"
                value={unlockForm.centerCode}
                onChange={(e) => setUnlockForm({ ...unlockForm, centerCode: e.target.value })}
                placeholder="000001"
              />
              <p className="text-sm text-gray-500">
                Confirmez le code du centre pour déverrouiller ce ticket. Le code doit correspondre au centre qui l&apos;a verrouillé.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if ((unlockForm.tokenId === '0' || unlockForm.tokenId) && unlockForm.centerCode) {
                  handleUnlockTicket(unlockForm.tokenId, unlockForm.centerCode);
                } else {
                  toast.error('ID du ticket et code du centre sont requis');
                }
              }}
              disabled={isUnlocking || unlockForm.centerCode === undefined || unlockForm.centerCode === ''}
            >
              {isUnlocking ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Déverrouillage...
                </>
              ) : (
                <>
                  <LockOpen2Icon className="mr-2 h-4 w-4" />
                  Déverrouiller
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setActionDialog(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to use a ticket (collector mode) */}
      <Dialog open={actionDialog === 'use'} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Utiliser le ticket #{selectedTicket?.id}</DialogTitle>
            <DialogDescription>
              Transforme ce ticket en NFT collector après son utilisation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Cette action est <strong>irréversible</strong>. Le ticket passera en mode collector et ne pourra plus être utilisé comme un ticket standard.
            </p>
            <p className="text-sm mt-2 text-gray-500">
              Centre: {selectedTicket?.centerCode}
            </p>
            <p className="text-sm text-gray-500">
              Code produit: {selectedTicket?.productCode}
            </p>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if (selectedTicket && (selectedTicket.id === 0 || selectedTicket.id)) {
                  handleUseTicket(selectedTicket.id);
                } else {
                  toast.error('Ticket invalide');
                }
              }}
              disabled={isCollecting || selectedTicket === null || selectedTicket === undefined}
            >
              {isCollecting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <StarIcon className="mr-2 h-4 w-4" />
                  Utiliser le ticket
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setActionDialog(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 