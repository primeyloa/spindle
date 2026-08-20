import { useAuthStore } from "../lib/store";
import { useMemoryStore } from "../lib/memoryStore";
import { Wifi, WifiOff, Database, Cpu } from "lucide-react";
import { useEffect } from "react";

export default function StatusBar() {
  const { user, isLoading } = useAuthStore();
  const { count, fetchCount } = useMemoryStore();

  useEffect(() => {
    if (user) {
      fetchCount();
    }
  }, [user, fetchCount]);

  // Simulated values — will be replaced with real store data in later tasks
  const isConnected = true;
  const modelName = "GPT-4o";

  return (
    <footer className="h-6 shrink-0 border-t border-border bg-sidebar hidden sm:flex items-center justify-between px-3 text-[11px] text-text-muted">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {modelName}
        </span>
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3" />
          {count} {count === 1 ? "memory" : "memories"}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {!isLoading && user && (
          <span className="text-[11px]">
            {user.email || "Signed in"}
          </span>
        )}
        <span
          className={`flex items-center gap-1 ${
            isConnected ? "text-success" : "text-destructive"
          }`}
          title={isConnected ? "Connected" : "Disconnected"}
        >
          {isConnected ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {isConnected ? "Connected" : "Offline"}
        </span>
      </div>
    </footer>
  );
}