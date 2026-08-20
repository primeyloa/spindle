import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, useUIStore } from "../lib/store";
import {
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const { user, isLoading } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Breadcrumb segments
  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.length > 0
    ? segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    : ["Home"];

  async function handleSignOut() {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    navigate("/");
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : user?.user_metadata?.full_name?.slice(0, 2).toUpperCase() || "?";

  return (
    <header className="h-12 shrink-0 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 gap-3">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span className="text-text-muted/40 select-none shrink-0">/</span>
            )}
            <span
              className={`truncate ${
                i === breadcrumbs.length - 1
                  ? "text-foreground font-medium"
                  : "text-text-muted"
              }`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2 rounded-lg"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Profile / Auth */}
        {isLoading ? (
          <div className="w-7 h-7 skeleton rounded-lg" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors duration-150"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent shrink-0">
                {initials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border border-border bg-background shadow-lg z-50"
                role="menu"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium truncate">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { navigate("/profile"); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                  role="menuitem"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted/40 transition-colors"
                  role="menuitem"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/sign-in")}
            className="btn-primary text-xs px-3 py-1.5"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}