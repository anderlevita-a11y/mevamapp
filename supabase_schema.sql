-- ⚠️ HISTÓRICO / DEPRECIADO — NÃO EXECUTE EM UM PROJETO NOVO.
-- Este arquivo e supabase_complete_setup.sql definem as MESMAS tabelas
-- (profiles, ministries, financeiro, cantina, congressos...) de forma
-- incompatível entre si — rodar os dois causa erro de "already exists".
-- supabase_complete_setup.sql é o mais completo e é a fonte única de
-- verdade do schema. Veja SQL_SETUP.md na raiz do repo.
-- Mantido só para referência histórica (recebeu a mesma correção de RLS
-- que os outros arquivos, mas não deve ser executado do zero).

-- Create tables for Mevam Itapema Sertão

-- 1. Cell Groups
CREATE TABLE cell_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para verificar se o usuário é admin sem causar recursão infinita
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Profiles (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf TEXT UNIQUE,
  whatsapp TEXT,
  birth_date DATE,
  cep TEXT,
  address TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  cell_id UUID REFERENCES cell_groups(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  is_archived BOOLEAN DEFAULT false,
  cookie_consent_accepted BOOLEAN DEFAULT false,
  cookie_consent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função única para lidar com novos usuários de forma robusta
-- Separamos em duas: uma para o perfil (AFTER INSERT) e uma para o metadata (BEFORE INSERT)

CREATE OR REPLACE FUNCTION public.handle_new_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Inicializa metadata se estiver nulo
  IF NEW.raw_app_meta_data IS NULL THEN
    NEW.raw_app_meta_data = '{}'::jsonb;
  END IF;

  -- Define role inicial (Admin para proprietários, Member para os demais)
  IF NEW.email IN ('anderlevita@gmail.com', 'pastor.mevam@example.com', 'administrativo@mevam.org.br') THEN
    NEW.raw_app_meta_data = jsonb_set(NEW.raw_app_meta_data, '{role}', to_jsonb('admin'::text), true);
  ELSE
    NEW.raw_app_meta_data = jsonb_set(NEW.raw_app_meta_data, '{role}', to_jsonb('member'::text), true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Tenta inserir o perfil, ignora se já existir para não causar erro fatal no auth
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_app_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro aqui, não bloqueamos o salvamento do usuário no auth.users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriando os triggers no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_metadata_sync ON auth.users;

CREATE TRIGGER on_auth_user_metadata_sync
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_metadata();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Função para sincronizar mudanças de papel do perfil para o auth.users
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    ARRAY['role'],
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- Impede que um usuário altere o próprio "role" (ex.: se promover a admin
-- via chamada direta à API). Roda ANTES do sync acima, revertendo qualquer
-- mudança feita por quem não é admin.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'member' AND NOT public.is_admin() THEN
      NEW.role := 'member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 3. Ministries
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

-- 4. User Ministries (Many-to-Many)
CREATE TABLE user_ministries (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, ministry_id)
);

-- 4.1 Ministry Notices
CREATE TABLE ministry_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.2 Ministry Scales
CREATE TABLE ministry_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.3 Ministry Reports
CREATE TABLE ministry_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  events_held TEXT,
  avg_participants TEXT,
  resources_used TEXT,
  integration TEXT,
  positive_points TEXT,
  improvements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Prayer Requests
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  whatsapp TEXT,
  request TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'intercession', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Kids Registrations
CREATE TABLE kids_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  medication TEXT,
  food_restrictions TEXT,
  special_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Bible Reading
CREATE TABLE bible_reading (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_number)
);

-- 9. Visitors (New Here)
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  wants_to_join_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Financial Transactions (Income/Expenses)
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Bills Payable
CREATE TABLE bills_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Planned Visits
CREATE TABLE planned_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  visit_date DATE NOT NULL,
  whatsapp TEXT NOT NULL,
  companion_status TEXT NOT NULL CHECK (companion_status IN ('alone', 'accompanied')),
  church_status TEXT NOT NULL CHECK (church_status IN ('other_church', 'seeking_community')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Media Contents (Devotionals, Blog, etc.)
CREATE TABLE media_contents (
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

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_reading ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Financials (Admins only)
CREATE POLICY "Admins can manage financial_transactions" ON financial_transactions FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage bills_payable" ON bills_payable FOR ALL USING (is_admin());

-- RLS Policies for Planned Visits
CREATE POLICY "Anyone can insert planned_visits" ON planned_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage planned_visits" ON planned_visits FOR ALL USING (is_admin());

-- RLS Policies for Media Contents
CREATE POLICY "Public can view published media_contents" ON media_contents FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all media_contents" ON media_contents FOR ALL USING (is_admin());
CREATE POLICY "Users can insert media_contents" ON media_contents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can view own media_contents" ON media_contents FOR SELECT USING (auth.uid() = author_id);

-- RLS Policies
-- ... (existing policies)
CREATE POLICY "Anyone can insert visitors" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view visitors" ON visitors FOR SELECT USING (is_admin());
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
  personal_data JSONB NOT NULL,
  address JSONB NOT NULL,
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

-- Privacy Consent Log
CREATE TABLE privacy_consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'cookies', 'terms', 'privacy'
  action TEXT NOT NULL, -- 'accept', 'decline'
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Congresses
ALTER TABLE congresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active congresses" ON congresses FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins can manage congresses" ON congresses FOR ALL USING (is_admin());
CREATE POLICY "Public can view workshops" ON congress_workshops FOR SELECT USING (true);
CREATE POLICY "Admins can manage workshops" ON congress_workshops FOR ALL USING (is_admin());
CREATE POLICY "Anyone can register for congress" ON congress_registrations FOR INSERT WITH CHECK (true);

-- Leitura direta restrita a staff/dono da inscrição (dados sensíveis: CPF,
-- WhatsApp, endereço). Consulta pública "status por WhatsApp" usa a RPC
-- check_congress_registration_by_whatsapp() abaixo, não SELECT direto.
DROP POLICY IF EXISTS "Anyone can view registrations" ON congress_registrations;
CREATE POLICY "Staff and owners can view registrations" ON congress_registrations
  FOR SELECT TO authenticated
  USING (is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'pastor' OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations" ON congress_registrations FOR ALL USING (is_admin());

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

-- Sincronização e Triggers do Perfil

-- RLS Policies

-- REMOVER POLÍTICAS EXISTENTES PARA EVITAR ERROS DE DUPLICIDADE
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view cell groups" ON cell_groups;
DROP POLICY IF EXISTS "Admins can manage cell groups" ON cell_groups;
DROP POLICY IF EXISTS "Public can view ministries" ON ministries;
DROP POLICY IF EXISTS "Admins can manage ministries" ON ministries;
DROP POLICY IF EXISTS "Users can manage own ministries" ON user_ministries;
DROP POLICY IF EXISTS "Admins can manage all user_ministries" ON user_ministries;
DROP POLICY IF EXISTS "Anyone can create prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Public can view public prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Users can view own prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Admins can manage all prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Public can view announcements" ON announcements;
DROP POLICY IF EXISTS "Parents can manage kids registrations" ON kids_registrations;
DROP POLICY IF EXISTS "Admins can manage all kids registrations" ON kids_registrations;
DROP POLICY IF EXISTS "Users can manage own bible reading" ON bible_reading;
DROP POLICY IF EXISTS "Public can view ministry notices" ON ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON ministry_notices;
DROP POLICY IF EXISTS "Admins can manage all ministry notices" ON ministry_notices;
DROP POLICY IF EXISTS "Public can view ministry scales" ON ministry_scales;
DROP POLICY IF EXISTS "Leaders can manage ministry scales" ON ministry_scales;
DROP POLICY IF EXISTS "Admins can manage all ministry scales" ON ministry_scales;
DROP POLICY IF EXISTS "Leaders can manage ministry reports" ON ministry_reports;
DROP POLICY IF EXISTS "Admins can manage all ministry reports" ON ministry_reports;

-- Profiles: Users can read/update their own profile, admins can see all
-- Usamos a verificação direta via JWT app_metadata para evitar recursão infinita
-- Primeiro, dropando nomes conhecidos de políticas que podem ser conflitantes
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON profiles;
DROP POLICY IF EXISTS "Leaders can view team profiles" ON profiles;

CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

-- Cell Groups: Everyone can read, admins can manage
CREATE POLICY "Public can view cell groups" ON cell_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage cell groups" ON cell_groups FOR ALL USING (is_admin());

-- Ministries: Everyone can read, admins can manage
CREATE POLICY "Public can view ministries" ON ministries FOR SELECT USING (true);
CREATE POLICY "Admins can manage ministries" ON ministries FOR ALL USING (is_admin());

-- User Ministries: Users can manage their own, admins can manage all
CREATE POLICY "Users can manage own ministries" ON user_ministries FOR ALL USING (auth.uid() = user_id OR is_admin());

-- Ministry Notices: Everyone can read, leaders and admins can manage
CREATE POLICY "Public can view ministry notices" ON ministry_notices FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry notices" ON ministry_notices FOR ALL USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_notices.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- Ministry Scales: Everyone can read, leaders and admins can manage
CREATE POLICY "Public can view ministry scales" ON ministry_scales FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry scales" ON ministry_scales FOR ALL USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_scales.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- Ministry Reports: Leaders and admins can manage
CREATE POLICY "Leaders can manage ministry reports" ON ministry_reports FOR ALL USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_reports.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- Prayer Requests: Users can create, public can read public ones, admins can see all
CREATE POLICY "Anyone can create prayer requests" ON prayer_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view public prayer requests" ON prayer_requests FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own prayer requests" ON prayer_requests FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can manage all prayer requests" ON prayer_requests FOR ALL USING (is_admin());

-- Announcements: Everyone can read
CREATE POLICY "Public can view announcements" ON announcements FOR SELECT USING (true);

-- Kids Registrations: Parents can manage their own, admins can see all
CREATE POLICY "Parents can manage kids registrations" ON kids_registrations FOR ALL USING (auth.uid() = parent_id OR is_admin());

-- Bible Reading: Users can manage their own
CREATE POLICY "Users can manage own bible reading" ON bible_reading FOR ALL USING (auth.uid() = user_id OR is_admin());

-- 11. Cantina (Canteen) & Voucher System
CREATE TABLE public.cantina_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.cantina_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.cantina_products(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies for Cantina System
ALTER TABLE public.cantina_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cantina_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cantina products" ON public.cantina_products FOR SELECT USING (is_active = true OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins can manage cantina products" ON public.cantina_products FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Vouchers can be created by anyone (public link)
CREATE POLICY "Anyone can purchase vouchers" ON public.cantina_vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view vouchers" ON public.cantina_vouchers FOR SELECT USING (true);
CREATE POLICY "Admins can manage all vouchers" ON public.cantina_vouchers FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Insert initial data
INSERT INTO ministries (name) VALUES 
('Louvor'), ('Kids'), ('Ação Social'), ('Mídia'), ('Recepção'), ('Intercessão'), ('Teatro'), ('Limpeza');


-- ===============================================================
-- INSTRUÇÕES PARA CONFIGURAÇÃO DE ADMINISTRADOR (PASTOR)
-- ===============================================================
-- 
-- 1. Acesse o SQL Editor no seu painel do Supabase.
-- 2. Execute TODO o conteúdo deste arquivo para criar as tabelas e políticas.
-- 
-- 3. SINCRONIZAÇÃO INICIAL (Execute isso se já tiver usuários cadastrados):
--    UPDATE auth.users u
--    SET raw_app_meta_data = jsonb_set(
--      COALESCE(raw_app_meta_data, '{}'::jsonb),
--      '{role}',
--      to_jsonb(p.role)
--    )
--    FROM public.profiles p
--    WHERE u.id = p.id;
--
-- 4. Após criar sua conta no aplicativo, execute o comando abaixo 
--    substituindo 'seu-email@exemplo.com' pelo seu e-mail real:
--
-- UPDATE profiles SET role = 'admin' WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'
-- );
--
-- O gatilho 'on_profile_role_updated' cuidará de atualizar o auth.users automaticamente.
-- ===============================================================
