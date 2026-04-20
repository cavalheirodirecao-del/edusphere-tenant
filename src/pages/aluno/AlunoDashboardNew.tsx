import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Play, Sparkles } from "lucide-react";

interface Continue { lessonId: string; title: string; courseTitle: string; updatedAt: string }

export default function AlunoDashboardNew() {
  const { user, profile } = useAuth();
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [last, setLast] = useState<Continue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, themes(id, lessons(id, title))");
      const lessonMeta = new Map<string, { title: string; courseTitle: string }>();
      const allLessonIds: string[] = [];
      (courses ?? []).forEach((c) =>
        ((c.themes as { id: string; lessons: { id: string; title: string }[] }[] | null) ?? []).forEach((t) =>
          (t.lessons ?? []).forEach((l) => {
            allLessonIds.push(l.id);
            lessonMeta.set(l.id, { title: l.title, courseTitle: c.title });
          }),
        ),
      );

      const { data: progress } = allLessonIds.length
        ? await supabase
            .from("lesson_progress")
            .select("lesson_id, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
        : { data: [] as { lesson_id: string; updated_at: string }[] };

      const validProg = (progress ?? []).filter((p) => lessonMeta.has(p.lesson_id));
      setTotal(allLessonIds.length);
      setDone(validProg.length);
      setPct(allLessonIds.length ? Math.round((validProg.length / allLessonIds.length) * 100) : 0);

      if (validProg[0]) {
        const m = lessonMeta.get(validProg[0].lesson_id)!;
        setLast({
          lessonId: validProg[0].lesson_id,
          title: m.title,
          courseTitle: m.courseTitle,
          updatedAt: validProg[0].updated_at,
        });
      }
      setLoading(false);
    })();
  }, [user, profile]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Dashboard" />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Olá, {profile?.full_name || profile?.username}</p>
          <h1 className="font-display text-3xl font-semibold">
            Sua jornada na <span className="gradient-text">Cavalheiro Academy</span>
          </h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div className="surface-card rounded-2xl p-6 shadow-glow">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Progresso geral</p>
                  <p className="font-display text-lg font-semibold">{done} de {total} aulas concluídas</p>
                </div>
              </div>
              <Progress value={pct} className="h-3" />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Continue assim!</span>
                <span className="gradient-text font-display text-2xl font-semibold">{pct}%</span>
              </div>
              <div className="mt-6">
                <Button variant="hero" asChild>
                  <Link to="/aluno/cursos"><BookOpen className="h-4 w-4" /> Ver todos os cursos</Link>
                </Button>
              </div>
            </div>

            <div className="surface-card rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Última aula</p>
              {last ? (
                <>
                  <p className="mt-2 font-display text-lg font-semibold">{last.title}</p>
                  <p className="text-sm text-muted-foreground">{last.courseTitle}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(last.updatedAt).toLocaleString("pt-BR")}
                  </p>
                  <Button variant="glow" className="mt-4 w-full" asChild>
                    <Link to={`/aluno/aulas/${last.lessonId}`}>
                      <Play className="h-4 w-4" /> Continuar
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">Você ainda não assistiu nenhuma aula.</p>
                  <Button variant="hero" className="mt-4 w-full" asChild>
                    <Link to="/aluno/cursos"><BookOpen className="h-4 w-4" /> Começar agora</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}