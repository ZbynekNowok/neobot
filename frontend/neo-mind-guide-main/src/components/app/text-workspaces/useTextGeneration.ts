import { useState } from "react";
import { toast } from "sonner";
import { ParsedOutput, TextSection } from "./types";
import { saveOutputToHistory } from "@/lib/neobot";

import { NEOBOT_API_BASE, NEOBOT_API_KEY, fetchWorkspaceProfile } from "@/lib/neobot";
import { supabase } from "@/integrations/supabase/client";

const GENERATE_URL = `${NEOBOT_API_BASE}/api/content/generate`;

interface GenerationParams {
  profile: any;
  type: string;
  prompt: string;
  settings: Record<string, any>;
}

interface BackendResponse {
  ok: boolean;
  text: string;
  hashtags?: string[];
  notes?: string[];
}

function buildProfilePayload(p: any): Record<string, string> | undefined {
  if (!p) return undefined;
  const mapped: Record<string, string> = {};
  if (p.brand_name) mapped.business_name = p.brand_name;
  if (p.business) mapped.industry = p.business;
  if (p.ideal_customer) mapped.target_audience = p.ideal_customer;
  if (p.communication_style) mapped.tone = p.communication_style;
  if (p.unique_value) mapped.usp = p.unique_value;
  if (p.goal) mapped.main_services = p.goal;
  if (p.brand_keywords) mapped.cta_style = p.brand_keywords;
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

/** Fetch fresh profile from DB so strategy edits are always reflected */
async function fetchFreshProfile(): Promise<Record<string, string> | undefined> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return undefined;

    const { data } = await supabase
      .from("profiles")
      .select("brand_name, business, ideal_customer, communication_style, unique_value, goal, brand_keywords")
      .eq("id", session.user.id)
      .maybeSingle();

    return buildProfilePayload(data);
  } catch {
    return undefined;
  }
}

async function callGenerate(params: GenerationParams): Promise<BackendResponse> {
  // Try fresh DB profile first, then workspace API profile
  const freshProfile = await fetchFreshProfile() || await fetchWorkspaceProfile();

  const res = await fetch(GENERATE_URL, {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "x-api-key": NEOBOT_API_KEY,
    },
    body: JSON.stringify({
      profile: freshProfile ?? buildProfilePayload(params.profile),
      type: params.type,
      prompt: params.prompt,
      settings: params.settings,
    }),
  });

  const body = await res.json().catch(() => null);
  console.log("[Content Generate] status", res.status, "body", body);

  if (!res.ok || !body || body.ok === false) {
    let msg = (body && (body.message || body.error)) || "Request failed";
    if (res.status === 401 || res.status === 403) msg = "Chybí nebo je neplatný API klíč.";
    if (res.status === 402) msg = "Došel kredit / units.";
    throw new Error(msg);
  }

  return {
    ok: true,
    text: body.text || "",
    hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
    notes: Array.isArray(body.notes) ? body.notes : [],
  };
}

export function useTextGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async (params: GenerationParams): Promise<string | null> => {
    setIsGenerating(true);
    
    try {
      const data = await callGenerate(params);

      if (!data.ok) {
        throw new Error("Backend returned ok=false");
      }

      let content = data.text || "";
      if (data.hashtags && data.hashtags.length > 0) {
        content += "\n\n" + data.hashtags.join(" ");
      }

      // Save to history (non-blocking)
      saveOutputToHistory("content_generate", {
        type: params.type,
        prompt: params.prompt,
        settings: params.settings,
      }, {
        text: data.text,
        hashtags: data.hashtags,
        notes: data.notes,
      });

      return content;
    } catch (error: any) {
      console.error("Error generating content:", error);
      const msg = error?.message || "Nepodařilo se vygenerovat obsah.";
      toast.error(msg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFull = async (params: GenerationParams): Promise<BackendResponse | null> => {
    setIsGenerating(true);
    
    try {
      const data = await callGenerate(params);

      if (!data.ok) {
        throw new Error("Backend returned ok=false");
      }

      return data;
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast.error(error?.message || "Nepodařilo se vygenerovat obsah.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse AI response into postText and notes
  const parseResponse = (content: string): ParsedOutput => {
    if (!content.trim()) {
      return {
        postText: "Nepodařilo se vygenerovat obsah.",
        notes: null,
        rawContent: content
      };
    }

    return {
      postText: content,
      notes: null,
      rawContent: content
    };
  };

  // Build ParsedOutput from backend response directly
  const parseBackendResponse = (data: BackendResponse): ParsedOutput => {
    let postText = data.text || "";
    
    if (data.hashtags && data.hashtags.length > 0) {
      postText += "\n\n" + data.hashtags.join(" ");
    }

    const notes = data.notes && data.notes.length > 0
      ? data.notes.map(n => `• ${n}`).join("\n")
      : null;

    return {
      postText,
      notes,
      rawContent: data.text || ""
    };
  };

  const parseToSections = (content: string): TextSection[] => {
    const parsed = parseResponse(content);
    
    const sections: TextSection[] = [{
      id: "postText",
      title: "Text k publikaci",
      content: parsed.postText
    }];

    if (parsed.notes) {
      sections.push({
        id: "notes",
        title: "Poznámky",
        content: parsed.notes
      });
    }

    return sections;
  };

  const sectionsFromBackend = (data: BackendResponse): TextSection[] => {
    const parsed = parseBackendResponse(data);
    
    const sections: TextSection[] = [{
      id: "postText",
      title: "Text k publikaci",
      content: parsed.postText
    }];

    if (parsed.notes) {
      sections.push({
        id: "notes",
        title: "Poznámky",
        content: parsed.notes
      });
    }

    return sections;
  };

  return { 
    generate, generateFull, 
    parseResponse, parseBackendResponse, 
    parseToSections, sectionsFromBackend, 
    isGenerating, setIsGenerating 
  };
}
