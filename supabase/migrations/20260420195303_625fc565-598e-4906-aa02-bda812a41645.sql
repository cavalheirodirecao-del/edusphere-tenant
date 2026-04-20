
-- =========== TENANTS / COMPANIES ===========
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =========== PROFILES ===========
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- =========== COURSES (módulos) ===========
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- =========== THEMES ===========
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_themes_course ON public.themes(course_id, position);

-- =========== LESSONS: adicionar theme_id ===========
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.themes(id) ON DELETE CASCADE;

-- Migra aulas existentes: cria tema "Geral" em cada curso que tenha aulas órfãs e vincula
DO $$
DECLARE
  c RECORD;
  new_theme UUID;
BEGIN
  FOR c IN
    SELECT DISTINCT course_id FROM public.lessons WHERE theme_id IS NULL
  LOOP
    INSERT INTO public.themes (course_id, title, position)
    VALUES (c.course_id, 'Geral', 0)
    RETURNING id INTO new_theme;
    UPDATE public.lessons SET theme_id = new_theme WHERE course_id = c.course_id AND theme_id IS NULL;
  END LOOP;
END $$;

-- Agora theme_id obrigatório
ALTER TABLE public.lessons ALTER COLUMN theme_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_theme ON public.lessons(theme_id, position);

-- =========== LESSON PROGRESS: novos campos ===========
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS watched_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Permitir UPDATE no progresso (atualizar watched_seconds sem deletar)
DROP POLICY IF EXISTS "progress_update_self" ON public.lesson_progress;
CREATE POLICY "progress_update_self"
ON public.lesson_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =========== RLS THEMES ===========
DROP POLICY IF EXISTS "themes_select_same_tenant" ON public.themes;
CREATE POLICY "themes_select_same_tenant"
ON public.themes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = themes.course_id
  AND c.tenant_id = public.get_user_tenant(auth.uid())
));

DROP POLICY IF EXISTS "themes_insert_gestor" ON public.themes;
CREATE POLICY "themes_insert_gestor"
ON public.themes FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = themes.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

DROP POLICY IF EXISTS "themes_update_gestor" ON public.themes;
CREATE POLICY "themes_update_gestor"
ON public.themes FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = themes.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
)
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

DROP POLICY IF EXISTS "themes_delete_gestor" ON public.themes;
CREATE POLICY "themes_delete_gestor"
ON public.themes FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = themes.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

-- =========== Atualiza handle_new_user para incluir store ===========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _username TEXT;
  _full_name TEXT;
  _store TEXT;
  _role public.app_role;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  _username  := NEW.raw_user_meta_data->>'username';
  _full_name := NEW.raw_user_meta_data->>'full_name';
  _store     := NEW.raw_user_meta_data->>'store';
  _role      := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'aluno');

  IF _tenant_id IS NULL OR _username IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, username, full_name, store)
  VALUES (NEW.id, _tenant_id, _username, _full_name, _store);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, _role);

  RETURN NEW;
END;
$$;
