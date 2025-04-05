'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  const handleSubmit = () => {
    if (!ticket) return;
    onUnlock(ticket.id);
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
          <p className="text-sm text-gray-500">
            Le ticket est actuellement verrouillé par le centre {ticket?.centerCode || 'Unknown'}. 
            Voulez-vous vraiment le déverrouiller ?
          </p>
        </div>
      </div>
      <DialogFooter className="sm:justify-start">
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isLoading}
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