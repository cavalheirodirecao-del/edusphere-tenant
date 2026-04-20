import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Loader2, ArrowRight } from "lucide-react";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  total: number;
  done: number;
}

export default function AlunoDashboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, description, lessons(id)")
        .order("created_at", { ascending: false });

      const lessonIds =
        courses?.flatMap((c) => (c.lessons as { id: string }[] | null)?.map((l) => l.id) ?? []) ?? [];

      let doneByCourse = new Map<string, number>();
      if (lessonIds.length && user) {
        const { data: prog } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);
        const doneSet = new Set((prog ?? []).map((p) => p.lesson_id));
        for (const c of courses ?? []) {
          const ls = (c.lessons as { id: string }[] | null) ?? [];
          doneByCourse.set(c.id, ls.filter((l) => doneSet.has(l.id)).length);
        }
      }

      setRows(
        (courses ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          total: ((c.lessons as { id: string }[] | null) ?? []).length,
          done: doneByCourse.get(c.id) ?? 0,
        })),
      );
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Meus Cursos" />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Olá, {profile?.full_name || profile?.username}</p>
          <h1 className="font-display text-3xl font-semibold">
            Sua trilha na <span className="gradient-text">{profile?.tenant_name}</span>
          </h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="surface-card rounded-2xl p-12 text-center text-sm text-muted-foreground">
            Ainda não há cursos disponíveis. Volte em breve.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  to={`/aluno/cursos/${c.id}`}
                  className="surface-card group flex flex-col gap-4 rounded-2xl p-5 transition-smooth hover:border-primary/40 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.done}/{c.total} aulas
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.description || "Sem descrição"}
                  </p>
                  <div className="mt-auto space-y-2">
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{pct}% concluído</span>
                      <ArrowRight className="h-4 w-4 text-primary opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}