-- ==============================================================================
-- REPOSITÓRIO SEMANAL & GESTÃO DE CONTEÚDO (MEVAM ITAPEMA SERTÃO)
-- Script SQL para Supabase / PostgreSQL
-- ==============================================================================

-- 1. Garante que a tabela app_settings existe para armazenar as configurações do Repositório Semanal
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS em app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para app_settings:
DROP POLICY IF EXISTS "Public can view app settings" ON app_settings;
CREATE POLICY "Public can view app settings" 
  ON app_settings FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins and authenticated can upsert app settings" ON app_settings;
CREATE POLICY "Admins and authenticated can upsert app settings" 
  ON app_settings FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 2. Garante que a tabela media_contents existe para histórico e retrocompatibilidade
CREATE TABLE IF NOT EXISTS media_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'photo', 'audio', 'file', 'text')),
  url TEXT,
  thumbnail TEXT,
  content_text TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published')),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS em media_contents
ALTER TABLE media_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published media_contents" ON media_contents;
CREATE POLICY "Public can view published media_contents" 
  ON media_contents FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins can manage all media_contents" ON media_contents;
CREATE POLICY "Admins can manage all media_contents" 
  ON media_contents FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 3. Insere a semente inicial padrão para o Repositório Semanal caso ainda não exista
INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'weekly_repository_data',
  '{
    "video1": {
      "title": "Culto de Celebração: O Princípio da Honra & Aliança",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "author_name": "Pastoral Mevam Itapema",
      "thumbnail_url": "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=1200",
      "category": "Mensagem de Domingo"
    },
    "video2": {
      "title": "Mergulhados na Presença: Princípios de Vida no Espírito",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "author_name": "Estudo Pastoral Semanal",
      "thumbnail_url": "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=1200",
      "category": "Estudo Bíblico"
    },
    "pdf": {
      "title": "Guia Semanal de Célula & Esboço Pastoral",
      "subtitle": "Roteiro de Estudo Bíblico, Perguntas para Compartilhar e Aplicação Prática",
      "author_name": "Corpo Pastoral Mevam Itapema",
      "url": "",
      "pages": "4 Páginas",
      "size": "1.8 MB"
    },
    "spotify": {
      "title": "Podcast Mevam Itapema Sertão",
      "url": "https://open.spotify.com/search/mevam%20itapema",
      "category": "Mensagens & Devocionais Semanais",
      "author_name": "Mevam Itapema Oficial"
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE 
SET updated_at = NOW();
