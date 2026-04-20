import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AppHeader({ title }: { title: string }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">
              {profile?.tenant_name} · {role === "gestor" ? "Gestor" : "Aluno"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{profile?.full_name || profile?.username}</p>
            <p className="text-xs text-muted-foreground">@{profile?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </header>
  );
}