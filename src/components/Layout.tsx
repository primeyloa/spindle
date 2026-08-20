import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useUIStore } from "../lib/store";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";

export default function Layout() {
  const { setSidebarCollapsed } = useUIStore();

  // Responsive: auto-collapse sidebar below 768px
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    }
    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarCollapsed]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  );
}