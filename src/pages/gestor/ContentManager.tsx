import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { GestorNav } from "@/components/GestorNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Trash2, Loader2, FolderOpen, Layers, Play, FileVideo,
} from "lucide-react";

interface Lesson { id: string; title: string; video_url: string; position: number }
interface Theme { id: string; title: string; position: number; lessons: Lesson[] }
interface Module { id: string; title: string; description: string | null; position: number; themes: Theme[] }

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

export default function ContentManager() {
  const { user, profile } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, position, themes(id, title, position, lessons(id, title, video_url, position))")
      .order("position", { ascending: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    const sorted = (data ?? []).map((m) => ({
      ...m,
      themes: (((m as unknown as Module).themes) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((t) => ({ ...t, lessons: (t.lessons ?? []).sort((a, b) => a.position - b.position) })),
    })) as unknown as Module[];
    setModules(sorted);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeModule = async (id: string) => {
    if (!confirm("Excluir módulo e todo o conteúdo?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };
  const removeTheme = async (id: string) => {
    if (!confirm("Excluir tema e suas aulas?")) return;
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };
  const removeLesson = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="min-h-screen">
      <AppHeader title="Conteúdo" />
      <GestorNav />
      <main className="container py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Gestão de conteúdo</h1>
            <p className="text-sm text-muted-foreground">Módulos → Temas → Aulas</p>
          </div>
          <NewModuleDialog
            tenantId={profile!.tenant_id}
            createdBy={user!.id}
            nextPosition={modules.length}
            onCreated={load}
          />
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : modules.length === 0 ? (
          <div className="surface-card rounded-2xl p-12 text-center">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="font-medium">Nenhum módulo ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro módulo para começar a estruturar o curso.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {modules.map((m) => (
              <AccordionItem key={m.id} value={m.id} className="surface-card rounded-2xl border-border px-4">
                <div className="flex items-center gap-3">
                  <AccordionTrigger className="flex-1 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-display font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.themes.length} tema{m.themes.length === 1 ? "" : "s"} ·{" "}
                          {m.themes.reduce((a, t) => a + t.lessons.length, 0)} aulas
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <Button variant="ghost" size="icon" onClick={() => removeModule(m.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {m.themes.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem temas ainda.</p>
                    )}
                    {m.themes.map((t) => (
                      <div key={t.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <p className="font-medium">{t.title}</p>
                            <span className="text-xs text-muted-foreground">({t.lessons.length} aulas)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <NewLessonDialog
                              themeId={t.id}
                              courseId={m.id}
                              nextPosition={t.lessons.length}
                              onCreated={load}
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeTheme(t.id)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {t.lessons.length > 0 && (
                          <ul className="space-y-1">
                            {t.lessons.map((l, i) => (
                              <li key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/40">
                                <Play className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{i + 1}. {l.title}</span>
                                <span className="hidden truncate text-xs text-muted-foreground sm:inline max-w-[260px]">{l.video_url}</span>
                                <Button variant="ghost" size="icon" onClick={() => removeLesson(l.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                    <NewThemeDialog moduleId={m.id} nextPosition={m.themes.length} onCreated={load} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>
    </div>
  );
}

function NewModuleDialog({ tenantId, createdBy, nextPosition, onCreated }: { tenantId: string; createdBy: string; nextPosition: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (title.trim().length < 2) return toast({ title: "Título obrigatório", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("courses").insert({
      tenant_id: tenantId,
      created_by: createdBy,
      title: title.trim(),
      description: description.trim() || null,
      position: nextPosition,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setTitle(""); setDescription(""); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Novo módulo</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo módulo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewThemeDialog({ moduleId, nextPosition, onCreated }: { moduleId: string; nextPosition: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (title.trim().length < 2) return toast({ title: "Título obrigatório", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("themes").insert({ course_id: moduleId, title: title.trim(), position: nextPosition });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setTitle(""); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="glow" size="sm" className="w-full"><Plus className="h-4 w-4" /> Adicionar tema</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo tema</DialogTitle></DialogHeader>
        <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLessonDialog({ themeId, courseId, nextPosition, onCreated }: { themeId: string; courseId: string; nextPosition: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2 || !videoUrl.trim()) return toast({ title: "Preencha título e URL", variant: "destructive" });
    try { new URL(videoUrl); } catch { return toast({ title: "URL inválida", variant: "destructive" }); }
    if (!VIDEO_EXT_RE.test(videoUrl.trim())) {
      const ok = confirm("A URL não termina em .mp4/.webm/.mov. O player HTML5 pode não conseguir reproduzir. Deseja salvar mesmo assim?");
      if (!ok) return;
    }
    setSaving(true);
    const { error } = await supabase.from("lessons").insert({
      theme_id: themeId,
      course_id: courseId,
      title: title.trim(),
      video_url: videoUrl.trim(),
      position: nextPosition,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setTitle(""); setVideoUrl(""); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Aula</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileVideo className="h-5 w-5 text-primary" /> Nova aula</DialogTitle>
          <DialogDescription>Cole o link direto do arquivo .mp4 hospedado na sua VPS.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
          <div className="space-y-2">
            <Label>URL do vídeo (.mp4)</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://video-aulas-filebrowser.dzz1pv.easypanel.host/api/raw/aula1.mp4" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}