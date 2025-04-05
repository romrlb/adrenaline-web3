'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Ticket, PlusCircle, ArrowRight } from 'lucide-react';
import TicketList from './TicketList';
import Link from 'next/link';

/**
 * Main component of the center dashboard
 */
export default function MainPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const centerData = {
    name: 'Centre Adrenaline Paris',
    code: '000001',
    tickets: {
      reserved: 2,
      upcoming: 1,
      expired: 0
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header of the dashboard */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{centerData.name}</h1>
          <p className="text-muted-foreground">Code centre: {centerData.code}</p>
        </div>
        <Link href="/center/reserve">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Réserver un ticket
          </Button>
        </Link>
      </div>
      
      {/* Main tabs */}    
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets réservés</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centerData.tickets.reserved}</div>
                <p className="text-xs text-muted-foreground">
                  Tous les tickets actuellement réservés
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Réservations à venir</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centerData.tickets.upcoming}</div>
                <p className="text-xs text-muted-foreground">
                  Tickets avec dates dans les 48h
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Réservations expirées</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centerData.tickets.expired}</div>
                <p className="text-xs text-muted-foreground">
                  Réservations non utilisées et expirées
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Preview of recent tickets */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent reservations</CardTitle>
              <CardDescription>
                Aperçu des derniers tickets réservés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketList />
            </CardContent>
            <div className="p-4 pt-0 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('tickets')}>
                Voir tous les tickets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tickets tab */}
        <TabsContent value="tickets">
          <TicketList />
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du centre</CardTitle>
              <CardDescription>
                Gérez les informations et les préférences de votre centre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Cette section sera implémentée dans une version future.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 