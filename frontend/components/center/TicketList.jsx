'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, isExpired, isDateSoon } from '@/utils/date';

// Static data waiting supabase
const MOCK_TICKETS = [
  {
    id: 0,
    productCode: 'P01T01',
    status: 1, // Locked
    centerCode: '000001',
    price: '279',
    reservationDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
    limitDate: Math.floor(Date.now() / 1000) + 30 * 86400, // 30 days from now
    wallet: '0x1234567890abcdef1234567890abcdef12345678'
  },
  {
    id: 1,
    productCode: 'P01T02',
    status: 1, // Locked
    centerCode: '000001',
    price: '359',
    reservationDate: Math.floor(Date.now() / 1000) + 3600, // In 1 hour
    limitDate: Math.floor(Date.now() / 1000) + 30 * 86400, // 30 days from now
    wallet: '0xabcdef1234567890abcdef1234567890abcdef12'
  }
];

// Mapping for ticket statuses
const getStatusInfo = (status) => {
  const statusMap = {
    0: { text: 'Available', color: 'bg-green-100 text-green-800 border-green-200' },
    1: { text: 'Verrouillé', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    2: { text: 'En vente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    3: { text: 'Collector', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    4: { text: 'Expiré', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
};

/**
 * Component to display the list of tickets reserved by the center
 */
export default function TicketList() {
  // Use static data for the MVP
  const [tickets] = useState(MOCK_TICKETS);

  // If no ticket reserved
  if (tickets.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucun ticket réservé par ce centre.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tickets réservés</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => {
          const status = getStatusInfo(ticket.status);
          const isDateExpired = isExpired(ticket.reservationDate);
          const isSoon = isDateSoon(ticket.reservationDate);
          
          return (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Ticket #{ticket.id}</CardTitle>
                  <Badge className={status.color}>{status.text}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pb-2 flex-grow">
                <div className="relative h-32 mb-4 bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={`/images/activities/${ticket.productCode}.png`}
                    alt={`Ticket ${ticket.id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Produit:</span>
                    <span>{ticket.productCode}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span className={`${isDateExpired ? 'text-red-600' : (isSoon ? 'text-orange-600' : '')}`}>
                      {formatDateTime(ticket.reservationDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 mt-auto border-t">
                <Link href={`/center/ticket/${ticket.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    Gérer ce ticket
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 