import { supabase } from "@/integrations/supabase/client";

const TIMEOUT_MS = 30_000;

interface ApiError {
  message: string;
  status: number;
}

async function proxyRequest(endpoint: string, method: string, body?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke("api-proxy", {
      body: { endpoint, method, body },
    });

    clearTimeout(timer);

    if (error) {
      throw { message: error.message || "Edge function error", status: 502 } as ApiError;
    }

    if (data?.error) {
      throw { message: data.error, status: data.status || 500 } as ApiError;
    }

    return data;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw { message: `Request timed out after ${TIMEOUT_MS / 1000}s`, status: 408 } as ApiError;
    }
    if (err.message && err.status) throw err;
    throw { message: err?.message || "Network error", status: 0 } as ApiError;
  }
}

export const apiGet = (path: string) => proxyRequest(path, "GET");
export const apiPost = (path: string, body: unknown) => proxyRequest(path, "POST", body);
