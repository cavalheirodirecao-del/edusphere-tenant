import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "@/components/VideoPlayer";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Course { id: string; title: string; description: string | null }
interface Lesson { id: string; title: string; description: string | null; video_url: string; position: number }

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const active = useMemo(() => lessons.find((l) => l.id === activeId) ?? null, [lessons, activeId]);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from("courses").select("id, title, description").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("id, title, description, video_url, position").eq("course_id", id).order("position"),
    ]);
    const lessonRows = (l ?? []) as Lesson[];
    setCourse(c as Course | null);
    setLessons(lessonRows);
    if (lessonRows.length) setActiveId((prev) => prev ?? lessonRows[0].id);
    if (lessonRows.length) {
      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", lessonRows.map((x) => x.id));
      setDoneIds(new Set((prog ?? []).map((p) => p.lesson_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const toggleDone = async () => {
    if (!active || !user) return;
    setMarking(true);
    const isDone = doneIds.has(active.id);
    if (isDone) {
      await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", active.id);
      const next = new Set(doneIds); next.delete(active.id); setDoneIds(next);
    } else {
      const { error } = await supabase
        .from("lesson_progress")
        .insert({ user_id: user.id, lesson_id: active.id });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        const next = new Set(doneIds); next.add(active.id); setDoneIds(next);
        // auto-avançar
        const idx = lessons.findIndex((l) => l.id === active.id);
        if (idx >= 0 && idx < lessons.length - 1) setActiveId(lessons[idx + 1].id);
      }
    }
    setMarking(false);
  };

  const pct = lessons.length ? Math.round((doneIds.size / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen">
      <AppHeader title="Player" />
      <main className="container py-8">
        <Link to="/aluno" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Meus cursos
        </Link>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !course ? (
          <p className="text-muted-foreground">Curso não encontrado.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {active ? (
                <>
                  <VideoPlayer url={active.video_url} />
                  <div className="surface-card rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{course.title}</p>
                        <h1 className="font-display text-2xl font-semibold">{active.title}</h1>
                      </div>
                      <Button
                        variant={doneIds.has(active.id) ? "glow" : "hero"}
                        onClick={toggleDone}
                        disabled={marking}
                      >
                        {marking ? <Loader2 className="h-4 w-4 animate-spin" /> :
                          doneIds.has(active.id) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        {doneIds.has(active.id) ? "Concluída" : "Marcar como concluída"}
                      </Button>
                    </div>
                    {active.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{active.description}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="surface-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
                  Este curso ainda não tem aulas.
                </div>
              )}
            </div>

            <aside className="surface-card sticky top-20 h-fit rounded-2xl p-4">
              <div className="mb-4 px-2">
                <p className="text-xs text-muted-foreground">Progresso</p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{doneIds.size}/{lessons.length} aulas</span>
                  <span className="gradient-text font-semibold">{pct}%</span>
                </div>
                <Progress value={pct} className="mt-2 h-1.5" />
              </div>
              <ul className="space-y-1">
                {lessons.map((l, i) => {
                  const done = doneIds.has(l.id);
                  const isActive = l.id === activeId;
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => setActiveId(l.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-smooth ${
                          isActive
                            ? "bg-primary/15 text-foreground border border-primary/30"
                            : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">
                          {i + 1}. {l.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}