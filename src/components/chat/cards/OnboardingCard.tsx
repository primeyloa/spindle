import { useState } from "react";
import { ChevronRight, Sparkles, Code, Monitor, Cog } from "lucide-react";
import type { OnboardingStep, OnboardingData } from "../../../types/chat";

interface OnboardingCardProps {
  step: OnboardingStep;
  data: Partial<OnboardingData>;
  onNext: (step: OnboardingStep, data: Partial<OnboardingData>) => void;
  onComplete: (data: Partial<OnboardingData>) => void;
}

const levelOptions: { value: OnboardingData["level"]; label: string; icon: React.ReactNode }[] = [
  { value: "beginner", label: "Beginner", icon: <Sparkles className="h-4 w-4" /> },
  { value: "intermediate", label: "Intermediate", icon: <Code className="h-4 w-4" /> },
  { value: "expert", label: "Expert", icon: <Cog className="h-4 w-4" /> },
];

const osOptions: { value: OnboardingData["os"]; label: string }[] = [
  { value: "macOS", label: "macOS" },
  { value: "Windows", label: "Windows" },
  { value: "Linux", label: "Linux" },
  { value: "Web", label: "Web (Browser)" },
];

export default function OnboardingCard({ step, data, onNext, onComplete }: OnboardingCardProps) {
  const [goal, setGoal] = useState(data.goal ?? "");
  const [level, setLevel] = useState<OnboardingData["level"] | null>(data.level ?? null);
  const [os, setOs] = useState<OnboardingData["os"] | null>(data.os ?? null);
  const [preferences, setPreferences] = useState(data.preferences ?? "");

  const handleSubmit = () => {
    switch (step) {
      case "goal":
        if (goal.trim()) onNext("level", { goal: goal.trim() });
        break;
      case "level":
        if (level) onNext("os", { level });
        break;
      case "os":
        if (os) onNext("preferences", { os });
        break;
      case "preferences":
        onComplete({ preferences: preferences.trim() });
        break;
    }
  };

  const canProceed = () => {
    switch (step) {
      case "goal": return goal.trim().length > 0;
      case "level": return level !== null;
      case "os": return os !== null;
      case "preferences": return true;
      default: return false;
    }
  };

  return (
    <div className="card !p-0 overflow-hidden border border-accent/20">
      {/* Header */}
      <div className="flex items-center gap-2 bg-accent/10 px-4 py-3 border-b border-accent/10">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">
          Let's Get Started
        </span>
        <span className="ml-auto text-[10px] text-text-muted font-medium">
          Step {stepIndex(step) + 1} of 4
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${((stepIndex(step) + 1) / 4) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {step === "goal" && (
          <div className="space-y-2">
            <label className="label" htmlFor="onboarding-goal">
              What kind of tool would you like to build?
            </label>
            <p className="text-xs text-text-muted">
              Describe your idea in plain language. Don't worry about being technical —
              Spindle will help you refine it.
            </p>
            <textarea
              id="onboarding-goal"
              className="input min-h-[80px] resize-y"
              placeholder="e.g. An AI-powered social media content generator..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
        )}

        {step === "level" && (
          <div className="space-y-2">
            <label className="label">What's your technical level?</label>
            <p className="text-xs text-text-muted">
              This helps Spindle tailor the complexity of its responses and the tools it builds.
            </p>
            <div className="grid gap-2">
              {levelOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`card-interactive flex items-center gap-3 ${
                    level === opt.value ? "border-accent bg-accent/10" : ""
                  }`}
                  onClick={() => setLevel(opt.value)}
                  aria-pressed={level === opt.value}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      level === opt.value
                        ? "bg-accent text-white"
                        : "bg-muted text-text-muted"
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-text-muted">
                      {opt.value === "beginner" && "I'm new to building tools"}
                      {opt.value === "intermediate" && "I have some experience"}
                      {opt.value === "expert" && "I'm an experienced developer"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "os" && (
          <div className="space-y-2">
            <label className="label">Which OS should the tool support?</label>
            <p className="text-xs text-text-muted">
              Some tools are platform-specific. Choose where you plan to use it.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {osOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`card-interactive flex items-center justify-center gap-2 ${
                    os === opt.value ? "border-accent bg-accent/10" : ""
                  }`}
                  onClick={() => setOs(opt.value)}
                  aria-pressed={os === opt.value}
                >
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "preferences" && (
          <div className="space-y-2">
            <label className="label" htmlFor="onboarding-preferences">
              Any preferences for how Spindle works with you?
            </label>
            <p className="text-xs text-text-muted">
              Model preference, tone, communication style — anything that helps Spindle
              match your working style.
            </p>
            <textarea
              id="onboarding-preferences"
              className="input min-h-[80px] resize-y"
              placeholder="e.g. Use GPT-4o, be concise, prefer Python over JavaScript..."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-border/50 px-4 py-3">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!canProceed()}
        >
          {step === "preferences" ? "Generate Plan" : "Continue"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function stepIndex(step: OnboardingStep): number {
  const map: Record<string, number> = { goal: 0, level: 1, os: 2, preferences: 3, plan: 4, complete: 5 };
  return map[step] ?? 0;
}