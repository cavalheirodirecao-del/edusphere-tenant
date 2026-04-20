import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LessonFull {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  position: number;
  themes: {
    id: string;
    title: string;
    courses: { id: string; title: string };
    lessons: { id: string; title: string; position: number }[];
  };
}

interface ProgressRow { watched_seconds: number; completed_at: string }

export default function LessonPlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [neighbors, setNeighbors] = useState<{ prev?: string; next?: string }>({});
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select(`
          id, title, description, video_url, position,
          themes:theme_id (
            id, title,
            courses:course_id ( id, title ),
            lessons ( id, title, position )
          )
        `)
        .eq("id", id)
        .maybeSingle();
      const l = data as unknown as LessonFull | null;
      setLesson(l);
      if (l) {
        const sorted = [...(l.themes.lessons ?? [])].sort((a, b) => a.position - b.position);
        const idx = sorted.findIndex((x) => x.id === l.id);
        setNeighbors({
          prev: idx > 0 ? sorted[idx - 1].id : undefined,
          next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1].id : undefined,
        });
      }

      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("watched_seconds, completed_at")
        .eq("user_id", user.id)
        .eq("lesson_id", id)
        .maybeSingle();
      if (prog) {
        setProgress(prog as ProgressRow);
        setCompleted(true);
        completedRef.current = true;
      } else {
        setProgress(null);
        setCompleted(false);
        completedRef.current = false;
      }
      setLoading(false);
    })();
  }, [id, user]);

  const upsertProgress = async (seconds: number, markDone = false) => {
    if (!user || !id) return;
    const payload = {
      user_id: user.id,
      lesson_id: id,
      watched_seconds: seconds,
      updated_at: new Date().toISOString(),
      ...(markDone ? { completed_at: new Date().toISOString() } : {}),
    };
    await supabase.from("lesson_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  };

  const onTimeUpdate = (currentSeconds: number, duration: number) => {
    upsertProgress(currentSeconds);
    if (!completedRef.current && duration > 0 && currentSeconds / duration >= 0.9) {
      completedRef.current = true;
      setCompleted(true);
      upsertProgress(currentSeconds, true);
      toast({ title: "Aula concluída! ✨" });
    }
  };

  const toggleComplete = async () => {
    if (!user || !id) return;
    setMarking(true);
    if (completed) {
      await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", id);
      setCompleted(false);
      completedRef.current = false;
    } else {
      await upsertProgress(progress?.watched_seconds ?? 0, true);
      setCompleted(true);
      completedRef.current = true;
    }
    setMarking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader title="Aula" />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="min-h-screen">
        <AppHeader title="Aula" />
        <p className="container py-10 text-muted-foreground">Aula não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Aula" />
      <main className="container py-8">
        <Link to="/aluno/cursos" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {lesson.themes.courses.title} · {lesson.themes.title}
          </p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
        </div>

        <VideoPlayer
          url={lesson.video_url}
          initialSeconds={progress?.watched_seconds}
          onTimeUpdate={onTimeUpdate}
        />

        {lesson.description && (
          <div className="surface-card mt-6 rounded-2xl p-5 text-sm text-muted-foreground">
            {lesson.description}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant={completed ? "glow" : "hero"}
            onClick={toggleComplete}
            disabled={marking}
          >
            {marking ? <Loader2 className="h-4 w-4 animate-spin" /> :
              completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {completed ? "Concluída" : "Marcar como concluída"}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={!neighbors.prev}
              onClick={() => neighbors.prev && navigate(`/aluno/aulas/${neighbors.prev}`)}
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="hero"
              disabled={!neighbors.next}
              onClick={() => neighbors.next && navigate(`/aluno/aulas/${neighbors.next}`)}
            >
              Próxima <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}