// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Follow this setup guide to integrate the Deno standard library:
// https://deno.land/manual/examples/import_map
// This entrypoint file handles all requests to your Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@5.7.2";

// Definition of CORS headers 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log("Service de création de tickets NFT démarré!");

// Minimal ABI necessary to call the createTicket function
const CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "productCode", "type": "string" },
      { "name": "price", "type": "uint256" }
    ],
    "name": "createTicket",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "productCode",
        "type": "string"
      }
    ],
    "name": "TicketCreated",
    "type": "event"
  }
];

// Mapping of prices in EUR for each product code (as a string to be compatible with parseEther)
const PRODUCT_PRICES_EUR = {
  "P01T01": "279", // Tandem jump - 279€
  "P01T02": "359", // Tandem jump + video - 359€
  "P01T03": "429", // Tandem jump VIP - 429€
};

// Interface for the ticket purchase request
interface CreateTicketRequest {
  productCode: string;
  walletAddress: string;
}

// Main function to handle requests
serve(async (req) => {
  // Handle OPTIONS requests (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const contractAddress = Deno.env.get("CONTRACT_ADDRESS");
    const adminPrivateKey = Deno.env.get("ADMIN_PRIVATE_KEY");
    const rpcUrl = Deno.env.get("RPC_URL");

    // Check that all environment variables are defined
    if (!contractAddress || !adminPrivateKey || !rpcUrl) {
      console.error("Incomplete configuration:", {
        hasContractAddress: !!contractAddress,
        hasAdminPrivateKey: !!adminPrivateKey,
        hasRpcUrl: !!rpcUrl
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuration du serveur incomplète"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    // Extract data from the request
    const json = await req.json();
    const { productCode, walletAddress } = json as CreateTicketRequest;

    // Check parameters
    if (!productCode || !walletAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Les paramètres productCode et walletAddress sont requis"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // Check that the product code is valid
    if (!PRODUCT_PRICES_EUR[productCode]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Code produit inconnu"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // Test mode - simulate ticket creation without interacting with the blockchain
    if (Deno.env.get("SIMULATION_MODE") === "true") {
      console.log("Simulation mode activated");
      const tokenId = Math.floor(Math.random() * 1000);
      const txHash = "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      
      console.log(`[SIMULATION] Ticket ${tokenId} créé pour ${walletAddress}, produit ${productCode}`);

      return new Response(
        JSON.stringify({
          success: true,
          tokenId: tokenId.toString(),
          txHash: txHash,
          blockNumber: 12345678,
          simulated: true,
          price: parseInt(PRODUCT_PRICES_EUR[productCode])
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.log(`Création d'un ticket sur la blockchain - Produit: ${productCode}, Destinataire: ${walletAddress}`);

    // Connect to the Ethereum network
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Create a wallet from the private key to sign transactions
    const wallet = new ethers.Wallet(adminPrivateKey, provider);
    
    // Create an instance of the contract
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
    
    // Ticket price in wei for the blockchain (as in the frontend)
    const priceWei = ethers.utils.parseEther(PRODUCT_PRICES_EUR[productCode]);
    
    console.log(`Prix du ticket: ${PRODUCT_PRICES_EUR[productCode]} EUR (${ethers.utils.formatEther(priceWei)} ETH)`);
    
    try {
      // Call the createTicket function of the contract with the price in wei
      const tx = await contract.createTicket(walletAddress, productCode, priceWei);
      console.log(`Transaction submitted: ${tx.hash}`);
      
      // Wait for the transaction to be confirmed
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Get the token ID from the TicketCreated event logs
      const ticketCreatedEvent = receipt.events?.find(event => event.event === 'TicketCreated');
      const tokenId = ticketCreatedEvent?.args?.tokenId?.toString() || '';
      
      if (!tokenId) {
        throw new Error("Impossible de récupérer l'ID du ticket créé");
      }
      
      console.log(`Ticket NFT créé avec succès! ID: ${tokenId}`);
      
      // Return the transaction details
      return new Response(
        JSON.stringify({
          success: true,
          tokenId: tokenId,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          price: parseInt(PRODUCT_PRICES_EUR[productCode]) // Renvoyer le prix en EUR sous forme de nombre
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    } catch (txError) {
      console.error("Erreur lors de la transaction:", txError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur lors de la création du ticket: ${txError.message}`
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }
  } catch (error) {
    console.error("Erreur globale:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Une erreur inconnue s'est produite"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

/* To test locally:

  1. Run `supabase start` (https://supabase.com/docs/reference/cli/supabase-start)
  2. Configure the environment variables:
     - supabase secrets set CONTRACT_ADDRESS=0x...
     - supabase secrets set ADMIN_PRIVATE_KEY=0x...
     - supabase secrets set RPC_URL=https://...
  3. Make an HTTP request:
     curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/createticket' \
       --header 'Content-Type: application/json' \
       --data '{"productCode":"P01T01","walletAddress":"0x123..."}'
*/ 