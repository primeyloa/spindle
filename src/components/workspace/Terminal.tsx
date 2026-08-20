import { useEffect, useRef, useState, useCallback } from "react";
import { useWorkspaceStore } from "../../lib/workspaceStore";
import { Terminal as TerminalIcon, Trash2, Maximize2, Minimize2 } from "lucide-react";

// ── Terminal Component ──────────────────────────────────────────────────

export default function TerminalPanel() {
  const { terminalLines, addTerminalLine, clearTerminal } = useWorkspaceStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [xtermLoaded, setXtermLoaded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Blinking cursor handled by xterm.js
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      // no-op, blink is handled by xterm.js
    }, 530);
    return () => {
      if (cursorIntervalRef.current !== null) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  // Load xterm dynamically
  useEffect(() => {
    let mounted = true;

    async function initXterm() {
      try {
        const { Terminal } = await import("xterm");
        const { FitAddon } = await import("xterm-addon-fit");

        if (!mounted || !terminalRef.current) return;

        // Import xterm CSS
        if (!document.querySelector("#xterm-style")) {
          const link = document.createElement("link");
          link.id = "xterm-style";
          link.rel = "stylesheet";
          link.href = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css";
          document.head.appendChild(link);
        }

        const term = new Terminal({
          theme: {
            background: "#0F172A",
            foreground: "#F8FAFC",
            cursor: "#22C55E",
            cursorAccent: "#22C55E",
            selectionBackground: "#334155",
            black: "#1E293B",
            red: "#EF4444",
            green: "#22C55E",
            yellow: "#EAB308",
            blue: "#3B82F6",
            magenta: "#A855F7",
            cyan: "#22D3EE",
            white: "#F8FAFC",
            brightBlack: "#475569",
            brightRed: "#F87171",
            brightGreen: "#4ADE80",
            brightYellow: "#FBBF24",
            brightBlue: "#60A5FA",
            brightMagenta: "#C084FC",
            brightCyan: "#67E8F9",
            brightWhite: "#F8FAFC",
          },
          fontSize: 12,
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
          cursorBlink: true,
          cursorStyle: "bar",
          cols: 80,
          rows: 10,
          allowTransparency: true,
          disableStdin: false,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        term.open(terminalRef.current);

        // Fit terminal to container after a short delay
        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch {}
        }, 100);

        // Resize handler
        const resizeHandler = () => {
          try {
            fitAddon.fit();
          } catch {}
        };
        window.addEventListener("resize", resizeHandler);

        // Write existing lines
        for (const line of terminalLines) {
          const color = line.type === "error" ? "\x1b[31m" : line.type === "system" ? "\x1b[36m" : line.type === "input" ? "\x1b[32m" : "";
          const reset = "\x1b[0m";
          term.writeln(`${color}${line.content}${reset}`);
        }

        // Write prompt
        writePrompt(term);

        // Handle input
        let currentLine = "";
        term.onKey((e) => {
          const char = e.key;

          if (char === "\r") {
            // Enter
            if (currentLine.trim()) {
              term.writeln("");
              addTerminalLine({ content: `$ ${currentLine}`, type: "input" });
              processCommand(currentLine, term);
            } else {
              term.writeln("");
              writePrompt(term);
            }
            currentLine = "";
          } else if (char === "\x7f") {
            // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write("\b \b");
            }
          } else if (char === "\x03") {
            // Ctrl+C
            term.writeln("^C");
            writePrompt(term);
            currentLine = "";
          } else if (char.length === 1 && char.charCodeAt(0) >= 32) {
            // Printable characters
            currentLine += char;
            term.write(char);
          }
        });

        setXtermLoaded(true);

        return () => {
          window.removeEventListener("resize", resizeHandler);
          term.dispose();
        };
      } catch (err) {
        console.error("Failed to load xterm:", err);
      }
    }

    initXterm();

    return () => {
      mounted = false;
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch {}
      }
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update terminal when new lines are added externally
  const prevLineCountRef = useRef(terminalLines.length);
  useEffect(() => {
    if (xtermRef.current && terminalLines.length > prevLineCountRef.current) {
      const newLines = terminalLines.slice(prevLineCountRef.current);
      for (const line of newLines) {
        const color =
          line.type === "error"
            ? "\x1b[31m"
            : line.type === "system"
            ? "\x1b[36m"
            : line.type === "input"
            ? "\x1b[32m"
            : "";
        const reset = "\x1b[0m";
        xtermRef.current.writeln(`${color}${line.content}${reset}`);
      }
      writePrompt(xtermRef.current);
    }
    prevLineCountRef.current = terminalLines.length;
  }, [terminalLines]);

  // Toggle minimized
  const toggleMinimized = useCallback(() => {
    setMinimized((m) => !m);
    if (minimized) {
      // Just expanded — refit after DOM update
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {}
      }, 50);
    }
  }, [minimized]);

  return (
    <div
      className={`border-t border-border bg-[#0F172A] flex flex-col transition-all duration-200 ${
        minimized ? "h-9" : "h-48"
      }`}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={clearTerminal}
            aria-label="Clear terminal"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <button
            className="p-1 rounded hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={toggleMinimized}
            aria-label={minimized ? "Expand terminal" : "Minimize terminal"}
            title={minimized ? "Expand terminal" : "Minimize terminal"}
          >
            {minimized ? (
              <Maximize2 className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Xterm container */}
      {!minimized && (
        <div className="flex-1 overflow-hidden p-1">
          <div ref={terminalRef} className="h-full w-full" />
          {!xtermLoaded && (
            <div className="flex items-center gap-2 p-3 text-xs text-text-muted">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Loading terminal...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function writePrompt(term: any) {
  term.write("\x1b[32mspindle\x1b[0m ❯ ");
}

/** Build an ASCII tree representation from FileNode[] */
function buildTreeString(nodes: import("../../types/workspace").FileNode[]): string {
  const lines: string[] = [];

  function walk(items: typeof nodes, indent: string) {
    for (let i = 0; i < items.length; i++) {
      const isLast = i === items.length - 1;
      const prefix = indent + (isLast ? "└── " : "├── ");
      const item = items[i];
      if (item.type === "directory") {
        lines.push(`${prefix}${item.name}/`);
        const childIndent = indent + (isLast ? "    " : "│   ");
        if (item.children) walk(item.children, childIndent);
      } else {
        lines.push(`${prefix}${item.name}`);
      }
    }
  }

  // Sort: directories first, then files
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  walk(sorted, "");
  return lines.join("\n");
}

function processCommand(cmd: string, term: any) {
  const args = cmd.trim().split(/\s+/);
  const command = args[0]?.toLowerCase();
  const store = useWorkspaceStore.getState();

  switch (command) {
    case "help":
      term.writeln("\x1b[36mAvailable commands:\x1b[0m");
      term.writeln("  help        Show this help message");
      term.writeln("  clear       Clear the terminal");
      term.writeln("  ls          List workspace files");
      term.writeln("  tree        Show ASCII tree of workspace files");
      term.writeln("  echo        Print a message");
      term.writeln("  build       Simulate a build process");
      term.writeln("  date        Show current date and time");
      term.writeln("  save        Save workspace to storage");
      writePrompt(term);
      break;

    case "clear":
      term.clear();
      writePrompt(term);
      break;

    case "ls": {
      term.writeln("\x1b[36mFiles in workspace:\x1b[0m");
      const files = store.fileTree;
      if (files.length === 0) {
        term.writeln("  (empty workspace)");
      } else {
        // Simple flat list with indentation
        function listFlat(nodes: typeof files, depth: number) {
          for (const n of nodes) {
            const indent = "  ".repeat(depth + 1);
            const suffix = n.type === "directory" ? "/" : "";
            term.writeln(`${indent}${n.name}${suffix}`);
            if (n.type === "directory" && n.children) {
              listFlat(n.children, depth + 1);
            }
          }
        }
        listFlat(files, 0);
      }
      writePrompt(term);
      break;
    }

    case "tree": {
      const files = store.fileTree;
      if (files.length === 0) {
        term.writeln("(empty workspace)");
      } else {
        const tree = buildTreeString(files);
        term.writeln(tree);
      }
      writePrompt(term);
      break;
    }

    case "echo":
      term.writeln(args.slice(1).join(" "));
      writePrompt(term);
      break;

    case "build":
      term.writeln("\x1b[33mBuilding project...\x1b[0m");
      setTimeout(() => {
        term.writeln("\x1b[32m✓ TypeScript compilation passed\x1b[0m");
        setTimeout(() => {
          term.writeln("\x1b[32m✓ Vite bundle complete (2.34s)\x1b[0m");
          term.writeln("\x1b[32m✓ Build successful!\x1b[0m");
          writePrompt(term);
        }, 500);
      }, 800);
      break;

    case "save":
      store.saveToStorage().then((ok) => {
        if (ok) {
          term.writeln("\x1b[32m✓ Workspace saved to storage\x1b[0m");
        } else {
          term.writeln("\x1b[31m✗ Failed to save workspace\x1b[0m");
        }
        writePrompt(term);
      });
      break;

    case "date":
      term.writeln(new Date().toString());
      writePrompt(term);
      break;

    default:
      if (command) {
        term.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
        term.writeln("Type 'help' for available commands.");
      }
      writePrompt(term);
  }
}