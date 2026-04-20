import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2, GripVertical, Play } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
}
interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  position: number;
}

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from("courses").select("id, title, description").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("id, title, description, video_url, position").eq("course_id", id).order("position"),
    ]);
    setCourse(c as Course | null);
    setLessons((l ?? []) as Lesson[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const deleteCourse = async () => {
    if (!confirm("Excluir este curso e todas as aulas?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id!);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    navigate("/gestor", { replace: true });
  };

  const deleteLesson = async (lid: string) => {
    if (!confirm("Excluir aula?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", lid);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="min-h-screen">
      <AppHeader title="Editor de Curso" />
      <main className="container py-10">
        <Link to="/gestor" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !course ? (
          <p className="text-muted-foreground">Curso não encontrado.</p>
        ) : (
          <>
            <div className="surface-card mb-6 rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold">{course.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.description || "Sem descrição"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={deleteCourse} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Excluir curso
                </Button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Aulas ({lessons.length})</h2>
              <NewLessonDialog courseId={id!} nextPosition={lessons.length} onCreated={load} />
            </div>

            {lessons.length === 0 ? (
              <div className="surface-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
                Adicione a primeira aula com uma URL de vídeo (YouTube, Vimeo ou .mp4).
              </div>
            ) : (
              <ul className="space-y-3">
                {lessons.map((l, i) => (
                  <li
                    key={l.id}
                    className="surface-card flex items-center gap-4 rounded-xl p-4"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Play className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {i + 1}. {l.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{l.video_url}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLesson(l.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NewLessonDialog({
  courseId,
  nextPosition,
  onCreated,
}: {
  courseId: string;
  nextPosition: number;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2 || !videoUrl.trim()) {
      toast({ title: "Preencha título e URL", variant: "destructive" });
      return;
    }
    try {
      new URL(videoUrl);
    } catch {
      toast({ title: "URL inválida", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoUrl.trim(),
      position: nextPosition,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setTitle(""); setDescription(""); setVideoUrl("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4" /> Nova aula
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lt">Título</Label>
            <Input id="lt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lv">URL do vídeo (YouTube, Vimeo ou .mp4)</Label>
            <Input id="lv" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ld">Descrição (opcional)</Label>
            <Textarea id="ld" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}