'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, useWatchContractEvent } from 'wagmi';
import { ADRENALINE_CONTRACT_ADDRESS, ADRENALINE_CONTRACT_ABI } from '@/constants/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ReloadIcon, Pencil2Icon, LockClosedIcon, LockOpen2Icon, StarIcon, PlusIcon } from "@radix-ui/react-icons";
import { parseEther, formatEther } from 'viem';
import { publicClient } from '@/utils/client'
import { hardhat } from 'viem/chains';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent, Dialog } from "@/components/ui/dialog";

const client = await publicClient

export default function TicketAdmin() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  }, [isConnected, walletClient]);

  // Function to manually trigger token refresh
  const handleRefreshTokens = () => {
    fetchTickets();
    toast.success('Rafraîchissement des tickets en cours...', {
      description: 'Cette opération peut prendre quelques secondes.',
      duration: 3000,
    });
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
      const maxTokensToCheck = 50; // Maxim um limit to avoid infinite loop
      
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
  
  const getStatusInfo = (status) => {
    const statusMap = {
      0: { text: 'Disponible', color: 'bg-green-100 text-green-800' },
      1: { text: 'Verrouillé', color: 'bg-orange-100 text-orange-800' },
      2: { text: 'En vente', color: 'bg-blue-100 text-blue-800' },
      3: { text: 'Collector', color: 'bg-purple-100 text-purple-800' },
      4: { text: 'Expiré', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { text: 'Inconnu', color: 'bg-gray-100 text-gray-800' };
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
        toast.error('L\'adresse du portefeuille est invalide');
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
    if (!tokenId || !centerCode) {
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
    if (!tokenId || !centerCode) {
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
    if (!tokenId) {
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
      
      toast.success(`Ticket #${tokenId} en cours d'utilisation (passage en collectionneur)`, {
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tickets.map((ticket) => {
                      const status = getStatusInfo(Number(ticket.status));
                      
                      return (
                        <Card key={ticket.id} className="overflow-hidden border-2 border-gray-400 hover:border-gray-600 shadow-sm hover:shadow">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">Ticket #{ticket.id}</CardTitle>
                                <CardDescription>{ticket.productCode}</CardDescription>
                              </div>
                              <Badge className={status.color}>
                                {status.text}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
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
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-end gap-1 pt-0">
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
                                <Button size="icon" variant="ghost" title="Utiliser (mode collectionneur)" onClick={() => openActionDialog('use', ticket)}>
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
              onClick={() => handleLockTicket(lockForm.tokenId, lockForm.centerCode)}
              disabled={isLocking || !lockForm.centerCode}
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
                Confirmez le code du centre pour déverrouiller ce ticket. Le code doit correspondre au centre qui l'a verrouillé.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => handleUnlockTicket(unlockForm.tokenId, unlockForm.centerCode)}
              disabled={isUnlocking || !unlockForm.centerCode}
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
              Produit: {selectedTicket?.productCode}
            </p>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => handleUseTicket(selectedTicket?.id)}
              disabled={isCollecting}
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