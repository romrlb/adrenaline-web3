'use client';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const Header = () => {
  const { isConnected } = useAccount();

  return (
    <header className="py-2 sm:py-4 mb-4 sm:mb-8 border-b">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <div className="relative h-12 sm:h-16 w-12 sm:w-16">
                <Image 
                  src="/images/logo.png" 
                  alt="Adrenaline App Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold">Adrenaline Web3</h1>
            
            <nav className="hidden md:flex items-center ml-8 gap-6">
              <Link href="/activities" className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60">
                Liste des activités
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            {isConnected && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Administration
                </Button>
              </Link>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
