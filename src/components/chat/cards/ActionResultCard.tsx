import { CheckCircle, XCircle } from "lucide-react";
import type { ActionCall } from "../../../types/chat";

interface ActionResultCardProps {
  action: ActionCall;
  result: string;
  success: boolean;
}

export default function ActionResultCard({ action, result, success }: ActionResultCardProps) {
  return (
    <div className="card !p-0 overflow-hidden border border-border/50">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${
        success ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"
      }`}>
        {success ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          success ? "text-success" : "text-destructive"
        }`}>
          {success ? "Completed" : "Failed"}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">{action.name}</span>
      </div>

      {/* Body */}
      <div className="p-4">
        <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap bg-muted/50 rounded-lg p-3 overflow-x-auto leading-relaxed">
          {result}
        </pre>
      </div>
    </div>
  );
}