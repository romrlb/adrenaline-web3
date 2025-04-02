'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReloadIcon, PlusIcon } from '@radix-ui/react-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseEther } from 'viem';

/**
 * Form component for creating a new ticket
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Function to call when form is submitted
 * @param {boolean} props.isLoading - Whether submission is in progress
 * @param {boolean} props.isConnected - Whether wallet is connected
 */
export default function CreateTicketForm({ onSubmit, isLoading, isConnected }) {
  const [formData, setFormData] = useState({
    centerCode: '',
    productCode: '',
    price: '',
    wallet: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { productCode, price, wallet } = formData;
    
    // Validation
    if (!productCode || !price || !wallet) {
      toast.error('Tous les champs sont requis');
      return;
    }
    
    // Validate wallet address format
    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      toast.error('Le wallet est invalide');
      return;
    }
    
    // Convert price to wei
    try {
      const priceInWei = parseEther(price.toString());
      onSubmit({
        ...formData,
        price: priceInWei
      });
      
      // Clear form after successful submission
      if (!isLoading) {
        setFormData({
          productCode: '',
          price: '',
          wallet: ''
        });
      }
    } catch (error) {
      toast.error('Le prix doit être un nombre valide');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un ticket</CardTitle>
        <CardDescription>Mint d'un nouveau ticket NFT</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Code produit</Label>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={handleChange}
                placeholder="P01T01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prix (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="10"
                value={formData.price}
                onChange={handleChange}
                placeholder="ex: 289"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet utilisateur</Label>
              <Input
                id="wallet"
                value={formData.wallet}
                onChange={handleChange}
                placeholder="0x..."
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isConnected}
          >
            {isLoading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <PlusIcon className="mr-2 h-4 w-4" />
                Créer un ticket
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 