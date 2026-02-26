// Supabase Edge Function: generate-content
// Proxy to our backend API instead of generating content internally

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const BACKEND_URL = "https://api.neobot.cz/api/content/generate";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse incoming request
    const payload = await req.json();

    // Forward request to our backend (unchanged payload)
    const backendResponse = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Handle backend errors
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({
        error: "Backend request failed",
      }));
      
      return new Response(
        JSON.stringify({
          error: errorData.error || "Backend request failed",
          message: errorData.message || `Backend returned status ${backendResponse.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse backend response
    const backendData = await backendResponse.json();

    // Return response in compatible format (unchanged from backend)
    return new Response(JSON.stringify(backendData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Error handling
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
