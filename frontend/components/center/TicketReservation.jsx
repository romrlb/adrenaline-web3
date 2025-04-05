'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Liste de centres pour le MVP
const CENTERS = [
  { code: '000001', name: 'Centre Parachutisme Paris-Nevers' },
  { code: '000002', name: 'Ciel d\'Aventures' }
];

/**
 * Composant pour réserver un ticket (formulaire de lock)
 * 
 * @param {Object} props
 * @param {Object} props.ticket - Ticket à réserver
 * @param {Function} props.onSubmit - Fonction appelée lors de la soumission du formulaire
 * @param {boolean} props.isLoading - Indique si une opération est en cours
 */
export default function TicketReservation({ ticket, onSubmit, isLoading }) {
  const [centerCode, setCenterCode] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  
  // Initialiser la date de réservation à la date actuelle
  useEffect(() => {
    if (ticket) {
      setCenterCode(ticket.centerCode || '');
      
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      setReservationDate(today.toISOString().slice(0, 16)); // Format: YYYY-MM-DDTHH:MM
    }
  }, [ticket]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!centerCode) {
      toast.error('Veuillez sélectionner un centre');
      return;
    }
    
    try {
      // Convertir la date en timestamp Unix (secondes)
      const timestamp = reservationDate 
        ? Math.floor(new Date(reservationDate).getTime() / 1000) 
        : 0;
      
      onSubmit({
        ticketId: ticket.id,
        centerCode,
        reservationDate: timestamp
      });
    } catch (error) {
      toast.error('Format de date invalide');
    }
  };
  
  if (!ticket) {
    return null;
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Réserver le ticket #{ticket.id}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="centerCode">Centre</Label>
            <Select
              value={centerCode}
              onValueChange={(value) => setCenterCode(value)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un centre" />
              </SelectTrigger>
              <SelectContent>
                {CENTERS.map((center) => (
                  <SelectItem key={center.code} value={center.code}>
                    {center.code} - {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Sélectionnez le centre qui réserve ce ticket.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reservationDate">Date de réservation</Label>
            <Input
              id="reservationDate"
              type="datetime-local"
              value={reservationDate}
              onChange={(e) => setReservationDate(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Définissez la date et l'heure de réservation de l'activité.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="border-t pt-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !centerCode || !reservationDate}
          >
            {isLoading ? 'Réservation en cours...' : 'Réserver le ticket'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 