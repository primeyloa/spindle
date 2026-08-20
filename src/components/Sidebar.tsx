import { Link, useLocation } from "react-router-dom";
import { useAuthStore, useUIStore } from "../lib/store";
import {
  MessageSquare,
  Layers,
  Puzzle,
  AppWindow,
  Brain,
  History,
  Sparkles,
  ChevronLeft,
  Menu,
  User,
} from "lucide-react";

const navItems = [
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Layers, label: "Harnesses", path: "/workspace" },
  { icon: Puzzle, label: "Skills", path: "/skills" },
  { icon: AppWindow, label: "Apps", path: "/apps" },
  { icon: Brain, label: "Memory", path: "/memory" },
  { icon: History, label: "History", path: "/history" },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, isLoading } = useAuthStore();

  return (
    <aside
      aria-label="Main sidebar"
      className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0 ${
        sidebarCollapsed ? "w-[56px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-12 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-heading font-semibold text-sm truncate">
              Spindle
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-1.5 rounded-lg shrink-0"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <Menu className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-primary/20 text-accent font-medium"
                  : "text-text-muted hover:text-foreground hover:bg-muted/40"
              }`}
              title={item.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-border">
        {isLoading ? (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-lg skeleton shrink-0" />
            {!sidebarCollapsed && <div className="h-4 flex-1 skeleton rounded" />}
          </div>
        ) : (
          <Link
            to={user ? "/profile" : "/sign-in"}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              location.pathname === "/profile" || location.pathname === "/sign-in"
                ? "bg-primary/20 text-accent font-medium"
                : "text-text-muted hover:text-foreground hover:bg-muted/40"
            }`}
            title={user ? "Profile" : "Sign In"}
          >
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            {!sidebarCollapsed && (
              <span className="truncate">
                {user ? user.email || "Profile" : "Sign In"}
              </span>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}