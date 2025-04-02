'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReloadIcon, LockOpen2Icon } from '@radix-ui/react-icons';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Dialog component for unlocking a ticket
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Object} props.ticket - The ticket to unlock
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {Function} props.onUnlock - Function to call when unlock is confirmed
 * @param {boolean} props.isLoading - Whether unlock action is in progress
 */
export default function UnlockTicketDialog({ isOpen, ticket, onClose, onUnlock, isLoading }) {
  const [centerCode, setCenterCode] = useState('');

  // Set initial center code from ticket when dialog opens
  useEffect(() => {
    if (ticket && isOpen) {
      setCenterCode(ticket.centerCode || '');
    }
  }, [ticket, isOpen]);

  const handleSubmit = () => {
    if (!ticket) return;
    
    if (!centerCode) {
      toast.error('Center code is required');
      return;
    }
    
    onUnlock(ticket.id, centerCode);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Déverrouiller le ticket #{ticket?.id}</DialogTitle>
        <DialogDescription>
          Déverrouillez le ticket pour le rendre disponible à nouveau.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="unlockCenterCode">Code centre</Label>
          <Input
            id="unlockCenterCode"
            value={centerCode}
            onChange={(e) => setCenterCode(e.target.value)}
            placeholder="000001"
          />
          <p className="text-sm text-gray-500">
            Entrez le code du centre qui libère ce ticket.
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
              Déverrouillage...
            </>
          ) : (
            <>
              <LockOpen2Icon className="mr-2 h-4 w-4" />
              Déverrouiller
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