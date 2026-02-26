import { cn } from "@/lib/utils";

export interface QuickSettingOption {
  id: string;
  label: string;
}

export interface QuickSettingGroup {
  id: string;
  label: string;
  options: QuickSettingOption[];
}

interface QuickSettingsProps {
  groups: QuickSettingGroup[];
  values: Record<string, string>;
  onChange: (groupId: string, optionId: string) => void;
  className?: string;
}

export function QuickSettings({ groups, values, onChange, className }: QuickSettingsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="text-sm font-medium text-foreground">Rychlé nastavení</h4>
      
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="space-y-2">
            <span className="text-xs text-muted-foreground">{group.label}</span>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isActive = values[group.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange(group.id, option.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "border border-border/50",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pre-defined settings for Text NeoBot
export const textNeoBotSettings: QuickSettingGroup[] = [
  {
    id: "tone",
    label: "Tón komunikace",
    options: [
      { id: "sales", label: "Prodejní" },
      { id: "friendly", label: "Přátelský" },
      { id: "professional", label: "Odborný" },
      { id: "luxury", label: "Luxusní" },
    ],
  },
  {
    id: "length",
    label: "Délka textu",
    options: [
      { id: "short", label: "Krátký" },
      { id: "medium", label: "Střední" },
      { id: "long", label: "Dlouhý" },
    ],
  },
  {
    id: "goal",
    label: "Cíl textu",
    options: [
      { id: "sale", label: "Prodej" },
      { id: "registration", label: "Registrace" },
      { id: "inquiry", label: "Poptávka" },
      { id: "branding", label: "Budování značky" },
    ],
  },
];

// Pre-defined settings for Image NeoBot
export const imageNeoBotSettings: QuickSettingGroup[] = [
  {
    id: "style",
    label: "Styl vizuálu",
    options: [
      { id: "minimal", label: "Minimalistický" },
      { id: "luxury", label: "Luxusní" },
      { id: "natural", label: "Přirozený" },
      { id: "modern", label: "Moderní" },
      { id: "playful", label: "Hravý" },
    ],
  },
  {
    id: "format",
    label: "Formát",
    options: [
      { id: "square", label: "Čtverec (1:1)" },
      { id: "portrait", label: "Na výšku (9:16)" },
      { id: "landscape", label: "Na šířku (16:9)" },
    ],
  },
  {
    id: "purpose",
    label: "Účel",
    options: [
      { id: "social", label: "Sociální sítě" },
      { id: "ads", label: "Reklama" },
      { id: "web", label: "Web / e-shop" },
      { id: "branding", label: "Branding" },
    ],
  },
];

// Pre-defined settings for Video NeoBot
export const videoNeoBotSettings: QuickSettingGroup[] = [
  {
    id: "purpose",
    label: "Účel videa",
    options: [
      { id: "sale", label: "Prodej" },
      { id: "education", label: "Edukace" },
      { id: "brand", label: "Brand" },
      { id: "engagement", label: "Engagement" },
    ],
  },
  {
    id: "duration",
    label: "Délka videa",
    options: [
      { id: "5s", label: "5 s" },
      { id: "10s", label: "10 s" },
      { id: "15s", label: "15 s" },
    ],
  },
  {
    id: "style",
    label: "Styl videa",
    options: [
      { id: "ugc", label: "Přirozený / UGC" },
      { id: "professional", label: "Profesionální" },
      { id: "emotional", label: "Emotivní" },
      { id: "dynamic", label: "Dynamický" },
      { id: "luxury", label: "Luxusní" },
    ],
  },
  {
    id: "platform",
    label: "Platforma",
    options: [
      { id: "instagram-reels", label: "Instagram Reels" },
      { id: "tiktok", label: "TikTok" },
      { id: "youtube-shorts", label: "YouTube Shorts" },
      { id: "facebook", label: "Facebook" },
    ],
  },
];
