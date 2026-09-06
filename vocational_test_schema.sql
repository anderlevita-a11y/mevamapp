-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Esta tabela já está em supabase_complete_setup.sql, a fonte única de
-- verdade do schema. Veja SQL_SETUP.md na raiz do repo.

-- Table for Vocational Tests
CREATE TABLE vocational_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  scores JSONB NOT NULL, -- Calculated scores per category
  top_areas TEXT[], -- Array of top 3 categories
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vocational_tests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own tests." 
  ON vocational_tests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tests." 
  ON vocational_tests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
