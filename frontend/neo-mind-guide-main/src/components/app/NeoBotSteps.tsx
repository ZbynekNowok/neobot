import { Check } from "lucide-react";

interface NeoBotStepsProps {
  currentStep: number;
  steps: { label: string }[];
  accentColor?: "primary" | "accent";
}

export default function NeoBotSteps({ currentStep, steps, accentColor = "primary" }: NeoBotStepsProps) {
  const colorClasses = accentColor === "accent" 
    ? { active: "bg-accent text-accent-foreground", inactive: "bg-muted text-muted-foreground", line: "bg-accent" }
    : { active: "bg-primary text-primary-foreground", inactive: "bg-muted text-muted-foreground", line: "bg-primary" };

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            currentStep > index + 1 
              ? colorClasses.active
              : currentStep === index + 1 
                ? colorClasses.active 
                : colorClasses.inactive
          }`}>
            {currentStep > index + 1 ? (
              <Check className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <span className={`text-sm hidden sm:block ${
            currentStep >= index + 1 ? "text-foreground" : "text-muted-foreground"
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${
              currentStep > index + 1 ? colorClasses.line : "bg-muted"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
