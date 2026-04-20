import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { GestorNav } from "@/components/GestorNav";
import { useAuth } from "@/contexts/AuthContext";
import { Users, BookOpen, Activity, CheckCircle2, Loader2 } from "lucide-react";

interface Stats {
  totalAlunos: number;
  alunosAtivos: number;
  totalAulas: number;
  progressoMedio: number;
  concluidasHoje: number;
}

export default function GestorDashboardNew() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const tenantId = profile.tenant_id;

      // alunos do tenant (via roles)
      const { data: alunoRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("role", "aluno");
      const alunoIds = (alunoRoles ?? []).map((r) => r.user_id);

      const { data: alunoProfiles } = alunoIds.length
        ? await supabase.from("profiles").select("id, is_active").in("id", alunoIds)
        : { data: [] as { id: string; is_active: boolean }[] };

      // aulas do tenant
      const { data: courses } = await supabase
        .from("courses")
        .select("id, themes(id, lessons(id))")
        .eq("tenant_id", tenantId);
      const lessonIds: string[] = [];
      (courses ?? []).forEach((c) =>
        (c.themes as { id: string; lessons: { id: string }[] }[] | null)?.forEach((t) =>
          (t.lessons ?? []).forEach((l) => lessonIds.push(l.id)),
        ),
      );

      // progresso
      const { data: progress } = lessonIds.length
        ? await supabase
            .from("lesson_progress")
            .select("user_id, lesson_id, completed_at")
            .in("lesson_id", lessonIds)
        : { data: [] as { user_id: string; lesson_id: string; completed_at: string }[] };

      const totalAlunos = alunoProfiles?.length ?? 0;
      const alunosAtivos = (alunoProfiles ?? []).filter((p) => p.is_active).length;
      const totalAulas = lessonIds.length;

      let progressoMedio = 0;
      if (totalAlunos && totalAulas) {
        const doneByUser = new Map<string, number>();
        for (const p of progress ?? []) {
          doneByUser.set(p.user_id, (doneByUser.get(p.user_id) ?? 0) + 1);
        }
        const sum = (alunoProfiles ?? []).reduce(
          (acc, a) => acc + (doneByUser.get(a.id) ?? 0) / totalAulas,
          0,
        );
        progressoMedio = Math.round((sum / totalAlunos) * 100);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const concluidasHoje = (progress ?? []).filter(
        (p) => new Date(p.completed_at) >= today,
      ).length;

      setStats({ totalAlunos, alunosAtivos, totalAulas, progressoMedio, concluidasHoje });
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Dashboard" />
      <GestorNav />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Bem-vindo, {profile?.full_name || profile?.username}</p>
          <h1 className="font-display text-3xl font-semibold">
            Visão geral da <span className="gradient-text">{profile?.tenant_name}</span>
          </h1>
        </div>

        {loading || !stats ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total de alunos" value={stats.totalAlunos} sub={`${stats.alunosAtivos} ativos`} />
            <StatCard icon={Activity} label="Progresso médio" value={`${stats.progressoMedio}%`} sub="dos alunos" highlight />
            <StatCard icon={BookOpen} label="Aulas publicadas" value={stats.totalAulas} sub="no total" />
            <StatCard icon={CheckCircle2} label="Concluídas hoje" value={stats.concluidasHoje} sub="por todos" />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`surface-card rounded-2xl p-5 ${highlight ? "border-primary/40 shadow-glow" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}