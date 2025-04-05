'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Données statiques pour le MVP basées sur les produits spécifiés
const activities = [
  {
    id: 0,
    code: 'P01T01',
    name: 'Saut en parachute tandem',
    price: '279',
    image: 'activity-P01T01.png',
    description: 'Vivez l\'expérience unique d\'un saut en parachute accompagné d\'un instructeur professionnel à 4000m d\'altitude.',
  },
  {
    id: 1,
    code: 'P01T02',
    name: 'Saut en parachute tandem+vidéo',
    price: '359',
    image: 'activity-P01T02.png',
    description: 'Saut en parachute tandem avec service vidéo inclus. Immortalisez votre expérience avec une vidéo professionnelle.',
  },
  {
    id: 2,
    code: 'P01T03',
    name: 'Saut en parachute tandem VIP',
    price: '429',
    image: 'activity-P01T03.png',
    description: 'Expérience premium incluant un traitement prioritaire, une altitude de saut plus élevée et un service photo/vidéo complet.',
  }
];

export default function ActivitiesPage() {
  return (
    <div className="container mx-auto py-16 md:py-24">
      <h1 className="text-3xl font-bold mb-8 text-center">Nos activités</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <Card key={activity.id} className="overflow-hidden flex flex-col h-full">
            <div className="relative aspect-video">
              <Image
                src={`/images/activities/${activity.image}`}
                alt={activity.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute top-2 right-2">
                <Badge className="px-2 py-1 bg-red-600 text-white font-bold">
                  {activity.price} €
                </Badge>
              </div>
            </div>
            
            <CardHeader>
              <CardTitle>{activity.name}</CardTitle>
              <div className="text-xs text-gray-500">
                Code: {activity.code}
              </div>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <p className="text-sm text-gray-600">
                {activity.description}
              </p>
            </CardContent>
            
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/activities/${activity.id}`}>
                  Voir les détails
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 