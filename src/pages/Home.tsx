import { useAuthStore } from "../lib/store";
import { Sparkles, Code2, Puzzle, Brain } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Describe & Build",
    description: "Tell Spindle what you want in plain language. Our AI agent turns your intent into a working tool.",
  },
  {
    icon: Code2,
    title: "In-App Workspace",
    description: "Edit files, preview builds, and test your tool right in the browser before downloading.",
  },
  {
    icon: Puzzle,
    title: "Skills Marketplace",
    description: "Browse and install reusable capabilities built by the community to accelerate your projects.",
  },
  {
    icon: Brain,
    title: "Agent Memory",
    description: "Spindle remembers your preferences and past work, getting smarter with every conversation.",
  },
];

export default function Home() {
  const { user, isLoading, isAnonymous } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="max-w-2xl w-full text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          <Sparkles className="w-3 h-3" />
          AI-Native Tool Builder
        </div>
        <h1 className="text-3xl font-heading font-semibold tracking-tight mb-3">
          Welcome to Spindle
        </h1>
        <p className="text-text-muted text-base leading-relaxed">
          {isAnonymous
            ? "You're browsing anonymously. Start a conversation to build your first tool, or sign up to save your work."
            : `Hello${user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}! Ready to build something amazing?`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        {features.map((feature) => (
          <div key={feature.title} className="card hover:border-border transition-all duration-200 group">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
              <feature.icon className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-medium text-sm mb-1.5">{feature.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {isAnonymous && (
        <div className="mt-10 flex items-center gap-4">
          <a href="/sign-in" className="btn-primary text-sm">
            Sign In
          </a>
          <a href="/sign-up" className="btn-outline text-sm">
            Create Account
          </a>
        </div>
      )}
    </div>
  );
}