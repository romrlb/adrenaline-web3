'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { getUserTickets } from '@/lib/contractService';
import { useTicketMetadata } from '@/hooks/useBlockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReloadIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { formatEther } from 'viem';

// Utility function to get status information
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

// Utility function for date formatting
const formatDateTime = (timestamp) => {
  if (!timestamp || timestamp === '0') return '-';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Check if timestamp is expired
const isExpired = (timestamp) => {
  if (!timestamp || timestamp === '0') return false;
  return Number(timestamp) * 1000 < Date.now();
};

// Check if reservation date is soon (within next 48 hours)
const isReservationSoon = (timestamp) => {
  if (!timestamp || timestamp === '0') return false;
  const reservationTime = Number(timestamp) * 1000;
  const now = Date.now();
  const hoursRemaining = (reservationTime - now) / (1000 * 60 * 60);
  return reservationTime > now && hoursRemaining <= 48;
};

// Format price from wei to ETH
const formatPrice = (priceInWei) => {
  if (!priceInWei) return '0 EUR';
  const priceInEth = formatEther(priceInWei);
  return `${parseFloat(priceInEth).toFixed(0)} EUR`;
};

// Component for each individual ticket
function TicketItem({ ticket }) {
  const [imageError, setImageError] = useState(false);
  const { data: metadata, isLoading: isLoadingMetadata } = useTicketMetadata(ticket.id);
  const status = getStatusInfo(Number(ticket.status));

  const getImageSource = () => {
    if (metadata?.image && !imageError) {
      return metadata.image;
    }
    return `/images/activities/activity-${ticket.productCode || 'default'}.png`;
  };

  const handleImageError = () => {
    console.warn(`Failed to load image for ticket #${ticket.id}`);
    setImageError(true);
  };

  return (
    <Card className="overflow-hidden border-2 border-gray-400 hover:border-gray-600 shadow-sm hover:shadow flex flex-col">
      {/* Image with loading state */}
      <div className="relative w-full aspect-square bg-gray-100">
        {isLoadingMetadata ? (
          <div className="flex items-center justify-center h-full w-full">
            <ReloadIcon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Image 
            src={getImageSource()}
            alt={metadata?.name || `Ticket #${ticket.id} - ${ticket.productCode || ''}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            className="transition-all hover:scale-105"
            onError={handleImageError}
            priority={Number(ticket.id) < 5} // Priority loading for first few tickets
            loading={Number(ticket.id) < 5 ? "eager" : "lazy"}
            quality={80}
          />
        )}
        
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className={`${status.color} shadow-sm`}>
            {status.text}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Ticket #{ticket.id}</CardTitle>
            <CardDescription>Code: {ticket.productCode || 'N/A'}</CardDescription>
          </div>
        </div>
        
        {/* Ticket metadata if available */}
        {metadata && metadata.name && (
          <div className="mt-2">
            <h3 className="font-medium">{metadata.name}</h3>
            {metadata.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{metadata.description}</p>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pb-2 pt-0 flex-grow">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Centre:</span>
            <span className="font-medium">
              {ticket.centerCode && ticket.centerCode !== '000000' ? ticket.centerCode : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Prix:</span>
            <span className="font-medium">
              {formatPrice(ticket.price)}
            </span>
          </div>
          {ticket.limitDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Date limite:</span>
              <span className={`font-medium ${isExpired(ticket.limitDate) ? 'text-red-600' : ''}`}>
                {formatDateTime(ticket.limitDate)}
              </span>
            </div>
          )}
          {ticket.reservationDate && Number(ticket.reservationDate) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Réservation:</span>
              <span className={`font-medium ${isReservationSoon(ticket.reservationDate) ? 'text-orange-600' : ''}`}>
                {formatDateTime(ticket.reservationDate)}
              </span>
            </div>
          )}
          
          {/* Lien vers les métadonnées */}
          {metadata && metadata.uri && (
            <div className="flex justify-end pt-1">
              <a 
                href={metadata.uri.startsWith('ipfs://') 
                  ? `https://ipfs.io/ipfs/${metadata.uri.substring(7)}`
                  : metadata.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center text-blue-600 hover:text-blue-800"
              >
                Voir les metadata
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 mt-auto border-t border-gray-100 bg-gray-50">
        <Button asChild className="w-full">
          <Link href={`/tickets/${ticket.id}`}>
            Voir les détails
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function TicketsPage() {
  const { address, isConnected } = useAccount();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchTickets = async () => {
    if (!isConnected || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserTickets(address);
      if (result.success) {
        setTickets(result.tickets || []);
      } else {
        setError(result.error || 'Une erreur est survenue lors du chargement des tickets');
        console.error('Error fetching tickets:', result.error);
      }
    } catch (err) {
      setError('Une erreur est survenue lors du chargement des tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTickets();
  }, [address, isConnected]);
  
  const handleRefresh = () => {
    fetchTickets();
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-amber-800 mb-2">Wallet non connecté</h2>
          <p className="text-amber-700 mb-4">
            Vous devez connecter votre wallet pour voir vos tickets.
          </p>
          <Button>Connecter mon wallet</Button>
        </div>
      </div>
    );
  }
  
  if (loading && tickets.length === 0) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
        <div className="py-8 text-center">
          <ReloadIcon className="inline-block h-8 w-8 animate-spin mb-4" />
          <p>Chargement des tickets...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-red-800 mb-2">Erreur de chargement</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Réessayer</Button>
        </div>
      </div>
    );
  }
  
  if (tickets.length === 0) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Aucun ticket trouvé</h2>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore acheté de tickets. Découvrez nos activités et commencez l'aventure !
          </p>
          <Button asChild>
            <Link href="/activities">Voir les activités</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Mes Tickets</CardTitle>
              <CardDescription>Vous possédez {tickets.length} ticket(s)</CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
              {loading ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {tickets.map((ticket) => (
              <TicketItem key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 