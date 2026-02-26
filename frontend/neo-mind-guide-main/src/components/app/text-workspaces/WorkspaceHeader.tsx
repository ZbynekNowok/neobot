import { ArrowRight, LucideIcon } from "lucide-react";

interface WorkspaceHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onBack: () => void;
}

export default function WorkspaceHeader({ icon: Icon, title, description, onBack }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <button
        onClick={onBack}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="w-5 h-5 rotate-180" />
      </button>
      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
