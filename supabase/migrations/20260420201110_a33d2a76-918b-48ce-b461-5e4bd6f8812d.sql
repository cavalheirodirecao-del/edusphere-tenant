-- 1) Flag de catálogo no tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_catalog boolean NOT NULL DEFAULT false;

-- 2) Senha de importação + rastreio de origem nos cursos
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS import_password text,
  ADD COLUMN IF NOT EXISTS imported_from_course_id uuid;

CREATE INDEX IF NOT EXISTS idx_courses_imported_from
  ON public.courses(tenant_id, imported_from_course_id);

-- 3) Permitir que QUALQUER autenticado leia cursos/temas/aulas de tenants marcados como catálogo
CREATE POLICY "courses_select_catalog_any_auth"
  ON public.courses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = courses.tenant_id AND t.is_catalog = true));

CREATE POLICY "themes_select_catalog_any_auth"
  ON public.themes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE c.id = themes.course_id AND t.is_catalog = true
  ));

CREATE POLICY "lessons_select_catalog_any_auth"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE c.id = lessons.course_id AND t.is_catalog = true
  ));

-- 4) Marca a empresa "eadcursos" como catálogo (caso já exista)
UPDATE public.tenants SET is_catalog = true WHERE slug = 'eadcursos';