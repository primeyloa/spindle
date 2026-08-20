import { FileText, CheckCircle, Sparkles } from "lucide-react";
import type { PlanStep } from "../../../types/chat";
import { useState } from "react";

interface PlanCardProps {
  steps: PlanStep[];
  summary: string;
  model?: string;
  onApprove: () => void;
  onDecline: () => void;
  onModify: (feedback: string) => void;
}

export default function PlanCard({ steps, summary, model, onApprove, onDecline, onModify }: PlanCardProps) {
  const [feedback, setFeedback] = useState("");
  const [showModify, setShowModify] = useState(false);

  return (
    <div className="card !p-0 overflow-hidden border border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-2 bg-primary/10 px-4 py-3 border-b border-primary/10">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Proposed Plan
        </span>
        {model && (
          <span className="ml-auto text-[10px] text-text-muted bg-muted px-2 py-0.5 rounded-full">
            {model}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
      </div>

      {/* Steps */}
      <div className="px-4 pb-4 space-y-2">
        {steps.map((step) => (
          <div key={step.step} className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 mt-0.5">
              <span className="text-[10px] font-bold text-accent">{step.step}</span>
            </div>
            <div>
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-xs text-text-muted">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-border/50 px-4 py-3 space-y-3">
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={onApprove}>
            <CheckCircle className="h-4 w-4" />
            Approve & Start Building
          </button>
          <button className="btn-outline" onClick={() => setShowModify(!showModify)}>
            Refine
          </button>
          <button className="btn-destructive" onClick={onDecline}>
            Decline
          </button>
        </div>

        {showModify && (
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="What would you like to change?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              aria-label="Modification feedback"
            />
            <button
              className="btn-secondary"
              onClick={() => {
                onModify(feedback);
                setFeedback("");
                setShowModify(false);
              }}
              disabled={!feedback.trim()}
            >
              <Sparkles className="h-4 w-4" />
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}