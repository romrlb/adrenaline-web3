'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { formatTicketStatus } from '@/lib/contractService';
import { useTicket } from '@/hooks/useBlockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Calendar, MapPin, AlertTriangle } from 'lucide-react';

const getStatusColor = (status) => {
  const statusMap = {
    AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
    LOCKED: 'bg-blue-100 text-blue-800 border-blue-200',
    USED: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  return statusMap[status] || 'bg-yellow-100 text-yellow-800 border-yellow-200';
};

/**
 * Pour le MVP, nous utilisons des données statiques
 */
const getMockTicket = (id) => {
  return {
    id: parseInt(id),
    tokenId: parseInt(id),
    name: 'Saut en parachute tandem',
    activityCode: 'P01T01',
    price: '279',
    image: 'activity-P01T01.png',
    purchaseDate: '12/04/2023',
    status: 'AVAILABLE',
    expiryDate: '12/04/2024',
    qrData: `ticket-${id}-verification-code-${Math.random().toString(36).substring(2, 10)}`,
  };
};

export default function TicketDetail({ ticketId }) {
  const router = useRouter();
  
  // Pour le MVP, nous utilisons des données statiques
  // Dans une version réelle, nous utiliserions useTicket(ticketId)
  const [ticket, setTicket] = useState(null);
  
  // Simuler un chargement asynchrone
  useEffect(() => {
    const timer = setTimeout(() => {
      setTicket(getMockTicket(ticketId));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [ticketId]);
  
  // Retourner à la liste des tickets
  const goBack = () => {
    router.push('/tickets');
  };
  
  if (!ticket) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Détails du Ticket #{ticket.id}</h1>
      </div>
      
      <Card className="overflow-hidden">
        <div className="relative h-40">
          <Image
            src={`/images/activities/${ticket.image}`}
            alt={ticket.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl font-bold">{ticket.name}</h2>
            <p className="text-sm opacity-90">Code: {ticket.activityCode}</p>
          </div>
        </div>
        
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Statut</h3>
              <Badge 
                variant="outline" 
                className={`mt-1 px-3 py-1 ${getStatusColor(ticket.status)}`}
              >
                Disponible
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Prix</h3>
              <p className="mt-1 font-semibold">{ticket.price} €</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium">Date d'achat</h4>
                  <p className="text-sm">{ticket.purchaseDate}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-4 w-4 mt-0.5 mr-2 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium">Date d'expiration</h4>
                  <p className="text-sm">{ticket.expiryDate}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Comment utiliser ce ticket</h3>
              <ol className="text-sm space-y-2 text-gray-600 list-decimal list-inside">
                <li>Contactez un centre partenaire pour réserver une date</li>
                <li>Présentez ce QR code lors de votre arrivée</li>
                <li>Le personnel validera votre ticket</li>
              </ol>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <div className="p-4 bg-white border rounded-lg">
              <QRCodeSVG 
                value={ticket.qrData} 
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-2 text-xs text-center text-gray-500">
              Ce QR code contient les informations de validation de votre ticket
            </p>
            {ticket.status === 'AVAILABLE' && (
              <Button className="mt-4 w-full">
                Réserver une date
              </Button>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 px-6 py-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>
              Ce ticket est valable 18 mois à partir de la date d'achat. Non remboursable.
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 