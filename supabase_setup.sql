-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Suas tabelas (bills_payable, planned_visits, media_contents, live_stream)
-- já estão em supabase_complete_setup.sql, que é a fonte única de verdade
-- do schema. Veja SQL_SETUP.md na raiz do repo. Mantido só para histórico.

-- Create is_admin function if not exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create bills_payable table
CREATE TABLE IF NOT EXISTS bills_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure planned_visits exists
CREATE TABLE IF NOT EXISTS planned_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  visit_date DATE NOT NULL,
  whatsapp TEXT NOT NULL,
  companion_status TEXT NOT NULL CHECK (companion_status IN ('alone', 'accompanied')),
  church_status TEXT NOT NULL CHECK (church_status IN ('other_church', 'seeking_community')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure media_contents exists with correct columns
CREATE TABLE IF NOT EXISTS media_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'photo', 'audio', 'file', 'text')),
  url TEXT,
  thumbnail TEXT,
  content_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create live_stream table
CREATE TABLE IF NOT EXISTS live_stream (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bills_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage bills_payable" ON bills_payable;
CREATE POLICY "Admins can manage bills_payable" ON bills_payable FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone can insert planned_visits" ON planned_visits;
CREATE POLICY "Anyone can insert planned_visits" ON planned_visits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage planned_visits" ON planned_visits;
CREATE POLICY "Admins can manage planned_visits" ON planned_visits FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public can view published media_contents" ON media_contents;
CREATE POLICY "Public can view published media_contents" ON media_contents FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage all media_contents" ON media_contents;
CREATE POLICY "Admins can manage all media_contents" ON media_contents FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users can insert media_contents" ON media_contents;
CREATE POLICY "Users can insert media_contents" ON media_contents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view live_stream" ON live_stream;
CREATE POLICY "Anyone can view live_stream" ON live_stream FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage live_stream" ON live_stream;
CREATE POLICY "Admins can manage live_stream" ON live_stream FOR ALL USING (is_admin());
