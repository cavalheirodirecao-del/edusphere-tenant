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
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente do usuário (para descobrir quem é)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Não autenticado" }, 401);
    const uid = userRes.user.id;

    const body = await req.json();
    const courseTitle = String(body.course_title ?? "").trim();
    const password = String(body.password ?? "");
    if (!courseTitle || !password) {
      return json({ error: "Informe nome do curso e senha" }, 400);
    }

    // Cliente admin
    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    // Tenant do gestor
    const { data: prof, error: pErr } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", uid)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!prof) return json({ error: "Perfil não encontrado" }, 404);

    // Confirma que é gestor
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    if (roleRow?.role !== "gestor") {
      return json({ error: "Apenas gestores podem importar cursos" }, 403);
    }

    const targetTenantId = prof.tenant_id;

    // Busca curso no catálogo (em qualquer tenant marcado como catálogo) pelo título exato (case-insensitive)
    const { data: catalogTenants, error: ctErr } = await admin
      .from("tenants")
      .select("id")
      .eq("is_catalog", true);
    if (ctErr) throw ctErr;
    const catalogIds = (catalogTenants ?? []).map((t) => t.id);
    if (catalogIds.length === 0) {
      return json({ error: "Nenhum catálogo disponível" }, 404);
    }

    const { data: matches, error: mErr } = await admin
      .from("courses")
      .select("id, title, description, cover_url, import_password, tenant_id")
      .in("tenant_id", catalogIds)
      .ilike("title", courseTitle);
    if (mErr) throw mErr;

    if (!matches || matches.length === 0) {
      return json({ error: "Curso não encontrado no catálogo" }, 404);
    }
    if (matches.length > 1) {
      return json({ error: "Mais de um curso com esse nome. Contate o suporte." }, 409);
    }
    const source = matches[0];

    if (!source.import_password || source.import_password !== password) {
      return json({ error: "Senha incorreta" }, 403);
    }

    // Bloqueia re-importação
    const { data: already } = await admin
      .from("courses")
      .select("id")
      .eq("tenant_id", targetTenantId)
      .eq("imported_from_course_id", source.id)
      .maybeSingle();
    if (already) {
      return json({ error: "Esse curso já foi importado para sua empresa" }, 409);
    }

    // Próxima posição
    const { data: maxPos } = await admin
      .from("courses")
      .select("position")
      .eq("tenant_id", targetTenantId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxPos?.position ?? -1) + 1;

    // 1) Cria curso destino
    const { data: newCourse, error: ncErr } = await admin
      .from("courses")
      .insert({
        tenant_id: targetTenantId,
        title: source.title,
        description: source.description,
        cover_url: source.cover_url,
        position: nextPos,
        created_by: uid,
        imported_from_course_id: source.id,
      })
      .select("id")
      .single();
    if (ncErr) throw ncErr;

    // 2) Copia temas
    const { data: srcThemes, error: tErr } = await admin
      .from("themes")
      .select("id, title, position")
      .eq("course_id", source.id)
      .order("position", { ascending: true });
    if (tErr) throw tErr;

    const themeMap = new Map<string, string>();
    for (const t of srcThemes ?? []) {
      const { data: nt, error: ntErr } = await admin
        .from("themes")
        .insert({
          course_id: newCourse.id,
          title: t.title,
          position: t.position,
        })
        .select("id")
        .single();
      if (ntErr) throw ntErr;
      themeMap.set(t.id, nt.id);
    }

    // 3) Copia aulas
    const { data: srcLessons, error: lErr } = await admin
      .from("lessons")
      .select("id, theme_id, title, description, video_url, position")
      .eq("course_id", source.id);
    if (lErr) throw lErr;

    let lessonsCount = 0;
    for (const l of srcLessons ?? []) {
      const newThemeId = themeMap.get(l.theme_id);
      if (!newThemeId) continue;
      const { error: nlErr } = await admin.from("lessons").insert({
        course_id: newCourse.id,
        theme_id: newThemeId,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        position: l.position,
      });
      if (nlErr) throw nlErr;
      lessonsCount++;
    }

    return json({
      course_id: newCourse.id,
      themes: themeMap.size,
      lessons: lessonsCount,
      title: source.title,
    });
  } catch (e) {
    console.error("import-catalog-course", e);
    return json({ error: (e as Error).message ?? "Erro" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}