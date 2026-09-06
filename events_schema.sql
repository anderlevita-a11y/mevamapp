-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Esta tabela já está em supabase_complete_setup.sql, a fonte única de
-- verdade do schema. Veja SQL_SETUP.md na raiz do repo.

CREATE TABLE IF NOT EXISTS events_carousel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE events_carousel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON events_carousel
  FOR SELECT USING (true);

-- Antes qualquer usuário autenticado (não só admin/pastor) podia gerenciar
-- o carrossel de eventos da home. Restrito a staff.
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON events_carousel;
CREATE POLICY "Staff can manage events carousel" ON events_carousel
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
