import { User, Bot } from "lucide-react";
import type { Message } from "../../types/chat";
import InfoCard from "./cards/InfoCard";
import OnboardingCard from "./cards/OnboardingCard";
import PlanCard from "./cards/PlanCard";
import ApprovalCard from "./cards/ApprovalCard";
import ActionResultCard from "./cards/ActionResultCard";
import MarkdownContent from "./MarkdownContent";

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  streamingContent?: string;
  // Callbacks for card interactions
  onOnboardingNext?: (step: string, data: Record<string, unknown>) => void;
  onOnboardingComplete?: (data: Record<string, unknown>) => void;
  onPlanApprove?: () => void;
  onPlanDecline?: () => void;
  onPlanModify?: (feedback: string) => void;
  onActionApprove?: (actionId: string) => void;
  onActionDecline?: (actionId: string) => void;
  onActionModify?: (actionId: string, feedback: string) => void;
}

export default function ChatMessage({
  message,
  isLast,
  streamingContent,
  onOnboardingNext,
  onOnboardingComplete,
  onPlanApprove,
  onPlanDecline,
  onPlanModify,
  onActionApprove,
  onActionDecline,
  onActionModify,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // If this is the last message and streaming, show streaming content
  const displayContent = isLast && message.isStreaming && streamingContent !== undefined
    ? streamingContent
    : message.content;

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-[fadeSlideIn_0.3s_ease-out]`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-accent/20 text-accent"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={`flex max-w-[80%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Role label */}
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          {isUser ? "You" : "Spindle"}
        </span>

        {/* Card renderer — if message has a card, render it instead of text */}
        {message.card ? (
          <RenderCard
            card={message.card}
            onOnboardingNext={onOnboardingNext}
            onOnboardingComplete={onOnboardingComplete}
            onPlanApprove={onPlanApprove}
            onPlanDecline={onPlanDecline}
            onPlanModify={onPlanModify}
            onActionApprove={onActionApprove}
            onActionDecline={onActionDecline}
            onActionModify={onActionModify}
          />
        ) : (
          /* Text content with markdown rendering */
          displayContent && (
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isUser
                  ? "bg-primary/20 text-foreground rounded-tr-sm"
                  : "bg-muted/50 text-foreground/90 rounded-tl-sm"
              }`}
            >
              {isUser ? (
                /* User messages rendered as plain text with basic markdown */
                <div className="whitespace-pre-wrap">{displayContent}</div>
              ) : (
                /* Assistant messages rendered with full markdown */
                <MarkdownContent
                  content={displayContent}
                  isStreaming={isLast && message.isStreaming}
                />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function RenderCard({
  card,
  onOnboardingNext,
  onOnboardingComplete,
  onPlanApprove,
  onPlanDecline,
  onPlanModify,
  onActionApprove,
  onActionDecline,
  onActionModify,
}: {
  card: NonNullable<Message["card"]>;
  onOnboardingNext?: (step: string, data: Record<string, unknown>) => void;
  onOnboardingComplete?: (data: Record<string, unknown>) => void;
  onPlanApprove?: () => void;
  onPlanDecline?: () => void;
  onPlanModify?: (feedback: string) => void;
  onActionApprove?: (actionId: string) => void;
  onActionDecline?: (actionId: string) => void;
  onActionModify?: (actionId: string, feedback: string) => void;
}) {
  switch (card.type) {
    case "info":
      return <InfoCard content={card.content} icon={card.icon} />;

    case "onboarding":
      return (
        <OnboardingCard
          step={card.step}
          data={card.data}
          onNext={(step, data) => onOnboardingNext?.(step, data)}
          onComplete={(data) => onOnboardingComplete?.(data)}
        />
      );

    case "plan":
      return (
        <PlanCard
          steps={card.steps}
          summary={card.summary}
          model={card.model}
          onApprove={() => onPlanApprove?.()}
          onDecline={() => onPlanDecline?.()}
          onModify={(f) => onPlanModify?.(f)}
        />
      );

    case "approval":
      return (
        <ApprovalCard
          action={card.action}
          onApprove={(id) => onActionApprove?.(id)}
          onDecline={(id) => onActionDecline?.(id)}
          onModify={(id, f) => onActionModify?.(id, f)}
        />
      );

    case "action_result":
      return (
        <ActionResultCard
          action={card.action}
          result={card.result}
          success={card.success}
        />
      );

    default:
      return null;
  }
}