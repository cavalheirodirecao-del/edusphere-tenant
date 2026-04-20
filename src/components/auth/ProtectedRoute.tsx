import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: JSX.Element;
  requiredRole?: AppRole;
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;
  if (requiredRole && role !== requiredRole) {
    const target = role === "gestor" ? "/gestor" : "/aluno";
    return <Navigate to={target} replace />;
  }
  return children;
}