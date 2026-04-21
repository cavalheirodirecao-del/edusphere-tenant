-- =========== ENROLLMENTS ===========
-- Controle de acesso: quais alunos podem ver quais cursos

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);

-- Aluno vê suas próprias matrículas
CREATE POLICY "enrollments_select_self"
ON public.enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Gestor vê todas as matrículas do seu tenant
CREATE POLICY "enrollments_select_gestor"
ON public.enrollments FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

-- Só gestor do tenant pode criar/deletar matrículas
CREATE POLICY "enrollments_insert_gestor"
ON public.enrollments FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

CREATE POLICY "enrollments_delete_gestor"
ON public.enrollments FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

-- =========== AJUSTE RLS COURSES para alunos ===========
-- Substituir courses_select_same_tenant por duas políticas separadas:
-- 1) Gestor vê todos os cursos do seu tenant
-- 2) Aluno só vê cursos em que está matriculado

DROP POLICY IF EXISTS "courses_select_same_tenant" ON public.courses;

CREATE POLICY "courses_select_gestor_same_tenant"
ON public.courses FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "courses_select_aluno_enrolled"
ON public.courses FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND public.has_role(auth.uid(), 'aluno')
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id
    AND e.user_id = auth.uid()
  )
);

-- =========== AJUSTE RLS LESSONS para alunos ===========
-- Substituir lessons_select_same_tenant por duas políticas separadas

DROP POLICY IF EXISTS "lessons_select_same_tenant" ON public.lessons;

CREATE POLICY "lessons_select_gestor_same_tenant"
ON public.lessons FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id
    AND c.tenant_id = public.get_user_tenant(auth.uid())
  )
);

CREATE POLICY "lessons_select_aluno_enrolled"
ON public.lessons FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'aluno')
  AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = auth.uid()
    AND c.id = lessons.course_id
  )
);
