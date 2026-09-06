-- ====================================================================
-- MEVAM ITAPEMA SERTÃO: TABELA DE CULTOS & PROGRAMAÇÃO
-- ====================================================================
-- Este arquivo é a fonte oficial do schema de "church_services".
-- Veja SQL_SETUP.md na raiz do repo para a ordem de execução dos scripts.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Criação da tabela de cultos e programação
CREATE TABLE IF NOT EXISTS public.church_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  day_short VARCHAR(10) NOT NULL DEFAULT 'DOM',
  time TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_text TEXT DEFAULT '',
  color TEXT DEFAULT 'amber',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita Row Level Security
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de políticas prévias
DROP POLICY IF EXISTS "Public can view church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable insert for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable update for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable delete for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can insert church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can update church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can delete church_services" ON public.church_services;

-- 4. Políticas de acesso: leitura pública, escrita só admin/pastor
CREATE POLICY "Public can view church_services"
  ON public.church_services FOR SELECT USING (true);

CREATE POLICY "Staff can insert church_services"
  ON public.church_services FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can update church_services"
  ON public.church_services FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can delete church_services"
  ON public.church_services FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

-- 5. Inserção dos cultos oficiais iniciais da MEVAM Itapema Sertão
INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT
  'Culto da Família',
  'Domingo',
  'DOM',
  '19h00',
  'Celebração com toda a igreja, louvor congregacional, mensagem inspiradora e salinhas para crianças no MEVAM Kids.',
  'Presencial + MEVAM Kids',
  'amber',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Culto da Família');

INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT
  'Células nos Lares',
  'Terça-feira',
  'TER',
  '20h00',
  'Encontros de comunhão, amizade e estudo da Palavra de Deus em diversos bairros e residências.',
  'Pequenos Grupos',
  'stone',
  2,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Células nos Lares');

INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT
  'Culto de Oração & Ensino',
  'Quinta-feira',
  'QUI',
  '20h00',
  'Momento precioso de intercessão coletiva, clamor pelas famílias e edificação doutrinária.',
  'Doutrina & Clamor',
  'stone',
  3,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Culto de Oração & Ensino');

-- 6. Habilitar Realtime para sincronização em tempo real com o frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_services;
