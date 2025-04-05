'use client';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCheck, Building } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const { isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const getNavLinkClasses = (path) => {
    const baseClasses = "block py-2 px-3 transition-colors";
    return pathname === path 
      ? `${baseClasses} text-primary font-medium` 
      : `${baseClasses} text-gray-600 hover:text-primary`;
  };

  return (
    <header className="border-b fixed top-0 left-0 right-0 bg-white z-10">
      <div className="container mx-auto">
        <div className="flex h-16 justify-between items-center px-4 md:px-6">
          <div className="flex items-center space-x-6">
            <Link href="/" className="relative h-12 w-16">
              <Image
                src="/images/logo.png"
                alt="Adrenaline NFT"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 48px, 64px"
                priority
              />
            </Link>

            <div className="hidden md:block">
              <nav className="flex items-center space-x-6">
                <Link href="/activities" className={getNavLinkClasses('/activities')}>
                  Activités
                </Link>
                {/* <Link href="/center" className={getNavLinkClasses('/center')}>
                  Espace Centre
                </Link> */}
                <Link href="/tickets" className={getNavLinkClasses('/tickets')}>
                  Mes Tickets
                </Link>
              </nav>
            </div>
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

          {/* Mobile Menu Button */}
          <button onClick={toggleMobileMenu} className="md:hidden p-2 focus:outline-none">
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-2 pt-2 pb-4 bg-white border-t">
          <nav className="grid gap-1">
                <Link href="/activities" className={getNavLinkClasses('/activities')}>
                  Activités
                </Link>
                <Link href="/admin" className={getNavLinkClasses('/admin')}>
                  Admin
                </Link>
                {/* <Link href="/center" className={getNavLinkClasses('/center')}>
                  Espace Centre
                </Link> */}
                <Link href="/tickets" className={getNavLinkClasses('/tickets')}>
                  Mes Tickets
                </Link>
          </nav>
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
      )}
    </header>
  );
};

export default Header;

