import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function GestorNav() {
  const items = [
    { to: "/gestor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/gestor/conteudo", label: "Conteúdo", icon: BookOpen },
    { to: "/gestor/alunos", label: "Alunos", icon: Users },
  ];
  return (
    <nav className="container flex gap-1 overflow-x-auto border-b border-border/60 py-2">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
              isActive
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )
          }
        >
          <it.icon className="h-4 w-4" /> {it.label}
        </NavLink>
      ))}
    </nav>
  );
}