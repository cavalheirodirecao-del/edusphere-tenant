import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import GestorDashboard from "./pages/gestor/GestorDashboard";
import CourseEditor from "./pages/gestor/CourseEditor";
import AlunoDashboard from "./pages/aluno/AlunoDashboard";
import CoursePlayer from "./pages/aluno/CoursePlayer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route
              path="/gestor"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <GestorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestor/cursos/:id"
              element={
                <ProtectedRoute requiredRole="gestor">
                  <CourseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno"
              element={
                <ProtectedRoute requiredRole="aluno">
                  <AlunoDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/cursos/:id"
              element={
                <ProtectedRoute requiredRole="aluno">
                  <CoursePlayer />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
