import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface FeatureTileProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  disabled?: boolean;
  badgeText?: string;
  badgeTone?: "danger" | "warning";
  onClick?: () => void;
}

export function FeatureTile({
  title,
  description,
  icon,
  href,
  disabled = false,
  badgeText,
  badgeTone,
  onClick,
}: FeatureTileProps) {
  const baseClasses =
    "relative group glass rounded-xl p-4 flex flex-col gap-2 border border-border/60 text-left";
  const enabledClasses =
    "cursor-pointer hover:bg-muted/60 transition-colors";
  const disabledClasses = "cursor-not-allowed opacity-80";

  const content = (
    <>
      {badgeText && badgeTone && (
        <div
          className={`absolute top-3 right-3 flex items-center gap-1 text-xs ${
            badgeTone === "danger" ? "text-red-400" : "text-amber-400"
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              badgeTone === "danger" ? "bg-red-500" : "bg-amber-500"
            }`}
          />
          <span>{badgeText}</span>
        </div>
      )}
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1">
        <span className="w-4 h-4 text-primary flex items-center justify-center">
          {icon}
        </span>
      </div>
      <h2 className="font-semibold text-sm text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={`${baseClasses} ${enabledClasses}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabledClasses}`}
    >
      {content}
    </button>
  );
}

