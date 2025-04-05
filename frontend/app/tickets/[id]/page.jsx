'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getTicketInfo, getTicketURI } from '@/lib/contractService';
import { useTicket, useTicketMetadata } from '@/hooks/useBlockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Timer, QrCode, Clock, Award, ExternalLinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Utility function for status info
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
const formatDate = (timestamp) => {
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

// Function to format price from wei to EUR
const formatPrice = (priceInWei) => {
  if (!priceInWei) return '0 EUR';
  try {
    // Use Intl.NumberFormat to format currency
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(parseInt(priceInWei) / 1e18);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${parseInt(priceInWei) / 1e18} EUR`;
  }
};

export default function TicketDetailPage({ params }) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [imageError, setImageError] = useState(false);
  
  // Utiliser les hooks SWR pour charger les données du ticket
  const { data: ticket, error: ticketError, isLoading: isTicketLoading } = useTicket(params.id);
  const { data: metadata, isLoading: isMetadataLoading } = useTicketMetadata(params.id);
  
  // Déterminer l'état global de chargement et d'erreur
  const isLoading = isTicketLoading;
  const error = ticketError ? 
    (ticketError.message || "Le ticket demandé n'existe pas ou n'a pas pu être récupéré.") : 
    null;
  
  const handleImageError = () => {
    console.warn(`Failed to load image for ticket #${params.id}`);
    setImageError(true);
  };
  
  useEffect(() => {
    if (ticketError) {
      console.error('Error loading ticket:', ticketError);
    }
  }, [ticketError]);
  
  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-6">Détails du Ticket</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-amber-800 mb-2">Wallet non connecté</h2>
          <p className="text-amber-700 mb-4">
            Vous devez connecter votre wallet pour voir les détails de ce ticket.
          </p>
          <Button>Connecter mon wallet</Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Skeleton className="w-full aspect-square rounded-lg" />
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <div>
              <Skeleton className="h-10 w-3/4 mb-2" />
              <Skeleton className="h-6 w-1/2 mb-6" />
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-4 w-2/3 mb-1" />
              <Skeleton className="h-4 w-1/2 mb-1" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !ticket) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-red-800 mb-2">Ticket non trouvé</h2>
          <p className="text-red-700 mb-4">
            {error || "Le ticket demandé n'existe pas ou n'a pas pu être récupéré."}
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Veuillez vérifier :
            </p>
            <ul className="text-sm list-disc pl-5 text-gray-700">
              <li>Que vous êtes bien connecté au bon réseau blockchain</li>
              <li>Que le numéro du ticket est correct</li>
              <li>Que vous êtes le propriétaire de ce ticket</li>
            </ul>
            <Button asChild>
              <Link href="/tickets">Voir tous mes tickets</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const status = getStatusInfo(Number(ticket.status));
  const productName = metadata?.name || `Ticket #${params.id}`;
  const description = metadata?.description || 'Information non disponible';
  
  const getImageSource = () => {
    if (metadata?.image && !imageError) {
      return metadata.image;
    }
    return `/images/activities/activity-${ticket.productCode || 'default'}.png`;
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Image */}
        <div className="md:col-span-1">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={getImageSource()}
              alt={productName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={handleImageError}
              priority
            />
            <div className="absolute top-3 right-3">
              <Badge variant="outline" className={`${status.color} shadow-sm`}>
                {status.text}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Info */}
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold mb-2">{productName}</h1>
          <p className="text-gray-600 mb-6">{description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <QrCode className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700">ID du Ticket</h3>
                    <p className="text-gray-900 font-semibold">{params.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <Award className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700">Référence</h3>
                    <p className="text-gray-900 font-semibold">{ticket.productCode || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700">Centre</h3>
                    <p className="text-gray-900 font-semibold">
                      {ticket.centerCode && ticket.centerCode !== '000000' 
                        ? ticket.centerCode 
                        : 'Non assigné'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700">Date limite</h3>
                    <p className={`text-gray-900 font-semibold ${isExpired(ticket.limitDate) ? 'text-red-600' : ''}`}>
                      {formatDate(ticket.limitDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2 mb-8">
            <h2 className="text-lg font-semibold">Détails additionnels</h2>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Prix</span>
              <span className="font-medium">{formatPrice(ticket.price)}</span>
            </div>
            
            {ticket.reservationDate && ticket.reservationDate !== '0' && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Date de réservation</span>
                <span className="font-medium">{formatDate(ticket.reservationDate)}</span>
              </div>
            )}
            
            {metadata && metadata.uri && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Metadata</span>
                <Link 
                  href={metadata.uri.startsWith('ipfs://') 
                    ? `https://ipfs.io/ipfs/${metadata.uri.substring(7)}`
                    : metadata.uri} 
                  target="_blank" 
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Voir les métadonnées
                  <ExternalLinkIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Propriétaire</span>
              <span className="font-mono text-xs truncate">
                {ticket.wallet ? 
                  `${ticket.wallet.substring(0, 8)}...${ticket.wallet.substring(ticket.wallet.length - 8)}` : 
                  'N/A'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="default" className="flex-1">
              <Link href={`/reserve/${params.id}`}>
                Réserver
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/transfer/${params.id}`}>
                Transférer
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}