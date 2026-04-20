import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Loader2, Plus, UserPlus, Users, ArrowRight } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
}

export default function GestorDashboard() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, cover_url, created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setCourses((data ?? []) as Course[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader title="Painel do Gestor" />
      <main className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {profile?.full_name || profile?.username}</p>
            <h1 className="font-display text-3xl font-semibold">
              Cursos da <span className="gradient-text">{profile?.tenant_name}</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <NewStudentDialog />
            <NewCourseDialog onCreated={load} createdBy={user!.id} tenantId={profile!.tenant_id} />
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/gestor/cursos/${c.id}`}
                className="surface-card group flex flex-col gap-3 rounded-2xl p-5 transition-smooth hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {c.description || "Sem descrição"}
                </p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface-card flex flex-col items-center justify-center rounded-2xl p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <BookOpen className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold">Nenhum curso ainda</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Crie seu primeiro curso e adicione aulas em vídeo para os alunos da sua empresa.
      </p>
    </div>
  );
}

function NewCourseDialog({
  onCreated,
  createdBy,
  tenantId,
}: {
  onCreated: () => void;
  createdBy: string;
  tenantId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("courses")
      .insert({ title: title.trim(), description: description.trim() || null, tenant_id: tenantId, created_by: createdBy });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setDescription("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <Plus className="h-4 w-4" /> Novo curso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo curso</DialogTitle>
          <DialogDescription>Você poderá adicionar aulas em seguida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t">Título</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">Descrição</Label>
            <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewStudentDialog() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-student", {
        body: { full_name: fullName, username: username.toLowerCase(), password },
      });
      const errMsg = (data as { error?: string })?.error || error?.message;
      if (errMsg) {
        toast({ title: "Falha", description: errMsg, variant: "destructive" });
        return;
      }
      toast({
        title: "Aluno criado",
        description: `Login: ${profile?.tenant_slug} / ${username}`,
      });
      setFullName("");
      setUsername("");
      setPassword("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow">
          <UserPlus className="h-4 w-4" /> Cadastrar aluno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Novo aluno
          </DialogTitle>
          <DialogDescription>
            O aluno fará login com <strong>{profile?.tenant_slug}</strong> + usuário + senha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fn">Nome completo</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="un">Usuário (login)</Label>
            <Input
              id="un"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              spellCheck={false}
              placeholder="joao.silva"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Senha provisória (mín. 8)</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}