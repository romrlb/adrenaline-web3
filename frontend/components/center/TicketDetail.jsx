'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDateTime, isExpired, isDateSoon, timeFromNow, daysRemaining } from '@/utils/date';
import { AlertCircle, Calendar, ArrowLeft, Check, X, Info } from 'lucide-react';

// Static data waiting supabase
const getMockTicket = (id) => ({
  id: parseInt(id),
  productCode: id === "0" ? "P01T01" : "P01T02",
  status: 1, // Locked
  centerCode: '000001',
  price: id === "0" ? "279" : "359",
  reservationDate: Math.floor(Date.now() / 1000) + (id === "0" ? 86400 : 3600), // Tomorrow or in 1 hour
  limitDate: Math.floor(Date.now() / 1000) + 30 * 86400, // 30 days from now
  wallet: '0x1234567890abcdef1234567890abcdef12345678',
  product: {
    name: id === "0" ? "Parachutisme en tandem" : "Saut à l'élastique",
    description: id === "0" 
      ? "Saut en parachute tandem avec un instructeur à 4000m d'altitude"
      : "Saut à l'élastique depuis une hauteur de 50 mètres",
    duration: id === "0" ? "30 minutes" : "15 minutes",
    location: "Paris",
    minHeight: id === "0" ? "150 cm" : "120 cm",
    minAge: 18,
    restrictions: "Poids max 100kg, pas de problèmes cardiaques"
  }
});

// Mapping for ticket statuses
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
 * Component to display and manage the details of a specific ticket
 */
export default function TicketDetail({ ticketId }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(getMockTicket(ticketId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const status = getStatusInfo(ticket.status);
  const isDateExpired = isExpired(ticket.reservationDate);
  const isSoon = isDateSoon(ticket.reservationDate);
  const daysLeft = daysRemaining(ticket.limitDate);
  
  const openDialog = (action) => {
    setDialogAction(action);
    setDialogOpen(true);
  };
  
  const closeDialog = () => {
    setDialogOpen(false);
    setDialogAction(null);
  };
  
  // Handle the action on the ticket
  const handleAction = async () => {
    setProcessing(true);
    
    // Simulate a processing
    setTimeout(() => {
      if (dialogAction === 'use') {
        // Mark the ticket as used (in a real case, this would be a transition to the "Collector" state)
        setTicket(prev => ({ ...prev, status: 3 }));
      } else if (dialogAction === 'cancel') {
        // Cancel the reservation (in a real case, this would be a transition to the "Available" state)
        setTicket(prev => ({ ...prev, status: 0 }));
      }
      
      setProcessing(false);
      closeDialog();
    }, 1500);
  };
  
  // Return to the list of tickets
  const goBack = () => {
    router.push('/center');
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Détails du ticket #{ticket.id}</h1>
      </div>
      
      {/* Display the status and alert if necessary */}
      <div className="flex justify-between items-center">
        <Badge className={status.color + " text-sm py-1 px-3"}>
          {status.text}
        </Badge>
        
        {isDateExpired && (
          <Alert variant="destructive" className="w-full max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Date expirée</AlertTitle>
            <AlertDescription>
              La date de réservation est dépassée. Vous pouvez annuler cette réservation.
            </AlertDescription>
          </Alert>
        )}
        
        {isSoon && !isDateExpired && (
          <Alert className="w-full max-w-md">
            <Info className="h-4 w-4" />
            <AlertTitle>Réservation bientôt</AlertTitle>
            <AlertDescription>
              Cette activité est prévue prochainement ({timeFromNow(ticket.reservationDate)}).
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Main ticket information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Image and basic details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative h-48 bg-gray-100 rounded-md overflow-hidden">
              <Image
                src={`/images/activities/${ticket.productCode}.png`}
                alt={ticket.product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{ticket.product.name}</h3>
              <p className="text-sm text-muted-foreground">{ticket.product.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Prix:</div>
              <div>{ticket.price} €</div>
              
              <div className="font-medium">Produit:</div>
              <div>{ticket.productCode}</div>
              
              <div className="font-medium">Durée:</div>
              <div>{ticket.product.duration}</div>
              
              <div className="font-medium">Lieu:</div>
              <div>{ticket.product.location}</div>
            </div>
          </CardContent>
        </Card>
        
        {/* Column 2: Reservation details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Reservation information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Important dates */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Dates importantes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <div className="text-sm text-muted-foreground">Date de réservation</div>
                  <div className={`font-medium ${isDateExpired ? 'text-red-600' : (isSoon ? 'text-orange-600' : '')}`}>
                    {formatDateTime(ticket.reservationDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {timeFromNow(ticket.reservationDate)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Date limite d'utilisation</div>
                  <div className="font-medium">
                    {formatDateTime(ticket.limitDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {daysLeft} jours restants
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Restrictions and conditions */}
            <div className="space-y-2">
              <h3 className="font-semibold">Restrictions and conditions</h3>
              <div className="pl-6 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Âge minimum:</span> {ticket.product.minAge} ans
                </div>
                <div>
                  <span className="font-medium">Taille minimum:</span> {ticket.product.minHeight}
                </div>
                <div>
                  <span className="font-medium">Autres restrictions:</span> {ticket.product.restrictions}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Wallet information */}
            <div className="space-y-2">
              <h3 className="font-semibold">Blockchain information</h3>
              <div className="pl-6 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Wallet associé:</span>
                  <div className="font-mono text-xs overflow-hidden text-ellipsis">
                    {ticket.wallet}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Code centre:</span> {ticket.centerCode}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end">
            {/* Conditional actions based on the status */}
            {ticket.status === 1 && ( // Locked
              <>
                <Button variant="destructive" onClick={() => openDialog('cancel')}>
                  Annuler la réservation
                </Button>
                <Button onClick={() => openDialog('use')}>
                  Marquer comme utilisé
                </Button>
              </>
            )}
            
            {ticket.status === 3 && ( // Collector
              <Badge className="px-4 py-2">Ticket déjà utilisé</Badge>
            )}
            
            {ticket.status === 0 && ( // Available after cancellation
              <Badge className="px-4 py-2">Ticket released</Badge>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'use' ? 'Marquer comme utilisé' : 'Annuler la réservation'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'use'
                ? "Cette action confirmera que l'activité a été réalisée. Le ticket deviendra un NFT collector."
                : "Cette action annulera la réservation et libérera le ticket. Cette opération est irréversible."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center py-4">
            {dialogAction === 'use' ? (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              Annuler
            </Button>
            <Button 
              variant={dialogAction === 'use' ? 'default' : 'destructive'}
              onClick={handleAction} 
              disabled={processing}
            >
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 