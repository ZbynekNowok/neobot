import { SettingOption } from "./types";

interface SettingsToggleProps {
  label: string;
  options: SettingOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function SettingsToggle({ label, options, value, onChange }: SettingsToggleProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === opt.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
