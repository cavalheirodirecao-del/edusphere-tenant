import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { GestorNav } from "@/components/GestorNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, UserCheck, UserX, Search, KeyRound } from "lucide-react";

interface Student {
  id: string;
  full_name: string | null;
  username: string;
  store: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StudentsManager() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "aluno");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, store, is_active, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setStudents((data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const toggle = async (s: Student) => {
    const { error } = await supabase.functions.invoke("toggle-student", {
      body: { user_id: s.id, active: !s.is_active },
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: s.is_active ? "Aluno desativado" : "Aluno reativado" });
    load();
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.username.includes(q) ||
      (s.full_name ?? "").toLowerCase().includes(q) ||
      (s.store ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen">
      <AppHeader title="Alunos" />
      <GestorNav />
      <main className="container py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Alunos</h1>
            <p className="text-sm text-muted-foreground">{students.length} cadastrados · {students.filter(s => s.is_active).length} ativos</p>
          </div>
          <NewStudentDialog onCreated={load} />
        </div>

        <div className="mb-4 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, usuário ou loja..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="surface-card overflow-hidden rounded-2xl">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum aluno encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">@{s.username}</TableCell>
                    <TableCell className="text-muted-foreground">{s.store || "—"}</TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <ResetPasswordDialog student={s} />
                      <Button variant="ghost" size="sm" onClick={() => toggle(s)}>
                        {s.is_active ? <><UserX className="h-4 w-4" /> Desativar</> : <><UserCheck className="h-4 w-4" /> Reativar</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}

function ResetPasswordDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) return toast({ title: "Senha deve ter ao menos 8 caracteres", variant: "destructive" });
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("reset-student-password", {
      body: { user_id: student.id, new_password: password },
    });
    setSaving(false);
    const errMsg = (data as { error?: string })?.error || error?.message;
    if (errMsg) return toast({ title: "Erro ao redefinir senha", description: errMsg, variant: "destructive" });
    toast({ title: "Senha redefinida", description: `Nova senha definida para @${student.username}` });
    setPassword(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setPassword(""); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <KeyRound className="h-4 w-4" /> Senha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>Definir nova senha para <strong>@{student.username}</strong> ({student.full_name})</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nova senha (mín. 8 caracteres)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewStudentDialog({ onCreated }: { onCreated: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [store, setStore] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-student", {
        body: { full_name: fullName, username: username.toLowerCase(), store, password },
      });
      const errMsg = (data as { error?: string })?.error || error?.message;
      if (errMsg) return toast({ title: "Falha", description: errMsg, variant: "destructive" });
      toast({ title: "Aluno cadastrado", description: `Login: ${profile?.tenant_slug} / ${username}` });
      setFullName(""); setUsername(""); setStore(""); setPassword("");
      setOpen(false); onCreated();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero"><UserPlus className="h-4 w-4" /> Cadastrar aluno</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>Login: <strong>{profile?.tenant_slug}</strong> / usuário / senha</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Usuário (login)</Label><Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="joao.silva" maxLength={40} spellCheck={false} /></div>
            <div className="space-y-2"><Label>Loja</Label><Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Filial Centro" maxLength={80} /></div>
          </div>
          <div className="space-y-2"><Label>Senha (mín. 8)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}