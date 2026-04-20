
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('gestor', 'aluno');

-- =========== TENANTS ===========
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL CHECK (username ~ '^[a-z0-9_.-]{2,40}$'),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, username)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========== COURSES ===========
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- =========== LESSONS ===========
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lessons_course ON public.lessons(course_id, position);

-- =========== LESSON PROGRESS ===========
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- =========== SECURITY DEFINER FUNCTIONS ===========
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- =========== TRIGGER: handle_new_user ===========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _username TEXT;
  _full_name TEXT;
  _role public.app_role;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  _username  := NEW.raw_user_meta_data->>'username';
  _full_name := NEW.raw_user_meta_data->>'full_name';
  _role      := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'aluno');

  IF _tenant_id IS NULL OR _username IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, username, full_name)
  VALUES (NEW.id, _tenant_id, _username, _full_name);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, _role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== updated_at trigger ===========
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== RLS POLICIES ===========

-- TENANTS: anyone can SELECT by slug (needed pre-login to validate); but only own tenant for full row.
-- We'll allow public SELECT of slug+id+name (low sensitivity, needed for login UX of slug check).
CREATE POLICY "tenants_select_own"
ON public.tenants FOR SELECT
TO authenticated
USING (id = public.get_user_tenant(auth.uid()));

-- Allow anonymous to read tenant by slug (for setup page existence check). Read-only, low-risk.
CREATE POLICY "tenants_select_anon"
ON public.tenants FOR SELECT
TO anon
USING (true);

-- No client INSERT/UPDATE/DELETE; only via edge functions (service role bypasses RLS).

-- PROFILES
CREATE POLICY "profiles_select_same_tenant"
ON public.profiles FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND tenant_id = public.get_user_tenant(auth.uid()));

-- USER_ROLES: users can read their own roles only
CREATE POLICY "user_roles_select_self"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- COURSES
CREATE POLICY "courses_select_same_tenant"
ON public.courses FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "courses_insert_gestor"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
  AND public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "courses_update_gestor"
ON public.courses FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND public.has_role(auth.uid(), 'gestor')
)
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "courses_delete_gestor"
ON public.courses FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND public.has_role(auth.uid(), 'gestor')
);

-- LESSONS (escopadas via course→tenant)
CREATE POLICY "lessons_select_same_tenant"
ON public.lessons FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = lessons.course_id
  AND c.tenant_id = public.get_user_tenant(auth.uid())
));

CREATE POLICY "lessons_insert_gestor"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

CREATE POLICY "lessons_update_gestor"
ON public.lessons FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
)
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "lessons_delete_gestor"
ON public.lessons FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

-- LESSON_PROGRESS
CREATE POLICY "progress_select_self"
ON public.lesson_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "progress_select_gestor_same_tenant"
ON public.lesson_progress FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_progress.lesson_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

CREATE POLICY "progress_insert_self"
ON public.lesson_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress_delete_self"
ON public.lesson_progress FOR DELETE
TO authenticated
USING (user_id = auth.uid());
