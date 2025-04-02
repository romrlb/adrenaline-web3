'use client';

import { Button } from '@/components/ui/button';
import { ReloadIcon, StarIcon } from '@radix-ui/react-icons';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Dialog component for changing a ticket to collector status
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Object} props.ticket - The ticket to change to collector status
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {Function} props.onUse - Function to call when use is confirmed
 * @param {boolean} props.isLoading - Whether use action is in progress
 */
export default function UseTicketDialog({ isOpen, ticket, onClose, onUse, isLoading }) {
  const handleSubmit = () => {
    if (!ticket || ticket.id === undefined) return;
    onUse(ticket.id);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Changer en Collector #{ticket?.id}</DialogTitle>
        <DialogDescription>
          Changer le statut du ticket en statut Collector. Cette action est irréversible.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <p className="text-sm text-gray-500">
          Êtes-vous sûr de vouloir changer le statut de ce ticket en statut Collector ? Cette opération est irréversible.
        </p>
        {ticket && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100">
            <div className="grid grid-cols-2 gap-1 text-sm">
              <div className="text-gray-500">Product code:</div>
              <div className="font-medium">{ticket.productCode}</div>
              <div className="text-gray-500">Center:</div>
              <div className="font-medium">{ticket.centerCode}</div>
              <div className="text-gray-500">Price:</div>
              <div className="font-medium">{ticket.priceFormatted} EUR</div>
            </div>
          </div>
        )}
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
              En cours...
            </>
          ) : (
            <>
              <StarIcon className="mr-2 h-4 w-4" />
              Changer en Collector
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