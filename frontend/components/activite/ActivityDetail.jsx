'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Données statiques pour le MVP basées sur les produits spécifiés
const getMockActivity = (id) => {
  const activities = [
    {
      id: 0,
      code: 'P01T01',
      name: 'Saut en parachute tandem',
      price: '279',
      image: 'activity-P01T01.png',
      description: 'Vivez l\'expérience unique d\'un saut en parachute accompagné d\'un instructeur professionnel à 4000m d\'altitude.',
      longDescription: `Le saut en parachute tandem est l'expérience parfaite pour découvrir les sensations de la chute libre en toute sécurité. 
      
      Accompagné d'un instructeur professionnel, vous décollerez à bord d'un avion jusqu'à 4000 mètres d'altitude. Après une courte préparation, vous vous élancerez dans le vide pour une chute libre d'environ 50 secondes à 200 km/h, suivie d'un vol sous voile d'environ 5 minutes.
      
      Cette activité ne nécessite aucune expérience préalable, simplement une bonne condition physique.`,
    },
    {
      id: 1,
      code: 'P01T02',
      name: 'Saut en parachute tandem+vidéo',
      price: '359',
      image: 'activity-P01T02.png',
      description: 'Saut en parachute tandem avec service vidéo inclus. Immortalisez votre expérience avec une vidéo professionnelle.',
      longDescription: `Le saut en parachute tandem avec option vidéo incluse vous offre l'expérience ultime de la chute libre, avec en plus un souvenir mémorable à partager.
      
      Notre moniteur est équipé d'une caméra GoPro fixée sur son casque qui filmera l'intégralité de votre saut, de la préparation à l'atterrissage. Vous recevrez une vidéo montée et éditée de votre expérience que vous pourrez partager avec vos proches ou sur les réseaux sociaux.
      
      Comme pour le saut tandem standard, vous serez accompagné d'un instructeur professionnel qui s'occupera de tous les aspects techniques pendant que vous profitez pleinement de l'expérience.`,
      availableTickets: 3
    },
    {
      id: 2,
      code: 'P01T03',
      name: 'Saut en parachute tandem VIP',
      price: '429',
      image: 'activity-P01T03.png',
      description: 'Expérience premium incluant un traitement prioritaire, une altitude de saut plus élevée et un service photo/vidéo complet.',
      longDescription: `L'expérience VIP est notre offre premium pour ceux qui recherchent le summum du saut en parachute tandem.
      
      Ce forfait exclusif comprend:
      • Une prise en charge prioritaire sans temps d'attente
      • Un saut depuis une altitude supérieure (4500m au lieu de 4000m)
      • Une durée de chute libre prolongée (environ 60 secondes)
      • Un service photo ET vidéo complet avec des prises de vue multiples
      • Une clé USB personnalisée contenant toutes vos photos et vidéos
      • Un certificat de saut signé par votre instructeur
      
      Nos instructeurs VIP comptent parmi les plus expérimentés de notre équipe et sont spécialement formés pour rendre votre expérience inoubliable. Ce forfait est idéal pour les occasions spéciales comme les anniversaires ou pour simplement vivre l'expérience ultime du parachutisme.`,
    }
  ];
  
  return activities.find(a => a.id === parseInt(id)) || activities[0];
};

// Fonction pour appeler l'API d'achat de ticket
async function purchaseTicket(activityCode, walletAddress) {
  try {
    // Pour le développement et test local, utiliser la simulation
    if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
      console.log(`Simulation: Achat du ticket ${activityCode} pour le wallet ${walletAddress}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const tokenId = Math.floor(Math.random() * 1000);
      return { 
        success: true, 
        ticketId: tokenId,
        txHash: '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      };
    }
    
    // Appel direct à l'Edge Function Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-ticket`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        productCode: activityCode, 
        walletAddress: walletAddress
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l\'achat du ticket');
    }
    
    const data = await response.json();
    return { success: true, ticketId: data.tokenId, txHash: data.txHash };
  } catch (error) {
    console.error('Erreur lors de l\'achat:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Composant pour afficher les détails d'une activité
 */
export default function ActivityDetail({ activityId }) {
  const router = useRouter();
  const [activity] = useState(getMockActivity(activityId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const { address } = useAccount();
  
  // Retourner à la liste des activités
  const goBack = () => {
    router.push('/activities');
  };
  
  // Ouvrir la boîte de dialogue de confirmation d'achat
  const openConfirmationDialog = () => {
    if (!address) {
      toast.error('Veuillez connecter votre wallet pour acheter un ticket');
      return;
    }
    setDialogOpen(true);
  };
  
  // Gérer l'achat du ticket
  const handlePurchase = async () => {
    setIsProcessing(true);
    
    try {
      // Appeler la fonction qui interagit avec l'API
      const result = await purchaseTicket(activity.code, address);
      
      if (result.success) {
        setIsPurchased(true);
        setTicketId(result.ticketId);
        toast.success('Ticket acheté avec succès!');
      } else {
        toast.error(result.error || 'Erreur lors de l\'achat');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'achat: ' + error.message);
    } finally {
      setIsProcessing(false);
      setDialogOpen(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{activity.name}</h1>
      </div>
      
      {/* Informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne 1: Image et détails basiques */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={`/images/activities/${activity.image}`}
              alt={activity.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
            <div className="absolute top-4 right-4">
              <Badge className="text-lg px-4 py-2 bg-red-600 text-white font-bold">
                {activity.price} €
              </Badge>
            </div>
          </div>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mt-4">Description</h2>
            <div className="whitespace-pre-line">
              {activity.longDescription}
            </div>
          </div>
        </div>
        
        {/* Colonne 2: Infos d'achat */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acheter cette activité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Achetez ce ticket maintenant et réservez une date ultérieurement auprès d'un centre partenaire.
              </p>
              
              <Separator />
              
              {isPurchased ? (
                <div className="bg-green-50 p-4 rounded-md text-center space-y-2">
                  <div className="mx-auto bg-green-100 text-green-600 h-10 w-10 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-green-800">Achat confirmé</h3>
                  <p className="text-sm text-green-700">
                    Votre ticket #{ticketId} a été acheté avec succès.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push(`/tickets/${ticketId}`)}
                  >
                    Voir mon ticket
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={openConfirmationDialog}>
                  Acheter maintenant
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Boîte de dialogue de confirmation d'achat */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer votre achat</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'acheter un ticket pour {activity.name} au prix de {activity.price}€.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Une fois votre achat effectué, vous pourrez réserver une date auprès d'un centre partenaire. 
              Le ticket sera valable pour une durée de 18 mois à partir de la date d'achat.
            </p>
            
            <div className="mt-2 p-2 bg-slate-100 rounded">
              <p className="text-xs text-slate-500">Wallet connecté: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Non connecté'}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handlePurchase}
              disabled={isProcessing || !address}
            >
              {isProcessing ? 'Traitement en cours...' : 'Confirmer l\'achat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 