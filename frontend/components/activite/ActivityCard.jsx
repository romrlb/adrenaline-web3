'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Composant pour afficher une carte d'activité
 */
export default function ActivityCard({ activity }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={`/images/activities/activity-${activity.code}.png`}
          alt={activity.name}
          fill
          className="object-cover transition-transform hover:scale-105 duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 right-2">
          <Badge className="bg-red-600 text-white text-lg font-bold px-4 py-2">
            {activity.price} €
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{activity.name}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {activity.description}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 mt-auto">
        <Link href={`/activities/${activity.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            Détails
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 