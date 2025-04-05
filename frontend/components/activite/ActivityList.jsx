'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SearchIcon } from 'lucide-react';
import ActivityCard from './ActivityCard';

// Données statiques pour le MVP basées sur les produits spécifiés
const MOCK_ACTIVITIES = [
  {
    id: 0,
    code: 'P01T01',
    name: 'Saut en parachute tandem',
    price: '279',
    image: 'activity-P01T01.png',
    description: 'Vivez l\'expérience unique d\'un saut en parachute accompagné d\'un instructeur professionnel à 4000m d\'altitude. Sensation de chute libre à 200km/h garantie.',
    duration: '30 minutes',
    location: 'Paris',
    minHeight: '150 cm',
    minAge: 18,
    restrictions: 'Poids max 100kg, pas de problèmes cardiaques',
    availableTickets: 5
  },
  {
    id: 1,
    code: 'P01T02',
    name: 'Saut en parachute tandem+vidéo',
    price: '359',
    image: 'activity-P01T02.png',
    description: 'Saut en parachute tandem avec service vidéo inclus. Immortalisez votre expérience avec une vidéo professionnelle de votre saut pour garder un souvenir mémorable.',
    duration: '30 minutes',
    location: 'Paris',
    minHeight: '150 cm',
    minAge: 18,
    restrictions: 'Poids max 100kg, pas de problèmes cardiaques',
    availableTickets: 3
  },
  {
    id: 2,
    code: 'P01T03',
    name: 'Saut en parachute tandem VIP',
    price: '429',
    image: 'activity-P01T03.png',
    description: 'Expérience premium incluant un traitement prioritaire, une altitude de saut plus élevée (4500m), une chute libre plus longue et un service photo/vidéo complet.',
    duration: '45 minutes',
    location: 'Paris',
    minHeight: '150 cm',
    minAge: 18,
    restrictions: 'Poids max 100kg, pas de problèmes cardiaques',
    availableTickets: 2
  }
];

/**
 * Composant pour afficher la liste des activités avec filtres
 */
export default function ActivityList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Extraire les lieux uniques pour le filtre
  const locations = [...new Set(MOCK_ACTIVITIES.map(a => a.location))];
  
  // Filtrer les activités selon les critères
  const filteredActivities = MOCK_ACTIVITIES.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = priceFilter === 'all' ? true :
                        priceFilter === 'low' ? parseInt(activity.price) < 300 :
                        priceFilter === 'medium' ? parseInt(activity.price) >= 300 && parseInt(activity.price) < 400 :
                        parseInt(activity.price) >= 400;
    
    const matchesLocation = locationFilter === 'all' || activity.location === locationFilter;
    
    return matchesSearch && matchesPrice && matchesLocation;
  });
  
  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une activité..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-40">
            <Label htmlFor="price-filter" className="sr-only">Filtrer par prix</Label>
            <Select
              value={priceFilter}
              onValueChange={setPriceFilter}
            >
              <SelectTrigger id="price-filter" className="w-full">
                <SelectValue placeholder="Prix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les prix</SelectItem>
                <SelectItem value="low">Moins de 300€</SelectItem>
                <SelectItem value="medium">300€ à 400€</SelectItem>
                <SelectItem value="high">Plus de 400€</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-40">
            <Label htmlFor="location-filter" className="sr-only">Filtrer par lieu</Label>
            <Select
              value={locationFilter}
              onValueChange={setLocationFilter}
            >
              <SelectTrigger id="location-filter" className="w-full">
                <SelectValue placeholder="Lieu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les lieux</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Résultats */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun résultat ne correspond à votre recherche.</p>
          <p className="text-sm">Essayez de modifier vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
} 