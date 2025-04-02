'use client';

import { useState } from 'react';
import { useTicketMetadata } from '@/hooks/useBlockchain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LockClosedIcon, LockOpen2Icon, StarIcon, ReloadIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import Image from 'next/image';

// Utility function to get status information
const getStatusInfo = (status) => {
  const statusMap = {
    0: { text: 'Disponible', color: 'bg-green-100 text-green-800 border-green-200' },
    1: { text: 'Verrouillé', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    2: { text: 'En vente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    3: { text: 'Collector', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    4: { text: 'Expiré', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
};

/**
 * Component for displaying an individual ticket card
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ticket - The ticket data to display
 * @param {Function} props.onAction - Function to call when an action button is clicked
 */
export default function TicketCard({ ticket, onAction }) {

  const [imageError, setImageError] = useState(false);
    const { data: metadata, isLoading: isLoadingMetadata, error: metadataError } = useTicketMetadata(ticket.id);
  const status = getStatusInfo(Number(ticket.status));

  const getImageSource = () => {
    if (metadata?.image && !imageError) {
      return metadata.image;
    }

    return '/images/ticket-default.png';
  };

  const handleImageError = () => {
    console.warn(`Failed to load image for ticket #${ticket.id}`);
    setImageError(true);
  };
  
  return (
    <Card className="overflow-hidden border-2 border-gray-400 hover:border-gray-600 shadow-sm hover:shadow flex flex-col">
      {/* Image at the top of the card with a fixed square size */}
      <div className="relative w-full aspect-square bg-gray-100">
        {isLoadingMetadata ? (
          <div className="flex items-center justify-center h-full w-full">
            <ReloadIcon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Image 
            src={getImageSource()}
            alt={metadata?.name || `Ticket #${ticket.id} - ${ticket.productCode}`}
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
        
        {/* Status badge overlaid on the image */}
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
            <CardDescription>Code produit: {ticket.productCode}</CardDescription>
          </div>
        </div>
        
        {/* Metadata title and description */}
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
            <span className="font-medium">{ticket.centerCode || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Prix:</span>
            <span className="font-medium">{ticket.priceFormatted} EUR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Propriétaire:</span>
            <span className="font-mono text-xs truncate max-w-[140px]">
              {ticket.wallet ? 
                `${ticket.wallet.substring(0, 6)}...${ticket.wallet.substring(ticket.wallet.length - 4)}` : 
                'N/A'}
            </span>
          </div>
          
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
      
      <CardFooter className="flex justify-end gap-1 pt-0 mt-auto border-t border-gray-100 bg-gray-50">
        {Number(ticket.status) === 0 && ( // Available
          <Button size="icon" variant="ghost" title="Lock" onClick={() => onAction('lock', ticket)}>
            <LockClosedIcon className="h-4 w-4" />
          </Button>
        )}
        {Number(ticket.status) === 1 && ( // Locked
          <>
            <Button size="icon" variant="ghost" title="Unlock" onClick={() => onAction('unlock', ticket)}>
              <LockOpen2Icon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title="Use (change to collector)" onClick={() => onAction('use', ticket)}>
              <StarIcon className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
} 