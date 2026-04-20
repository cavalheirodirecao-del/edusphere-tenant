import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Circle, Layers, Loader2, Play } from "lucide-react";

interface Lesson { id: string; title: string; position: number }
interface Theme { id: string; title: string; position: number; lessons: Lesson[] }
interface Module { id: string; title: string; description: string | null; position: number; themes: Theme[] }

export default function CursosBrowser() {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, position, themes(id, title, position, lessons(id, title, position))")
        .order("position", { ascending: true });
      const sorted = (data ?? []).map((m) => ({
        ...m,
        themes: (((m as unknown as Module).themes) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((t) => ({ ...t, lessons: (t.lessons ?? []).sort((a, b) => a.position - b.position) })),
      })) as unknown as Module[];
      setModules(sorted);

      const allIds = sorted.flatMap((m) => m.themes.flatMap((t) => t.lessons.map((l) => l.id)));
      if (allIds.length) {
        const { data: prog } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", allIds);
        setDoneIds(new Set((prog ?? []).map((p) => p.lesson_id)));
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Cursos" />
      <main className="container py-10">
        <h1 className="font-display text-3xl font-semibold">Catálogo de cursos</h1>
        <p className="mb-8 text-sm text-muted-foreground">Navegue entre módulos, temas e aulas.</p>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : modules.length === 0 ? (
          <div className="surface-card rounded-2xl p-12 text-center text-sm text-muted-foreground">
            Ainda não há cursos disponíveis.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {modules.map((m) => {
              const all = m.themes.flatMap((t) => t.lessons);
              const done = all.filter((l) => doneIds.has(l.id)).length;
              const pct = all.length ? Math.round((done / all.length) * 100) : 0;
              return (
                <AccordionItem key={m.id} value={m.id} className="surface-card rounded-2xl border-border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex w-full items-center gap-4 pr-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-display font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{done}/{all.length} aulas</p>
                      </div>
                      <div className="hidden w-32 sm:block">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <span className="hidden gradient-text text-sm font-semibold sm:inline w-10 text-right">{pct}%</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {m.themes.map((t) => (
                        <div key={t.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <p className="font-medium">{t.title}</p>
                            <span className="text-xs text-muted-foreground">({t.lessons.length})</span>
                          </div>
                          <ul className="space-y-1">
                            {t.lessons.map((l, i) => {
                              const isDone = doneIds.has(l.id);
                              return (
                                <li key={l.id}>
                                  <Link
                                    to={`/aluno/aulas/${l.id}`}
                                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-smooth hover:bg-primary/10"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="flex-1 truncate">{i + 1}. {l.title}</span>
                                    <Play className="h-3.5 w-3.5 text-primary opacity-0 transition group-hover:opacity-100" />
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>
    </div>
  );
}