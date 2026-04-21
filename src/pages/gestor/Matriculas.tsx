import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { GestorNav } from "@/components/GestorNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, Users, BookOpen, CheckSquare, Square } from "lucide-react";

interface Student { id: string; full_name: string | null; username: string; store: string | null }
interface Course { id: string; title: string }
interface EnrollmentSet { [key: string]: boolean } // "userId:courseId" -> true

export default function Matriculas() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<EnrollmentSet>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!profile) return;
    setLoading(true);

    const [rolesRes, coursesRes, enrollRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("tenant_id", profile.tenant_id).eq("role", "aluno"),
      supabase.from("courses").select("id, title").order("position", { ascending: true }),
      supabase.from("enrollments").select("user_id, course_id"),
    ]);

    const studentIds = (rolesRes.data ?? []).map((r) => r.user_id);
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, store")
        .in("id", studentIds)
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      setStudents((profiles ?? []) as Student[]);
    } else {
      setStudents([]);
    }

    setCourses((coursesRes.data ?? []) as Course[]);

    const set: EnrollmentSet = {};
    for (const e of enrollRes.data ?? []) {
      set[`${e.user_id}:${e.course_id}`] = true;
    }
    setEnrolled(set);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const filteredStudents = useMemo(
    () => students.filter((s) => {
      const q = search.toLowerCase();
      return !q || (s.full_name ?? "").toLowerCase().includes(q) || s.username.includes(q) || (s.store ?? "").toLowerCase().includes(q);
    }),
    [students, search]
  );

  const isEnrolled = (userId: string, courseId: string) => !!enrolled[`${userId}:${courseId}`];

  const toggleCell = async (userId: string, courseId: string) => {
    const key = `${userId}:${courseId}`;
    const currently = !!enrolled[key];
    const next = { ...enrolled };

    if (currently) {
      const { error } = await supabase.from("enrollments").delete().eq("user_id", userId).eq("course_id", courseId);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      delete next[key];
    } else {
      const { error } = await supabase.from("enrollments").insert({ user_id: userId, course_id: courseId, enrolled_by: user!.id });
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      next[key] = true;
    }
    setEnrolled(next);
  };

  const applyBulk = async (enroll: boolean) => {
    if (selectedStudents.size === 0 || selectedCourses.size === 0) {
      return toast({ title: "Selecione alunos e cursos antes de aplicar", variant: "destructive" });
    }
    setSaving(true);
    const next = { ...enrolled };

    if (enroll) {
      const toInsert: { user_id: string; course_id: string; enrolled_by: string }[] = [];
      for (const uid of selectedStudents) {
        for (const cid of selectedCourses) {
          const key = `${uid}:${cid}`;
          if (!next[key]) {
            toInsert.push({ user_id: uid, course_id: cid, enrolled_by: user!.id });
          }
        }
      }
      if (toInsert.length > 0) {
        const { error } = await supabase.from("enrollments").insert(toInsert);
        if (error) { setSaving(false); return toast({ title: "Erro", description: error.message, variant: "destructive" }); }
        for (const r of toInsert) next[`${r.user_id}:${r.course_id}`] = true;
        toast({ title: `${toInsert.length} matrículas criadas` });
      } else {
        toast({ title: "Todos já estavam matriculados" });
      }
    } else {
      for (const uid of selectedStudents) {
        for (const cid of selectedCourses) {
          const key = `${uid}:${cid}`;
          if (next[key]) {
            await supabase.from("enrollments").delete().eq("user_id", uid).eq("course_id", cid);
            delete next[key];
          }
        }
      }
      toast({ title: "Matrículas removidas" });
    }

    setEnrolled(next);
    setSelectedStudents(new Set());
    setSelectedCourses(new Set());
    setSaving(false);
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleAllCourses = () => {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(courses.map((c) => c.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudents);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedStudents(next);
  };

  const toggleCourse = (id: string) => {
    const next = new Set(selectedCourses);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedCourses(next);
  };

  const countEnrollments = (userId: string) => courses.filter((c) => isEnrolled(userId, c.id)).length;

  return (
    <div className="min-h-screen">
      <AppHeader title="Matrículas" />
      <GestorNav />
      <main className="container py-10">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold">Matrículas</h1>
          <p className="text-sm text-muted-foreground">Controle quais alunos têm acesso a quais cursos</p>
        </div>

        {/* Ações em lote */}
        {(selectedStudents.size > 0 || selectedCourses.size > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {selectedStudents.size} aluno{selectedStudents.size !== 1 ? "s" : ""} ·{" "}
              {selectedCourses.size} curso{selectedCourses.size !== 1 ? "s" : ""} selecionados
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="hero" size="sm" onClick={() => applyBulk(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                Matricular selecionados
              </Button>
              <Button variant="destructive" size="sm" onClick={() => applyBulk(false)} disabled={saving}>
                <Square className="h-4 w-4" /> Remover matrículas
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Painel de alunos */}
            <div className="w-64 shrink-0">
              <div className="surface-card rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Alunos</span>
                  </div>
                  <button onClick={toggleAllStudents} className="text-xs text-primary hover:underline">
                    {selectedStudents.size === filteredStudents.length ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-sm" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {filteredStudents.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary/40">
                      <Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.full_name || s.username}</p>
                        <p className="text-xs text-muted-foreground">{s.store || "@" + s.username}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">{countEnrollments(s.id)}/{courses.length}</Badge>
                    </label>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Nenhum aluno</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela de matrículas */}
            <div className="flex-1 overflow-x-auto">
              <div className="surface-card rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Cursos</span>
                  </div>
                  <button onClick={toggleAllCourses} className="text-xs text-primary hover:underline">
                    {selectedCourses.size === courses.length ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="w-40 text-left pb-2 pr-4 font-medium text-muted-foreground">Aluno</th>
                      {courses.map((c) => (
                        <th key={c.id} className="pb-2 px-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={selectedCourses.has(c.id)}
                              onCheckedChange={() => toggleCourse(c.id)}
                            />
                            <span className="max-w-[80px] truncate text-xs font-medium" title={c.title}>{c.title}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className={selectedStudents.has(s.id) ? "bg-primary/5" : ""}>
                        <td className="pr-4 py-2 font-medium truncate max-w-[140px]" title={s.full_name ?? s.username}>
                          {s.full_name || s.username}
                        </td>
                        {courses.map((c) => (
                          <td key={c.id} className="px-2 py-2 text-center">
                            <Checkbox
                              checked={isEnrolled(s.id, c.id)}
                              onCheckedChange={() => toggleCell(s.id, c.id)}
                              className={isEnrolled(s.id, c.id) ? "border-primary data-[state=checked]:bg-primary" : ""}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={courses.length + 1} className="py-10 text-center text-muted-foreground">
                          Nenhum aluno ativo encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
