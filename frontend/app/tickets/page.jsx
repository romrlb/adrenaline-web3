'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatTicketStatus } from '@/lib/contractService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWalletClient } from 'wagmi';

const getStatusColor = (status) => {
  const statusMap = {
    AVAILABLE: 'bg-green-100 text-green-800',
    LOCKED: 'bg-blue-100 text-blue-800',
    USED: 'bg-gray-100 text-gray-800',
  };
  
  return statusMap[status] || 'bg-yellow-100 text-yellow-800';
};

/**
 * Pour le MVP, nous utilisons des données statiques
 */
const getMockTickets = () => {
  return [
    {
      id: 1,
      tokenId: 1,
      name: 'Saut en parachute tandem',
      activityCode: 'P01T01',
      price: '279',
      image: 'activity-P01T01.png',
      purchaseDate: '12/04/2023',
      status: 'Disponible',
    },
    {
      id: 2,
      tokenId: 2,
      name: 'Saut en parachute tandem+vidéo',
      activityCode: 'P01T02',
      price: '359',
      image: 'activity-P01T02.png',
      purchaseDate: '15/04/2023',
      status: 'Verrouillé',
    },
    {
      id: 3,
      tokenId: 3,
      name: 'Saut en parachute tandem VIP',
      activityCode: 'P01T03',
      price: '429',
      image: 'activity-P01T03.png',
      purchaseDate: '20/04/2023',
      status: 'Collector',
    }
  ];
};

export default function TicketsPage() {
  const { data: wallet } = useWalletClient();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simuler un chargement asynchrone
  useEffect(() => {
    const timer = setTimeout(() => {
      setTickets(getMockTickets());
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!wallet) {
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
  
  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="bg-gray-100 p-4 rounded-b-lg space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </div>
          ))}
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
      <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="overflow-hidden flex flex-col">
            <div className="relative h-48">
              <Image
                src={`/images/activities/${ticket.image}`}
                alt={ticket.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute top-2 right-2">
                <Badge className={`px-2 py-1 ${getStatusColor(ticket.status)}`}>
                  {formatTicketStatus(ticket.status)}
                </Badge>
              </div>
            </div>
            
            <CardContent className="flex-grow pt-6">
              <h2 className="font-bold text-lg">{ticket.name}</h2>
              <p className="text-sm text-gray-500">Code: {ticket.activityCode}</p>
              <p className="text-sm text-gray-500">Acheté le: {ticket.purchaseDate}</p>
            </CardContent>
            
            <CardFooter className="pt-0 pb-6">
              <Button asChild className="w-full">
                <Link href={`/tickets/${ticket.id}`}>
                  Voir les détails
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 