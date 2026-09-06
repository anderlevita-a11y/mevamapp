-- ✅ ARQUIVO ATIVO (não depreciado) — event_lists/event_list_participants não
-- estão em supabase_complete_setup.sql. Veja SQL_SETUP.md na raiz do repo
-- para a ordem de execução completa.
--
-- ==============================================================================
-- MEVAM ITAPEMA SERTÃO - LISTAS DE EVENTOS & COMPROVANTES
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Listas de Eventos (Criadas por membros cadastrados)
CREATE TABLE IF NOT EXISTS event_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,                           -- Nome do evento
  description TEXT,                              -- Descrição / orientações
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,  -- Data do evento
  pix_key TEXT,                                  -- Chave PIX (opcional)
  pix_type TEXT,                                 -- Tipo de chave: CPF, CNPJ, Email, Telefone, Aleatória
  pix_recipient TEXT,                            -- Nome do titular do PIX (opcional)
  suggested_value NUMERIC(10, 2),                -- Valor sugerido por pessoa (opcional)
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Membro criador
  creator_name TEXT NOT NULL,                    -- Nome do criador
  creator_email TEXT,                            -- Email do criador
  is_active BOOLEAN DEFAULT true,                -- Lista aberta/ativa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Participantes da Lista (Inclusão de nomes e comprovantes de pagamento)
CREATE TABLE IF NOT EXISTS event_list_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES event_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                            -- Nome da pessoa
  phone TEXT,                                    -- WhatsApp / Telefone
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuário se logado
  payment_proof_url TEXT,                        -- URL ou foto do comprovante de pagamento
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  notes TEXT,                                    -- Observações (ex: 2 pessoas, meia entrada, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_event_lists_active ON event_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_event_lists_creator ON event_lists(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_list_participants_list ON event_list_participants(list_id);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE event_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_list_participants ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para event_lists:
-- Leitura: Qualquer pessoa pode visualizar as listas ativas
DROP POLICY IF EXISTS "Public can view active event lists" ON event_lists;
CREATE POLICY "Public can view active event lists" 
  ON event_lists FOR SELECT 
  USING (is_active = true OR auth.uid() = creator_id);

-- Inserção: Qualquer membro cadastrado (autenticado) pode criar uma lista
DROP POLICY IF EXISTS "Authenticated members can create event lists" ON event_lists;
CREATE POLICY "Authenticated members can create event lists" 
  ON event_lists FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Atualização: O criador pode atualizar sua própria lista
DROP POLICY IF EXISTS "Creators can update their own event lists" ON event_lists;
CREATE POLICY "Creators can update their own event lists" 
  ON event_lists FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Exclusão: Somente pastores e administradores logados podem excluir listas
DROP POLICY IF EXISTS "Creators can delete their own event lists" ON event_lists;
DROP POLICY IF EXISTS "Only pastors can delete event lists" ON event_lists;
CREATE POLICY "Only pastors can delete event lists" ON event_lists 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('pastor', 'admin')
    )
    OR (auth.jwt() ->> 'email') = 'anderlevita@gmail.com'
  );

-- 7. Políticas RLS para event_list_participants:
-- Leitura: Todos podem visualizar os inscritos nas listas
DROP POLICY IF EXISTS "Public can view list participants" ON event_list_participants;
CREATE POLICY "Public can view list participants" 
  ON event_list_participants FOR SELECT 
  USING (true);

-- Inserção: Qualquer pessoa pode se inscrever na lista e enviar comprovante
DROP POLICY IF EXISTS "Anyone can join event list" ON event_list_participants;
CREATE POLICY "Anyone can join event list" 
  ON event_list_participants FOR INSERT 
  WITH CHECK (true);

-- Atualização: O próprio participante ou o criador da lista pode atualizar (ex: aprovar pagamento)
DROP POLICY IF EXISTS "Creators and participants can update registration" ON event_list_participants;
CREATE POLICY "Creators and participants can update registration" 
  ON event_list_participants FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM event_lists 
      WHERE event_lists.id = event_list_participants.list_id 
      AND event_lists.creator_id = auth.uid()
    )
  );

-- Exclusão: O criador da lista ou o participante pode remover
DROP POLICY IF EXISTS "Creators and participants can delete registration" ON event_list_participants;
CREATE POLICY "Creators and participants can delete registration" 
  ON event_list_participants FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM event_lists 
      WHERE event_lists.id = event_list_participants.list_id 
      AND event_lists.creator_id = auth.uid()
    )
  );

-- 8. Storage Bucket para Comprovantes (opcional, mas recomendado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-proofs', 'event-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public view on event proofs" ON storage.objects;
CREATE POLICY "Public view on event proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-proofs');

DROP POLICY IF EXISTS "Anyone can upload event proofs" ON storage.objects;
CREATE POLICY "Anyone can upload event proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-proofs');
