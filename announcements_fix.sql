-- =========================================================================
-- MEVAM ITAPEMA: CORREÇÃO E ATIVAÇÃO COMPLETA DE AVISOS & NOTIFICAÇÕES
-- =========================================================================
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Dashboard do Supabase -> SQL Editor -> New Query -> Run)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA ANNOUNCEMENTS (Avisos Gerais e Página Inicial)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir coluna category caso a tabela já tenha sido criada anteriormente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN category TEXT DEFAULT 'Geral';
  END IF;
END $$;

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER POLÍTICAS ANTIGAS OU RESTRITIVAS
DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable insert for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable update for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable delete for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.announcements;
DROP POLICY IF EXISTS "Enable all access for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public read" ON public.announcements;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.announcements;
DROP POLICY IF EXISTS "Staff can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete announcements" ON public.announcements;

-- 4. POLÍTICAS: leitura pública, escrita restrita a admin/pastor
-- (auth.jwt() -> app_metadata.role é sincronizado pelo trigger on_profile_role_updated)
CREATE POLICY "Public can view announcements" ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can update announcements" ON public.announcements
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can delete announcements" ON public.announcements
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

-- 5. AJUSTAR POLÍTICAS DA TABELA DE AVISOS MINISTERIAIS (MINISTRY_NOTICES)
CREATE TABLE IF NOT EXISTS public.ministry_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ministry_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable insert for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable update for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable delete for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON public.ministry_notices;

CREATE POLICY "Public can view ministry notices" ON public.ministry_notices
  FOR SELECT USING (true);

-- Admin/pastor, ou o próprio líder do ministério do aviso
CREATE POLICY "Leaders can manage ministry notices" ON public.ministry_notices
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = auth.uid()
        AND um.is_leader = true
    )
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = auth.uid()
        AND um.is_leader = true
    )
  );
