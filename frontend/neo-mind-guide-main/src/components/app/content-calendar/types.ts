// Types for content calendar feature

export interface TaskOutput {
  id: string;
  type: "text" | "script" | "visual" | "visual_prompt";
  content: string;
  created_at: string;
  is_final: boolean;
}

export interface ContentTask {
  day: string; // e.g., "Pondělí"
  date: string; // YYYY-MM-DD format
  channel: string; // e.g., "Instagram"
  format: string; // e.g., "Stories", "Post", "Reel", "Live"
  task: string; // What to create
  goal: string; // Purpose/objective
  recommended_action: string; // e.g., "Vytvořit Stories text"
  status?: "planned" | "done"; // Task completion status
  outputs?: TaskOutput[]; // Generated outputs attached to this task
}

export interface ContentPlan {
  id: string;
  user_id: string;
  name: string;
  period: "tyden" | "mesic";
  goal?: string;
  tasks: ContentTask[];
  created_at: string;
  updated_at: string;
}

export type CalendarView = "week" | "month";

export const formatColors: Record<string, { bg: string; border: string; text: string }> = {
  stories: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400" },
  post: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400" },
  reel: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
  reels: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
  live: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400" },
  blog: { bg: "bg-teal-500/20", border: "border-teal-500/50", text: "text-teal-400" },
  email: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-400" },
  newsletter: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400" },
  carousel: { bg: "bg-indigo-500/20", border: "border-indigo-500/50", text: "text-indigo-400" },
  article: { bg: "bg-teal-500/20", border: "border-teal-500/50", text: "text-teal-400" },
  default: { bg: "bg-muted/50", border: "border-muted", text: "text-muted-foreground" },
};

// Status colors
export const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  planned: { bg: "bg-amber-500/10", text: "text-amber-600", icon: "🗓️" },
  done: { bg: "bg-green-500/10", text: "text-green-600", icon: "✅" },
};

export const channelIcons: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  tiktok: "🎵",
  linkedin: "💼",
  twitter: "🐦",
  threads: "🧵",
  x: "𝕏",
  email: "📧",
  web: "🌐",
  youtube: "▶️",
  blog: "📝",
};

export const dayNames = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
