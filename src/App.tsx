import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Memory from "./pages/Memory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Lazy-loaded route for heavy pages
const Workspace = lazy(() => import("./pages/Workspace"));

function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span className="text-xs text-text-muted">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/profile" element={<Profile />} />

              {/* Chat — Task 3 */}
              <Route
                path="/chat"
                element={<Chat />}
              />

              {/* Harnesses / Workspace — Task 4 */}
              <Route
                path="/workspace"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Workspace />
                  </Suspense>
                }
              />

              {/* Skills Marketplace — Task 6 */}
              <Route
                path="/skills"
                element={
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    Skills Marketplace — Coming Soon
                  </div>
                }
              />

              {/* Apps */}
              <Route
                path="/apps"
                element={
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    Apps — Coming Soon
                  </div>
                }
              />

              {/* Memory — Task 5 */}
              <Route
                path="/memory"
                element={<Memory />}
              />

              {/* History */}
              <Route
                path="/history"
                element={
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    History — Coming Soon
                  </div>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}