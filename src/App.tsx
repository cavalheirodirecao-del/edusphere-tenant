import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import GestorDashboardNew from "./pages/gestor/GestorDashboardNew";
import ContentManager from "./pages/gestor/ContentManager";
import StudentsManager from "./pages/gestor/StudentsManager";
import AlunoDashboardNew from "./pages/aluno/AlunoDashboardNew";
import CursosBrowser from "./pages/aluno/CursosBrowser";
import LessonPlayer from "./pages/aluno/LessonPlayer";
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
            <Route path="/gestor" element={<ProtectedRoute requiredRole="gestor"><GestorDashboardNew /></ProtectedRoute>} />
            <Route path="/gestor/dashboard" element={<ProtectedRoute requiredRole="gestor"><GestorDashboardNew /></ProtectedRoute>} />
            <Route path="/gestor/conteudo" element={<ProtectedRoute requiredRole="gestor"><ContentManager /></ProtectedRoute>} />
            <Route path="/gestor/alunos" element={<ProtectedRoute requiredRole="gestor"><StudentsManager /></ProtectedRoute>} />
            <Route path="/aluno" element={<ProtectedRoute requiredRole="aluno"><AlunoDashboardNew /></ProtectedRoute>} />
            <Route path="/aluno/dashboard" element={<ProtectedRoute requiredRole="aluno"><AlunoDashboardNew /></ProtectedRoute>} />
            <Route path="/aluno/cursos" element={<ProtectedRoute requiredRole="aluno"><CursosBrowser /></ProtectedRoute>} />
            <Route path="/aluno/aulas/:id" element={<ProtectedRoute requiredRole="aluno"><LessonPlayer /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
