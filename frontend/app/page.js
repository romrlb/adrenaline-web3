'use client';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const NotConnected = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6">Plateforme de saut en parachute</h1>
      <p className="text-xl mb-8">Connectez votre portefeuille pour accéder à l'application</p>
      <ConnectButton />
    </div>
  );
};

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="container mx-auto px-4 py-8">
      {!isConnected ? (
        <NotConnected />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-3xl font-bold mb-6">Bienvenue sur Adrenaline Web3</h1>
          <p className="text-xl mb-8">Plateforme de gestion de tickets NFT pour activités extrêmes</p>
          <div className="flex gap-4">
            <Link href="/admin">
              <Button variant="outline">Administration</Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
