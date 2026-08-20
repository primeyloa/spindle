import { useCallback, useRef } from "react";
import { useChatStore } from "../lib/chatStore";
import type { OnboardingStep, OnboardingData, PlanStep } from "../types/chat";

export function useOnboarding() {
  const {
    activeConversation,
    addMessage,
    setOnboardingData,
    setOnboardingComplete,
    setConversationTitle,
  } = useChatStore();

  // Track step to avoid closure issues
  const stepRef = useRef<OnboardingStep>("goal");
  const dataRef = useRef<Partial<OnboardingData>>({});

  const startOnboarding = useCallback(() => {
    if (!activeConversation) return;

    stepRef.current = "goal";
    dataRef.current = {};

    // Send first onboarding card
    addMessage({
      role: "assistant",
      content: "Let's get started! I'll help you build your tool.",
      card: {
        type: "onboarding",
        step: "goal",
        data: {},
      },
    });
  }, [activeConversation, addMessage]);

  const handleOnboardingNext = useCallback(
    (step: string, data: Record<string, unknown>) => {
      if (!activeConversation) return;

      // Merge the collected data
      dataRef.current = { ...dataRef.current, ...data };
      setOnboardingData(activeConversation.id, dataRef.current);

      // Determine next step
      const stepOrder: OnboardingStep[] = ["goal", "level", "os", "preferences"];
      const currentIdx = stepOrder.indexOf(step as OnboardingStep);
      const nextStep = stepOrder[currentIdx + 1];

      if (nextStep) {
        stepRef.current = nextStep;
        // Send next onboarding card
        addMessage({
          role: "assistant",
          content: "",
          card: {
            type: "onboarding",
            step: nextStep,
            data: dataRef.current,
          },
        });
      }
    },
    [activeConversation, addMessage, setOnboardingData]
  );

  const handleOnboardingComplete = useCallback(
    (data: Record<string, unknown>) => {
      if (!activeConversation) return;

      // Merge final data
      const finalData = { ...dataRef.current, ...data } as Partial<OnboardingData>;
      dataRef.current = finalData;
      setOnboardingData(activeConversation.id, finalData);
      setOnboardingComplete(activeConversation.id, true);

      // Set conversation title from the goal
      const title = finalData.goal
        ? finalData.goal.slice(0, 50) + (finalData.goal.length > 50 ? "..." : "")
        : "New Tool";
      setConversationTitle(activeConversation.id, title);

      // Generate a plan based on collected data
      const planSteps: PlanStep[] = [
        {
          step: 1,
          title: "Research & Requirements",
          description: "Analyze your requirements and research best practices.",
        },
        {
          step: 2,
          title: "Design Architecture",
          description: `Design the tool architecture for ${finalData.os ?? "cross-platform"}.`,
        },
        {
          step: 3,
          title: "Build Core Features",
          description: "Implement the core functionality step by step.",
        },
        {
          step: 4,
          title: "Testing & Polish",
          description: "Test the tool and polish the user experience.",
        },
      ];

      const summary = `Based on your goal "${finalData.goal}", I'll build a tool optimized for ${finalData.level} users on ${finalData.os ?? "Web"}. ${finalData.preferences ? `Noted preferences: ${finalData.preferences}` : "I'll use default settings."}`;

      addMessage({
        role: "assistant",
        content: summary,
        card: {
          type: "plan",
          steps: planSteps,
          summary,
          model: "GPT-4o",
        },
      });
    },
    [activeConversation, addMessage, setOnboardingData, setOnboardingComplete, setConversationTitle]
  );

  const handlePlanApprove = useCallback(() => {
    if (!activeConversation) return;

    addMessage({
      role: "assistant",
      content: "Great! Let me start building your tool. I'll keep you updated on progress.",
      card: {
        type: "info",
        content: "Building started. Check the Workspace tab to see progress in real-time.",
      },
    });
  }, [activeConversation, addMessage]);

  const handlePlanDecline = useCallback(() => {
    if (!activeConversation) return;

    stepRef.current = "goal";
    addMessage({
      role: "assistant",
      content: "No problem! Let's start over. What would you like to build?",
      card: {
        type: "onboarding",
        step: "goal",
        data: {},
      },
    });
  }, [activeConversation, addMessage]);

  const handlePlanModify = useCallback(
    (feedback: string) => {
      if (!activeConversation) return;

      addMessage({
        role: "assistant",
        content: `Thanks for the feedback! I'll adjust the plan. "${feedback}"`,
        card: {
          type: "info",
          content: `Refining plan based on your feedback: "${feedback}"`,
        },
      });

      // Generate an updated plan with adjusted steps
      const planSteps: PlanStep[] = [
        {
          step: 1,
          title: "Refined Research & Requirements",
          description: "Re-analyzing requirements with your feedback in mind.",
        },
        {
          step: 2,
          title: "Adjusted Architecture",
          description: "Updating architecture based on your preferences.",
        },
        {
          step: 3,
          title: "Build Core Features",
          description: "Implement with your modifications included.",
        },
        {
          step: 4,
          title: "Testing & Polish",
          description: "Thorough testing of the adjusted tool.",
        },
      ];

      addMessage({
        role: "assistant",
        content: `Here's the revised plan incorporating your feedback: "${feedback}"`,
        card: {
          type: "plan",
          steps: planSteps,
          summary: `Updated plan based on your feedback. I've adjusted the approach to better match what you're looking for.`,
          model: "GPT-4o",
        },
      });
    },
    [activeConversation, addMessage]
  );

  return {
    startOnboarding,
    handleOnboardingNext,
    handleOnboardingComplete,
    handlePlanApprove,
    handlePlanDecline,
    handlePlanModify,
  };
}