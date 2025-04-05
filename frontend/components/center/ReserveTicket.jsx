'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Clock, Check } from 'lucide-react';
import { formatDate } from '@/utils/date';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Static data waiting supabase
const AVAILABLE_PRODUCTS = [
  {
    id: 0,
    code: 'P01T01',
    name: 'Parachutisme en tandem',
    price: '279',
    description: 'Saut en parachute tandem avec un instructeur à 4000m d\'altitude',
    duration: '30 minutes',
    location: 'Paris',
    minHeight: '150 cm',
    minAge: 18,
    restrictions: 'Poids max 100kg, pas de problèmes cardiaques'
  },
  {
    id: 1,
    code: 'P01T02',
    name: 'Saut à l\'élastique',
    price: '359',
    description: 'Saut à l\'élastique depuis une hauteur de 50 mètres',
    duration: '15 minutes',
    location: 'Paris',
    minHeight: '120 cm',
    minAge: 18,
    restrictions: 'Poids max 100kg, pas de problèmes cardiaques'
  },
  {
    id: 2,
    code: 'P01T03',
    name: 'Vol en soufflerie',
    price: '89',
    description: 'Expérience de vol en soufflerie simulant la chute libre',
    duration: '20 minutes',
    location: 'Paris',
    minHeight: '120 cm',
    minAge: 8,
    restrictions: 'Poids max 120kg, pas de blessures récentes au dos ou au cou'
  }
];

// Available time slots
const TIME_SLOTS = [
  { id: 1, time: '09:00' },
  { id: 2, time: '10:00' },
  { id: 3, time: '11:00' },
  { id: 4, time: '14:00' },
  { id: 5, time: '15:00' },
  { id: 6, time: '16:00' }
];

/**
 * Component to reserve a new ticket
 */
