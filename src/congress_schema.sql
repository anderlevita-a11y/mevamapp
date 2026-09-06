-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Estas tabelas já estão em supabase_complete_setup.sql, a fonte única de
-- verdade do schema. Veja SQL_SETUP.md na raiz do repo. Mantido em sincronia
-- (recebeu a mesma correção de RLS/RPC) só por referência histórica.

-- Congresses Table
CREATE TABLE congresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  banner_url TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  schedule JSONB DEFAULT '[]'::jsonb,
  location_details TEXT,
  how_to_get_there TEXT,
  payment_info TEXT,
  image_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  has_t_shirts BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Congress Workshops Table
CREATE TABLE congress_workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  congress_id UUID REFERENCES congresses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Congress Registrations Table
CREATE TABLE congress_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  congress_id UUID REFERENCES congresses(id) ON DELETE CASCADE,
  personal_data JSONB NOT NULL, -- { full_name, email, whatsapp, birth_date, cpf }
  address JSONB NOT NULL, -- { cep, address, number, neighborhood, city }
  t_shirt_size TEXT,
  selected_workshops JSONB DEFAULT '[]'::jsonb,
  image_use_accepted BOOLEAN DEFAULT false,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  check_in_status TEXT DEFAULT 'pending',
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(congress_id, (personal_data->>'cpf'))
);

-- RLS Policies
ALTER TABLE congresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_registrations ENABLE ROW LEVEL SECURITY;

-- Congresses: Everyone can view, admins can manage
CREATE POLICY "Public can view active congresses" ON congresses FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins can manage congresses" ON congresses FOR ALL USING (is_admin());

-- Workshops: Everyone can view, admins can manage
CREATE POLICY "Public can view workshops" ON congress_workshops FOR SELECT USING (true);
CREATE POLICY "Admins can manage workshops" ON congress_workshops FOR ALL USING (is_admin());

-- Registrations: Anyone can register (public form, no login required), but
-- reading back full personal data (CPF, WhatsApp, address...) is restricted
-- to staff (admin/pastor) and the registrant themselves. Public "check my
-- status by WhatsApp" lookups go through the SECURITY DEFINER RPC below
-- instead of a raw table SELECT, so a direct API call can't dump every
-- registration's PII at once.
DROP POLICY IF EXISTS "Users can manage own registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Anyone can register for congress" ON congress_registrations;
DROP POLICY IF EXISTS "Users can view own registration" ON congress_registrations;
DROP POLICY IF EXISTS "Anyone can view registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Staff and owners can view registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Staff can manage all registrations" ON congress_registrations;

CREATE POLICY "Anyone can register for congress"
  ON congress_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff and owners can view registrations"
  ON congress_registrations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')
    OR auth.uid() = user_id
  );

CREATE POLICY "Staff can manage all registrations"
  ON congress_registrations FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

-- Consulta pública de status por WhatsApp (usada por quem se inscreveu sem
-- login). Roda como SECURITY DEFINER, então não depende da policy de SELECT
-- acima, mas só devolve o que casar exatamente com o telefone informado —
-- não permite listar/dumpar todas as inscrições.
CREATE OR REPLACE FUNCTION public.check_congress_registration_by_whatsapp(
  p_congress_id UUID,
  p_whatsapp TEXT
)
RETURNS SETOF congress_registrations AS $$
  SELECT *
  FROM congress_registrations
  WHERE congress_id = p_congress_id
    AND personal_data->>'whatsapp' = p_whatsapp
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.check_congress_registration_by_whatsapp(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_congress_registration_by_whatsapp(UUID, TEXT) TO anon, authenticated;
