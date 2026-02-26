export const NEOBOT_API_BASE = "https://api.neobot.cz";
export const NEOBOT_API_KEY = import.meta.env.VITE_NEOBOT_API_KEY || "";

const apiHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  "Accept": "application/json",
  "x-api-key": NEOBOT_API_KEY,
});

/** Shared fetch helper – all NeoBot API calls go through here */
export async function neobotFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${NEOBOT_API_BASE}${path}`, {
    ...opts,
    headers: { ...apiHeaders(), ...(opts?.headers || {}) },
    credentials: "omit",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Chybí nebo je neplatný API klíč.");
    if (res.status === 402) throw new Error("Došel kredit / units.");
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; responseData?: Record<string, unknown> };
    err.status = res.status;
    err.responseData = data && typeof data === "object" ? data : undefined;
    throw err;
  }
  return data;
}

/** Save an output to history (fire-and-forget) */
export function saveOutputToHistory(type: string, input: any, output: any) {
  neobotFetch("/api/outputs", {
    method: "POST",
    body: JSON.stringify({ type, input, output }),
  }).catch(() => {
    // Non-critical – don't block the user
  });
}

/** Fetch workspace profile from the API */
export async function fetchWorkspaceProfile(): Promise<Record<string, string> | undefined> {
  try {
    const data = await neobotFetch("/api/workspace/profile");
    const profile = data?.profile ?? data;
    if (!profile || (!profile.business_name && !profile.industry)) return undefined;
    return profile;
  } catch {
    return undefined;
  }
}

/**
 * Map onboarding data to workspace profile and sync to backend.
 * Call after onboarding completion so all content generation uses the client's profile.
 * @param brandLogoUrl - optional public URL of uploaded logo (e.g. from Supabase storage)
 */
export async function syncWorkspaceProfileFromOnboarding(
  data: {
    brandName: string;
    business: string;
    businessStage: string | null;
    idealCustomer: string;
    customerProblem: string | null;
    customerProblemOther: string;
    uniqueValue: string;
    marketingGoal: string[];
    marketingBlocker: string;
    activeChannels: string[];
    priorityChannel: string | null;
    contentFrequency: string | null;
    contentStruggle: string | null;
    brandKeywords: string;
    inspirationBrands: string;
    neobotExpectation: string | null;
  },
  brandLogoUrl?: string | null
): Promise<void> {
  const body: Record<string, unknown> = {
    business_name: data.brandName || undefined,
    industry: data.business || undefined,
    target_audience: data.idealCustomer || undefined,
    usp: data.uniqueValue || undefined,
    tone: data.brandKeywords?.trim() || undefined,
    main_services: data.marketingGoal?.length ? data.marketingGoal : undefined,
    cta_style: [data.brandKeywords, data.inspirationBrands].filter(Boolean).join("; ") || undefined,
  };
  if (brandLogoUrl) body.brand_logo_url = brandLogoUrl;
  await neobotFetch("/api/workspace/profile", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Sync current Supabase profile (e.g. after edit on Strategy page) to backend workspace profile.
 * Ensures design and any backend use of profile stay in sync with client's firemní profil.
 */
export async function syncWorkspaceProfileFromSupabaseProfile(profile: Record<string, any> | null): Promise<void> {
  if (!profile) return;
  const body: Record<string, unknown> = {
    business_name: profile.brand_name ?? profile.business_name,
    industry: profile.business ?? profile.industry,
    target_audience: profile.ideal_customer ?? profile.target_audience,
    usp: profile.unique_value ?? profile.usp,
    tone: profile.communication_style ?? profile.brand_keywords ?? profile.tone,
    main_services: profile.marketing_goal ?? profile.main_services,
    cta_style: profile.brand_keywords ?? profile.cta_style,
  };
  if (profile.brand_logo_url) body.brand_logo_url = profile.brand_logo_url;
  await neobotFetch("/api/workspace/profile", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
