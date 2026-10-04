-- TABELA OFICIAL: church_agenda
CREATE TABLE IF NOT EXISTS public.church_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT DEFAULT 'Templo Principal - MEVAM Itapema',
  category TEXT DEFAULT 'Geral',
  ministry_id TEXT,
  badge_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.church_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for church_agenda" ON public.church_agenda;
CREATE POLICY "Allow public read access for church_agenda" ON public.church_agenda FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage church_agenda" ON public.church_agenda;
CREATE POLICY "Staff can manage church_agenda" ON public.church_agenda FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices para alta performance nas consultas
CREATE INDEX IF NOT EXISTS idx_church_agenda_event_date ON public.church_agenda(event_date);
CREATE INDEX IF NOT EXISTS idx_church_agenda_is_active ON public.church_agenda(is_active);
CREATE INDEX IF NOT EXISTS idx_church_agenda_category ON public.church_agenda(category);
