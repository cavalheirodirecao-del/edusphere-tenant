import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", callerId)
      .single();
    if (!callerProfile) return json({ error: "Perfil não encontrado" }, 403);

    const { data: isGestor } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "gestor",
    });
    if (!isGestor) return json({ error: "Apenas gestores" }, 403);

    const body = await req.json();
    const targetUserId = String(body.user_id ?? "");
    const active = Boolean(body.active);
    if (!targetUserId) return json({ error: "user_id obrigatório" }, 400);

    // garante mesmo tenant
    const { data: target } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", targetUserId)
      .single();
    if (!target || target.tenant_id !== callerProfile.tenant_id) {
      return json({ error: "Aluno não pertence à sua empresa" }, 403);
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ is_active: active })
      .eq("id", targetUserId);
    if (upErr) return json({ error: upErr.message }, 500);

    // bloqueia/libera login no auth via banned_until
    const { error: banErr } = await admin.auth.admin.updateUserById(targetUserId, {
      ban_duration: active ? "none" : "876000h",
    });
    if (banErr) return json({ error: banErr.message }, 500);

    return json({ ok: true, is_active: active });
  } catch (e) {
    console.error("toggle-student", e);
    return json({ error: (e as Error).message ?? "Erro" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}