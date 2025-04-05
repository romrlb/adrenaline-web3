// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Health check endpoint pour les Edge Functions Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Definition of CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

console.log("Hello from Functions!")

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get and mask sensitive environment variables
    const contractAddress = Deno.env.get("CONTRACT_ADDRESS") || "Not configured";
    const rpcUrl = Deno.env.get("RPC_URL") || "Not configured";
    const hasPrivateKey = !!Deno.env.get("ADMIN_PRIVATE_KEY");
    const simulationMode = Deno.env.get("SIMULATION_MODE") === "true";

    // Deno environment information
    const denoVersion = Deno.version;
    const denoInfo = {
      deno: denoVersion.deno,
      v8: denoVersion.v8,
      typescript: denoVersion.typescript,
    };

    // Prepare the response
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      config: {
        contractAddress: contractAddress.substring(0, 10) + "..." + (contractAddress.length > 20 ? contractAddress.substring(contractAddress.length - 8) : ""),
        rpcUrl: rpcUrl.includes("://") ? `${rpcUrl.split("://")[0]}://*****` : "Non configuré",
        hasPrivateKey: hasPrivateKey,
        simulationMode: simulationMode,
      },
      environment: {
        runtime: "Deno Edge Function",
        info: denoInfo,
      },
      endpoints: {
        createTicket: "/functions/v1/createticket",
        health: "/functions/v1/health",
      },
    };

    // Return a response
    return new Response(
      JSON.stringify(response, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "An unknown error occurred",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});

/* To test locally:
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/health'
*/
