import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SLUG_RE, USERNAME_RE } from "@/lib/auth-helpers";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";

const schema = z.object({
  tenant_name: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Use a-z, 0-9, hífen"),
  full_name: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().regex(USERNAME_RE, "Usuário inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});
type FormData = z.infer<typeof schema>;

export default function Setup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-tenant", {
        body: values,
      });
      if (error || (data as { error?: string })?.error) {
        const msg = (data as { error?: string })?.error || error?.message || "Erro";
        toast({ title: "Falha ao cadastrar", description: msg, variant: "destructive" });
        return;
      }
      toast({
        title: "Empresa criada!",
        description: `Faça login com ${values.slug} / ${values.username}`,
      });
      navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold">
            Cadastrar <span className="gradient-text">empresa</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua empresa e a primeira conta de gestor.
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="surface-card space-y-5 rounded-2xl p-6 sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant_name">Nome da empresa</Label>
              <Input id="tenant_name" placeholder="Acme Inc." {...form.register("tenant_name")} />
              {form.formState.errors.tenant_name && (
                <p className="text-xs text-destructive">{form.formState.errors.tenant_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador (slug)</Label>
              <Input id="slug" placeholder="acme" spellCheck={false} {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-5">
            <p className="mb-4 text-sm font-medium text-muted-foreground">Conta do gestor</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" placeholder="Maria Silva" {...form.register("full_name")} />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" placeholder="maria" spellCheck={false} {...form.register("username")} />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar empresa e gestor
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Já tem conta? <Link to="/" className="text-primary hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}