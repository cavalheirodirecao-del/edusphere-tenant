import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLUG_RE = /^[a-z0-9-]{2,40}$/;
const USERNAME_RE = /^[a-z0-9_.-]{2,40}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const tenantName = String(body.tenant_name ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const password = String(body.password ?? "");

    if (!SLUG_RE.test(slug)) {
      return json({ error: "Slug inválido (use a-z, 0-9, hífen, 2-40)" }, 400);
    }
    if (!tenantName || tenantName.length > 100) {
      return json({ error: "Nome da empresa obrigatório" }, 400);
    }
    if (!USERNAME_RE.test(username)) {
      return json({ error: "Username inválido" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Senha deve ter ao menos 8 caracteres" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: existing, error: existErr } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existErr) throw existErr;
    if (existing) {
      return json({ error: "Já existe uma empresa com esse identificador" }, 409);
    }

    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .insert({ slug, name: tenantName })
      .select("id, slug")
      .single();
    if (tErr) throw tErr;

    const email = `${username}@${slug}.ead.local`;
    const { data: created, error: uErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        username,
        full_name: fullName || username,
        role: "gestor",
      },
    });
    if (uErr) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      throw uErr;
    }

    return json({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      user_id: created.user?.id,
    });
  } catch (e) {
    console.error("bootstrap-tenant", e);
    return json({ error: (e as Error).message ?? "Erro" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}