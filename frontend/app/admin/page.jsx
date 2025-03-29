"use client";

import { useAccount } from 'wagmi';
import TicketAdmin from '@/components/admin/TicketAdmin';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-xl mx-auto">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
          <p className="mb-6 text-gray-700">
            Vous devez être connecté à votre portefeuille pour accéder à l&apos;administration.
          </p>
          <Link href="/">
            <Button>Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <TicketAdmin />;
} 