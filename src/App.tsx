import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToneProvider } from "@/contexts/ToneContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pending from "./pages/Pending";
import Dashboard from "./pages/Dashboard";
import MCQs from "./pages/MCQs";
import MCQSelection from "./pages/MCQSelection";
import MistakeNotebook from "./pages/MistakeNotebook";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToneProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/pending" element={<Pending />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mcqs"
                element={
                  <ProtectedRoute>
                    <MCQSelection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mcqs/test"
                element={
                  <ProtectedRoute>
                    <MCQs mode="test" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mcqs/practice"
                element={
                  <ProtectedRoute>
                    <MCQs mode="practice" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mistakes"
                element={
                  <ProtectedRoute>
                    <MistakeNotebook />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToneProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
