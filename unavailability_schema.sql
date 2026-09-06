-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Esta tabela já está em supabase_complete_setup.sql (seção 5.16), a fonte
-- única de verdade do schema. Veja SQL_SETUP.md na raiz do repo.

-- Create user_unavailability table
CREATE TABLE IF NOT EXISTS user_unavailability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ministry_id, date)
);

-- Enable RLS
ALTER TABLE user_unavailability ENABLE ROW LEVEL SECURITY;

-- Policies for user_unavailability
CREATE POLICY "Users can manage own unavailability" ON user_unavailability 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Leaders and admins can view unavailability" ON user_unavailability 
    FOR SELECT USING (
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM user_ministries 
            WHERE user_ministries.ministry_id = user_unavailability.ministry_id 
            AND user_ministries.user_id = auth.uid() 
            AND user_ministries.is_leader = true
        )
    );
