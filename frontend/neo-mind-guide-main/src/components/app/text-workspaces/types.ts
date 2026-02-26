// Shared types for Text NeoBot workspaces

export interface TextSection {
  id: string;
  title: string;
  content: string;
  isEditing?: boolean;
}

export interface ParsedOutput {
  postText: string;
  notes: string | null;
  rawContent: string;
}

export interface TextOutputData {
  name: string;
  sections: TextSection[];
  parsed: ParsedOutput;
  metadata?: Record<string, string>;
}

export interface WorkspaceProps {
  profile: import("@/components/app/AppLayout").UserProfile | null;
  onBack: () => void;
}

// Generic option type for settings
export interface SettingOption {
  id: string;
  label: string;
  description?: string;
}
