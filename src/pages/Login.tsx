import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildSyntheticEmail, SLUG_RE, USERNAME_RE } from "@/lib/auth-helpers";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Sparkles } from "lucide-react";

const schema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Identificador inválido"),
  username: z.string().trim().toLowerCase().regex(USERNAME_RE, "Usuário inválido"),
  password: z.string().min(1, "Informe a senha").max(100),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "gestor" ? "/gestor" : "/aluno", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: "", username: "", password: "" },
  });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const email = buildSyntheticEmail(values.slug, values.username);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });
      if (error) {
        toast({
          title: "Não foi possível entrar",
          description: "Verifique empresa, usuário e senha.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-hero" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-glow-pulse">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold">
            <span className="gradient-text">Plataforma EAD</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse com as credenciais da sua empresa
          </p>
        </div>

        <div className="surface-card rounded-2xl p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="slug">Empresa</Label>
              <Input
                id="slug"
                placeholder="acme"
                autoComplete="organization"
                spellCheck={false}
                {...form.register("slug")}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                placeholder="seu.usuario"
                autoComplete="username"
                spellCheck={false}
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Primeira vez por aqui?{" "}
          <Link to="/setup" className="text-primary hover:underline">
            Cadastrar nova empresa
          </Link>
        </p>
      </div>
    </div>
  );
}