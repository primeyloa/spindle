import { AlertTriangle, CheckCircle, XCircle, Edit3, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ActionCall } from "../../../types/chat";

interface ApprovalCardProps {
  action: ActionCall;
  onApprove: (actionId: string) => void;
  onDecline: (actionId: string) => void;
  onModify: (actionId: string, feedback: string) => void;
}

export default function ApprovalCard({ action, onApprove, onDecline, onModify }: ApprovalCardProps) {
  const [showModify, setShowModify] = useState(false);
  const [feedback, setFeedback] = useState("");

  const isExecuting = action.status === "executing" || action.status === "done" || action.status === "failed";

  if (isExecuting) {
    return (
      <div className="card !p-0 overflow-hidden border border-accent/20">
        <div className="flex items-center gap-2 bg-accent/10 px-4 py-3 border-b border-accent/10">
          {action.status === "executing" && <Loader2 className="h-4 w-4 text-accent animate-spin" />}
          {action.status === "done" && <CheckCircle className="h-4 w-4 text-success" />}
          {action.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
          <span className="text-xs font-semibold uppercase tracking-wider">
            {action.status === "executing" && "Executing..."}
            {action.status === "done" && "Completed"}
            {action.status === "failed" && "Failed"}
          </span>
        </div>
        <div className="p-4">
          <div className="text-sm font-medium">{action.name}</div>
          <div className="text-xs text-text-muted">{action.description}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden border border-warning/30">
      {/* Header */}
      <div className="flex items-center gap-2 bg-warning/10 px-4 py-3 border-b border-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="text-xs font-semibold text-warning uppercase tracking-wider">
          Action Required
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <div className="text-sm font-medium">{action.name}</div>
          <div className="text-xs text-text-muted mt-0.5">{action.description}</div>
        </div>

        {Object.keys(action.params).length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Parameters
            </div>
            <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(action.params, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border/50 px-4 py-3 space-y-3">
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={() => onApprove(action.id)}>
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
          <button className="btn-outline" onClick={() => setShowModify(!showModify)}>
            <Edit3 className="h-4 w-4" />
            Modify
          </button>
          <button className="btn-destructive" onClick={() => onDecline(action.id)}>
            <XCircle className="h-4 w-4" />
            Decline
          </button>
        </div>

        {showModify && (
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="How should this be modified?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              aria-label="Modification feedback"
              autoFocus
            />
            <button
              className="btn-secondary"
              onClick={() => {
                onModify(action.id, feedback);
                setFeedback("");
                setShowModify(false);
              }}
              disabled={!feedback.trim()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}