export default function ReserveTicket() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [date, setDate] = useState(null);
  const [timeSlot, setTimeSlot] = useState(null);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isReserving, setIsReserving] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [newTicketId, setNewTicketId] = useState(null);
  
  // Handle step change
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(1, prev - 1));
  
  // Handle product selection
  const selectProduct = (product) => {
    setSelectedProduct(product);
    nextStep();
  };
  
  // Check if a date and a time slot are selected
  const isDateTimeSelected = date && timeSlot;
  
  // Check if client information is complete
  const isClientInfoComplete = () => {
    return clientInfo.name.trim() !== '' && 
           clientInfo.email.trim() !== '' && 
           clientInfo.phone.trim() !== '';
  };
  
  // Handle input changes in the form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Confirm the date and the time slot
  const confirmDateTime = () => {
    if (isDateTimeSelected) {
      nextStep();
    }
  };
  
  // Perform the reservation
  const handleReservation = async () => {
    if (!selectedProduct || !date || !timeSlot || !isClientInfoComplete()) {
      return;
    }
    
    setIsReserving(true);
    
    // Simulate an API call
    setTimeout(() => {
      setIsReserving(false);
      setIsReserved(true);
      setNewTicketId(Math.floor(Math.random() * 1000)); // Fake ID for the MVP
    }, 1500);
  };
  
  // Return to the main page
  const goBack = () => {
    if (step > 1 && !isReserved) {
      prevStep();
    } else {
      router.push('/center');
    }
  };
  
  // Redirect to the ticket details
  const goToTicketDetails = () => {
    router.push(`/center/ticket/${newTicketId}`);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isReserved 
            ? 'Réservation confirmée' 
            : 'Nouvelle réservation'}
        </h1>
      </div>
      
      {/* Step indicator (except if reservation confirmed) */}
      {!isReserved && (
        <div className="flex items-center justify-center space-x-2 py-2">
          <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>
          <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
          <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
        </div>
      )}
      
      {/* Main content */}
      <div className="max-w-3xl mx-auto">
        {/* Step 1: Product selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Choisissez une activité</h2>
            <div className="grid grid-cols-1 gap-4">
              {AVAILABLE_PRODUCTS.map(product => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selectProduct(product)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative h-32 md:h-full bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={`/images/activities/${product.code}.png`}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    
                    <div className="md:col-span-2 p-4 md:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg">{product.name}</h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {product.price} €
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                          {product.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{product.duration}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Âge:</span>
                            <span>{product.minAge}+ ans</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button className="mt-4 md:self-end" variant="outline">
                        Sélectionner
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 2: Date and time slot selection */}
        {step === 2 && selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Choisissez une date et un créneau</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display the selected product */}
              <div className="flex items-center space-x-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                  <Image
                    src={`/images/activities/${selectedProduct.code}.png`}
                    alt={selectedProduct.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 48px, 64px"
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.price} €</p>
                </div>
              </div>
              
              <Separator />
              
              {/* Date selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block mb-2">Date</Label>
                  <div className="border rounded-md">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={[
                        { before: new Date() }, // Désactiver les dates passées
                        { dayOfWeek: [0, 6] } // Désactiver les week-ends pour le MVP
                      ]}
                      className="rounded-md"
                    />
                  </div>
                </div>
                
                {/* Time slot selector */}
                <div>
                  <Label className="block mb-2">Time slot</Label>
                  <div className={`space-y-2 ${!date ? 'opacity-50 pointer-events-none' : ''}`}>
                    <RadioGroup value={timeSlot} onValueChange={setTimeSlot}>
                      {TIME_SLOTS.map(slot => (
                        <div key={slot.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={slot.id.toString()} id={`slot-${slot.id}`} />
                          <Label htmlFor={`slot-${slot.id}`} className="cursor-pointer">
                            {slot.time}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {!date && (
                      <p className="text-sm text-muted-foreground italic">
                        Veuillez d'abord sélectionner une date
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Display the selection */}
              {isDateTimeSelected && (
                <Alert className="mt-4">
                  <Calendar className="h-4 w-4" />
                  <AlertTitle>Votre sélection</AlertTitle>
                  <AlertDescription>
                    Le {formatDate(date.getTime() / 1000)} à {TIME_SLOTS.find(s => s.id.toString() === timeSlot)?.time}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Retour
              </Button>
              <Button 
                onClick={confirmDateTime}
                disabled={!isDateTimeSelected}
              >
                Continuer
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Step 3: Client information and confirmation */}
        {step === 3 && selectedProduct && date && timeSlot && (
          <Card>
            <CardHeader>
              <CardTitle>Finaliser la réservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <h3 className="font-semibold">Summary</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="font-medium">Activité:</div>
                  <div>{selectedProduct.name}</div>
                  
                  <div className="font-medium">Prix:</div>
                  <div>{selectedProduct.price} €</div>
                  
                  <div className="font-medium">Date:</div>
                  <div>{formatDate(date.getTime() / 1000)}</div>
                  
                  <div className="font-medium">Heure:</div>
                  <div>{TIME_SLOTS.find(s => s.id.toString() === timeSlot)?.time}</div>
                </div>
              </div>
              
              <Separator />
              
              {/* Client form */}
              <div className="space-y-4">
                <h3 className="font-semibold">Client information</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      name="name"
                      value={clientInfo.name}
                      onChange={handleInputChange}
                      placeholder="Nom et prénom du client"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={clientInfo.email}
                      onChange={handleInputChange}
                      placeholder="adresse@example.com"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={clientInfo.phone}
                      onChange={handleInputChange}
                      placeholder="07 XX XX XX XX"
                    />
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  En confirmant cette réservation, vous engagez un ticket qui sera 
                  verrouillé pour cette activité et ce créneau. Le ticket pourra 
                  être annulé jusqu'à 24h avant la date réservée.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Retour
              </Button>
              <Button 
                onClick={handleReservation}
                disabled={!isClientInfoComplete() || isReserving}
              >
                {isReserving ? 'Traitement...' : 'Confirmer la réservation'}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Reservation confirmation */}
        {isReserved && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto my-4 bg-green-100 text-green-600 h-20 w-20 rounded-full flex items-center justify-center">
                <Check className="h-10 w-10" />
              </div>
              <CardTitle className="text-xl">Réservation confirmée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p>
                Félicitations ! Votre réservation pour {selectedProduct.name} a été confirmée.
              </p>
              
              <div className="bg-gray-50 rounded-md p-4 max-w-md mx-auto">
                <div className="text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="font-medium text-left">Numéro de ticket:</div>
                    <div className="text-right">#{newTicketId}</div>
                    
                    <div className="font-medium text-left">Date:</div>
                    <div className="text-right">{formatDate(date.getTime() / 1000)}</div>
                    
                    <div className="font-medium text-left">Heure:</div>
                    <div className="text-right">{TIME_SLOTS.find(s => s.id.toString() === timeSlot)?.time}</div>
                    
                    <div className="font-medium text-left">Client:</div>
                    <div className="text-right">{clientInfo.name}</div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Toutes les informations ont été enregistrées. Vous pouvez maintenant 
                accéder aux détails de ce ticket à tout moment depuis votre tableau de bord.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pt-2">
              <Button onClick={goToTicketDetails}>
                Voir les détails du ticket
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
} 