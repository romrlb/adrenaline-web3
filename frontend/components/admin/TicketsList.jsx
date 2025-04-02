'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ReloadIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TicketCard from './TicketCard';

/**
 * Component for displaying and managing the list of tickets
 * 
 * @param {Object} props - Component props
 * @param {Array} props.tickets - Array of ticket objects
 * @param {boolean} props.isLoading - Whether tickets are being loaded
 * @param {boolean} props.isError - Whether there was an error loading tickets
 * @param {Function} props.onRefresh - Function to call to refresh tickets
 * @param {Function} props.onTicketAction - Function to call when a ticket action is triggered
 * @param {number} props.pageSize - The size of the page
 * @param {Function} props.onPageSizeChange - Function to call when the page size changes
 */
export default function TicketsList({ 
  tickets = [],
  isLoading = false,
  isError = false,
  onRefresh,
  onTicketAction,
  pageSize = 10,
  onPageSizeChange
}) {
  const handleRefresh = () => {
    onRefresh();
    toast.success('Mise à jour des tickets...', {
      description: 'Cette opération peut prendre quelques secondes.',
      duration: 3000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Liste des tickets</CardTitle>
            <CardDescription>Affichage de {tickets.length} tickets trouvés</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-2 items-center">
              <Label htmlFor="ticketLimit" className="text-xs whitespace-nowrap">Tickets par page:</Label>
              <select 
                id="ticketLimit"
                className="p-2 text-xs border rounded-md bg-white" 
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4" />
                  Réessayer
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && tickets.length === 0 ? (
          <div className="py-8 text-center">
            <ReloadIcon className="inline-block h-8 w-8 animate-spin mb-4" />
            <p>Chargement des tickets...</p>
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-red-500 mb-4">Erreur lors du chargement des tickets</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <ReloadIcon className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500 mb-4">Aucun ticket trouvé</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <ReloadIcon className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">{tickets.length} ticket(s) trouvé(s)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {tickets.map((ticket) => (
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onAction={onTicketAction}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 