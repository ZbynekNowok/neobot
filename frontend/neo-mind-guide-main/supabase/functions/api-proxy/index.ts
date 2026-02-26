const TARGET_API_URL = Deno.env.get("EXTERNAL_API_URL") || "https://api.neobot.cz";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method, body } = await req.json();

    if (!endpoint || typeof endpoint !== "string" || !endpoint.startsWith("/") || endpoint.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid endpoint path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: { "Content-Type": "application/json" },
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${TARGET_API_URL}${endpoint}`, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { raw: await response.text() };
    }

    // Always return 200 to avoid Supabase client throwing on non-2xx
    // Include upstream status in the response body for the frontend to handle
    const result = response.ok
      ? data
      : { error: (data as any)?.error || (data as any)?.message || (data as any)?.raw || `Upstream returned ${response.status}`, status: response.status, _upstream: data };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
