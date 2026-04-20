import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const USERNAME_RE = /^[a-z0-9_.-]{2,40}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente como o usuário que chamou (para identificar quem é)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "Não autenticado" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Confirma que o caller é gestor + pega tenant
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("tenant_id, tenants:tenant_id(slug)")
      .eq("id", callerId)
      .single();
    if (pErr || !profile) return json({ error: "Perfil não encontrado" }, 403);

    const { data: isGestor } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "gestor",
    });
    if (!isGestor) return json({ error: "Apenas gestores" }, 403);

    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const password = String(body.password ?? "");
    if (!USERNAME_RE.test(username))
      return json({ error: "Username inválido (a-z, 0-9, _.-)" }, 400);
    if (password.length < 8)
      return json({ error: "Senha deve ter ao menos 8 caracteres" }, 400);

    const slug = (profile.tenants as { slug: string } | null)?.slug;
    if (!slug) return json({ error: "Tenant inválido" }, 500);

    const email = `${username}@${slug}.ead.local`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: profile.tenant_id,
        username,
        full_name: fullName || username,
        role: "aluno",
      },
    });
    if (cErr) return json({ error: cErr.message }, 400);

    return json({ user_id: created.user?.id, username });
  } catch (e) {
    console.error("create-student", e);
    return json({ error: (e as Error).message ?? "Erro" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}