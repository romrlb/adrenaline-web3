'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReloadIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Dialog component for locking a ticket
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Object} props.ticket - The ticket to lock
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {Function} props.onLock - Function to call when lock is confirmed
 * @param {boolean} props.isLoading - Whether lock action is in progress
 */
export default function LockTicketDialog({ isOpen, ticket, onClose, onLock, isLoading }) {
  const [centerCode, setCenterCode] = useState('');
  const [reservationDate, setReservationDate] = useState('');

  // Set initial center code from ticket when dialog opens
  useEffect(() => {
    if (ticket && isOpen) {
      setCenterCode(ticket.centerCode || '');
      // Initialiser la date de réservation avec la date actuelle
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      setReservationDate(today.toISOString().slice(0, 16)); // Format: YYYY-MM-DDTHH:MM
    }
  }, [ticket, isOpen]);

  const handleSubmit = () => {
    if (!ticket) return;
    
    if (!centerCode) {
      toast.error('Le code centre est requis');
      return;
    }

    try {
      // Convertir la date en timestamp Unix (secondes depuis l'epoch)
      const timestamp = reservationDate 
        ? Math.floor(new Date(reservationDate).getTime() / 1000) 
        : 0; // 0 pour utiliser le timestamp actuel
      
      onLock(ticket.id, centerCode, timestamp);
    } catch (error) {
      toast.error('Format de date invalide');
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Lock Ticket #{ticket?.id}</DialogTitle>
        <DialogDescription>
          Verrouillez le ticket en lui assignant à un centre spécifique.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="lockCenterCode">Code centre</Label>
          <Input
            id="lockCenterCode"
            value={centerCode}
            onChange={(e) => setCenterCode(e.target.value)}
            placeholder="000001"
          />
          <p className="text-sm text-gray-500">
            Entrez le code du centre qui réserve ce ticket.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reservationDate">Date de réservation</Label>
          <Input
            id="reservationDate"
            type="datetime-local"
            value={reservationDate}
            onChange={(e) => setReservationDate(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Définissez la date et l'heure de réservation. Laissez vide pour utiliser la date actuelle.
          </p>
        </div>
      </div>
      <DialogFooter className="sm:justify-start">
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isLoading || !centerCode}
        >
          {isLoading ? (
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
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
      </DialogFooter>
    </DialogContent>
  );
} 