-- =========================================================================
-- MEVAM ITAPEMA SERTÃO - SUPABASE COMUNICAÇÃO & SCHEMA COMPLETO UNIFICADO
-- =========================================================================
-- ✅ ESTE É O ARQUIVO CANÔNICO — a fonte única de verdade do schema base.
-- Para a ordem completa de execução (incluindo os módulos que faltam aqui:
-- church_services, event_lists, e a correção final de RLS), veja
-- SQL_SETUP.md na raiz do repo. Os demais *.sql soltos na raiz e alguns em
-- src/ são históricos/depreciados e apontam de volta pra cá.
--
-- Este arquivo unifica TODAS as tabelas, funções, triggers, políticas de RLS e
-- dados padrão necessários para que o aplicativo front-end funcione em perfeita
-- sintonia com a sua base de dados do Supabase.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com).
-- 2. Vá em No menu lateral esquerdo -> 'SQL Editor'.
-- 3. Clique em 'New Query' (Nova consulta).
-- 4. Copie TODO o conteúdo deste arquivo, cole na caixa de texto e clique em 'Run' (Executar).
-- =========================================================================

-- ==========================================
-- 0. EXTENSÕES INICIAIS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ESTRUTURA BASE DE TABELAS (CONFORME NECESSIDADES DO APP)
-- ==========================================

-- 1.1 Grupos de Celulas (Cell Groups)
CREATE TABLE IF NOT EXISTS cell_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Perfis (Profiles - Extends Supabase Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
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
  cell_id UUID REFERENCES cell_groups(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  is_archived BOOLEAN DEFAULT FALSE,
  privacy_policy_accepted BOOLEAN DEFAULT FALSE,
  privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE,
  cookie_consent_accepted BOOLEAN DEFAULT FALSE,
  cookie_consent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 Ministérios
CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

-- 1.4 Ministérios dos Usuários (Ministries - N-to-N)
CREATE TABLE IF NOT EXISTS user_ministries (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, ministry_id)
);

-- 1.5 Avisos do Ministério (Ministry Notices)
CREATE TABLE IF NOT EXISTS ministry_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.6 Escalas de Ministério (Ministry Scales)
CREATE TABLE IF NOT EXISTS ministry_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.7 Relatórios de Ministério (Ministry Reports)
CREATE TABLE IF NOT EXISTS ministry_reports (
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

-- 1.8 Pedidos de Oração (Prayer Requests)
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  whatsapp TEXT,
  request TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'intercession', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.9 Comunicados Gerais / Avisos (Announcements)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.10 Cadastro de Crianças (Kids Registrations)
CREATE TABLE IF NOT EXISTS kids_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  medication TEXT,
  food_restrictions TEXT,
  special_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.11 Plano de Leitura Bíblica (Bible Reading Progress)
CREATE TABLE IF NOT EXISTS bible_reading (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_number)
);

-- 1.12 Visitantes (Visitors / New Here)
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  wants_to_join_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.13 Transações Financeiras (Finance)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.14 Contas a Pagar (Bills Payable)
CREATE TABLE IF NOT EXISTS bills_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.15 Visitas Planejadas (Planned Visits)
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

-- 1.16 Conteúdos e Devocionais (Media Contents)
CREATE TABLE IF NOT EXISTS media_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'photo', 'audio', 'file', 'text')),
  url TEXT,
  thumbnail TEXT,
  content_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.17 Transmissões ao Vivo (Live Streams)
CREATE TABLE IF NOT EXISTS live_stream (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.18 Sistema de Cantina - Produtos
CREATE TABLE IF NOT EXISTS cantina_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.19 Sistema de Cantina - Vouchers/Fichas
CREATE TABLE IF NOT EXISTS cantina_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES cantina_products(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.20 Congressos e Eventos Especiais (Congresses)
CREATE TABLE IF NOT EXISTS congresses (
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

-- 1.21 Oficinas do Congresso (Congress Workshops)
CREATE TABLE IF NOT EXISTS congress_workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  congress_id UUID REFERENCES congresses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.22 Inscrições do Congresso (Congress Registrations)
CREATE TABLE IF NOT EXISTS congress_registrations (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice único baseado em expressão JSONB fora da definição da tabela para evitar erro de sintaxe
CREATE UNIQUE INDEX IF NOT EXISTS congress_registrations_cpf_idx 
ON congress_registrations (congress_id, ((personal_data ->> 'cpf')));

-- 1.23 Histórico de Consentimento de Termos (Privacy & Consent Log)
CREATE TABLE IF NOT EXISTS privacy_consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'cookies', 'terms', 'privacy_policy'
  action TEXT NOT NULL, -- 'accept', 'decline'
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.24 Visitas Monitoradas (Page Visits Dashboard)
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_name TEXT NOT NULL,
  visit_date DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,
  UNIQUE(page_name, visit_date)
);

-- 1.25 Limite de Requisições / Rate Limiting
CREATE TABLE IF NOT EXISTS action_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action_key TEXT NOT NULL,
  last_request TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  UNIQUE(user_id, action_key)
);

-- 1.26 Indisponibilidades de Voluntários (User Unavailability)
CREATE TABLE IF NOT EXISTS user_unavailability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ministry_id, date)
);

-- 1.27 Carrossel do Banner Principal (Events Carousel)
CREATE TABLE IF NOT EXISTS events_carousel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.28 Testes Vocacionais Realizados
CREATE TABLE IF NOT EXISTS vocational_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  scores JSONB NOT NULL,
  top_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.29 Configurações do Aplicativo (App Settings)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT 'false'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.30 Cadastros do Mercado Solidário (Mercado Solidário Registrations)
CREATE TABLE IF NOT EXISTS mercado_solidario_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  birth_date DATE,
  civil_status TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'Itapema',
  cep TEXT,
  reference_point TEXT,
  housing_type TEXT,
  rent_value NUMERIC DEFAULT 0,
  family_members JSONB DEFAULT '[]'::jsonb,
  total_family_income NUMERIC DEFAULT 0,
  income_origin TEXT,
  income_origin_details TEXT,
  vulnerability_factors JSONB DEFAULT '[]'::jsonb,
  vulnerability_other TEXT,
  expense_rent NUMERIC DEFAULT 0,
  expense_water NUMERIC DEFAULT 0,
  expense_electricity NUMERIC DEFAULT 0,
  expense_food NUMERIC DEFAULT 0,
  expense_meds NUMERIC DEFAULT 0,
  expense_others NUMERIC DEFAULT 0,
  on_cadunico BOOLEAN DEFAULT false,
  receives_benefit BOOLEAN DEFAULT false,
  benefit_details TEXT,
  lacked_food_last_30d BOOLEAN DEFAULT false,
  meals_per_day INTEGER DEFAULT 3,
  signature_url TEXT,
  document_photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 2. FUNÇÕES AUXILIARES E PROCEDIMENTOS
-- ==========================================

-- 2.1 Função de Verificação Segura de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2.2 Função para Incrementar Contagem de Visitas à Página de Forma Segura
CREATE OR REPLACE FUNCTION increment_page_visit(p_page_name TEXT, p_visit_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO page_visits (page_name, visit_date, count)
  VALUES (p_page_name, p_visit_date, 1)
  ON CONFLICT (page_name, visit_date)
  DO UPDATE SET count = page_visits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.3 Função de Controle de Rate Limit (Defesa de Ataque Bruteforce / Spam)
CREATE OR REPLACE FUNCTION check_rate_limit(p_action_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
  v_last TIMESTAMPTZ;
BEGIN
  -- Traz registro ou cria um novo
  SELECT request_count, last_request INTO v_count, v_last
  FROM action_rate_limits
  WHERE user_id = auth.uid() AND action_key = p_action_key;

  IF NOT FOUND THEN
    INSERT INTO action_rate_limits (user_id, action_key, last_request, request_count)
    VALUES (auth.uid(), p_action_key, v_now, 1);
    RETURN TRUE;
  END IF;

  -- Reseta limite caso a janela de tempo já tenha passado
  IF v_now > v_last + (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE action_rate_limits
    SET request_count = 1, last_request = v_now
    WHERE user_id = auth.uid() AND action_key = p_action_key;
    RETURN TRUE;
  END IF;

  -- Incrementa requisições e valida o limite
  IF v_count < p_limit THEN
    UPDATE action_rate_limits
    SET request_count = v_count + 1
    WHERE user_id = auth.uid() AND action_key = p_action_key;
    RETURN TRUE;
  END IF;

  RETURN FALSE; -- Bloqueado por limite de taxa excedido
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- ==========================================
-- 3. TRIGGERS SENSÍVEIS (AUTENTICAÇÃO DE NOVOS USUÁRIOS)
-- ==========================================

-- 3.1 Função que processa Novos Usuários Registrados (AFTER INSERT no auth.users)
-- Cria automaticamente o perfil na tabela profiles e injeta o papel (role) no app_metadata do Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'member';
BEGIN
  -- Define administrador se o email corresponder à liderança descrita
  IF NEW.email IN ('anderlevita@gmail.com', 'pastor.mevam@example.com', 'administrativo@mevam.org.br') THEN
    v_role := 'admin';
  END IF;

  -- Insere na tabela public.profiles
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    birth_date, 
    cookie_consent_accepted, 
    privacy_policy_accepted, 
    privacy_policy_accepted_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'birth_date')::DATE 
      ELSE NULL 
    END,
    COALESCE((NEW.raw_user_meta_data->>'cookie_consent_accepted')::BOOLEAN, false),
    COALESCE((NEW.raw_user_meta_data->>'privacy_policy_accepted')::BOOLEAN, false),
    CASE 
      WHEN NEW.raw_user_meta_data->>'privacy_policy_accepted_at' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'privacy_policy_accepted_at')::TIMESTAMP WITH TIME ZONE 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      role = COALESCE(public.profiles.role, EXCLUDED.role);

  -- Atualiza o app_metadata de auth.users com o cargo atribuído (necessário para RLS via JWT)
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(v_role),
    true
  )
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Garante que se houver um erro, o cadastro da conta no sistema de autenticação NÃO seja obstaculizado
  RAISE WARNING 'Erro ao sincronizar trigger handle_new_user_profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Associa o trigger à tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


-- 3.2 Sincroniza alteração de perfis diretamente aos metadados do auth.users (Exemplo: promover membro a líder ou administrador)
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role),
    true
  )
  WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Associa o trigger de alteração de cargo na tabela profiles
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- 3.3 Impede que um usuário altere o próprio "role" (autopromoção a admin
-- via chamada direta à API). Roda ANTES do sync acima; se quem faz a
-- alteração não é admin, o role é revertido/forçado para 'member'.
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


-- ==========================================
-- 4. ATIVAÇÃO DE SECURITY POLICIES (RLS)
-- ==========================================
ALTER TABLE cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE live_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE cantina_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cantina_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE congresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE congress_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocational_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mercado_solidario_registrations ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 5. DECLARAÇÃO DE POLÍTICAS DE RLS (SEGURANÇA UNIFICADA)
-- ==========================================

-- Limpeza de políticas prévias a fim de evitar conflitos
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view cell groups" ON cell_groups;
DROP POLICY IF EXISTS "Admins can manage cell groups" ON cell_groups;
DROP POLICY IF EXISTS "Public can view ministries" ON ministries;
DROP POLICY IF EXISTS "Admins can manage ministries" ON ministries;
DROP POLICY IF EXISTS "Users can manage own ministries" ON user_ministries;
DROP POLICY IF EXISTS "Anyone can create prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Public can view public prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Users can view own prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Admins can manage all prayer requests" ON prayer_requests;
DROP POLICY IF EXISTS "Public can view announcements" ON announcements;
DROP POLICY IF EXISTS "Parents can manage kids registrations" ON kids_registrations;
DROP POLICY IF EXISTS "Users can manage own bible reading" ON bible_reading;
DROP POLICY IF EXISTS "Public can view ministry notices" ON ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON ministry_notices;
DROP POLICY IF EXISTS "Public can view ministry scales" ON ministry_scales;
DROP POLICY IF EXISTS "Leaders can manage ministry scales" ON ministry_scales;
DROP POLICY IF EXISTS "Leaders can manage ministry reports" ON ministry_reports;
DROP POLICY IF EXISTS "Anyone can view active cantina products" ON cantina_products;
DROP POLICY IF EXISTS "Admins can manage cantina products" ON cantina_products;
DROP POLICY IF EXISTS "Anyone can purchase vouchers" ON cantina_vouchers;
DROP POLICY IF EXISTS "Anyone can view vouchers" ON cantina_vouchers;
DROP POLICY IF EXISTS "Admins can manage all vouchers" ON cantina_vouchers;
DROP POLICY IF EXISTS "Public can view active congresses" ON congresses;
DROP POLICY IF EXISTS "Admins can manage congresses" ON congresses;
DROP POLICY IF EXISTS "Public can view workshops" ON congress_workshops;
DROP POLICY IF EXISTS "Admins can manage workshops" ON congress_workshops;
DROP POLICY IF EXISTS "Anyone can register for congress" ON congress_registrations;
DROP POLICY IF EXISTS "Anyone can view registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON congress_registrations;
DROP POLICY IF EXISTS "Users can view their own consent log" ON privacy_consent_log;
DROP POLICY IF EXISTS "Users can insert their own consent logs" ON privacy_consent_log;
DROP POLICY IF EXISTS "Public can increment visits" ON page_visits;
DROP POLICY IF EXISTS "Public can update visits" ON page_visits;
DROP POLICY IF EXISTS "Admins can view visits" ON page_visits;
DROP POLICY IF EXISTS "Users can manage own unavailability" ON user_unavailability;
DROP POLICY IF EXISTS "Leaders and admins can view unavailability" ON user_unavailability;
DROP POLICY IF EXISTS "Allow public read access" ON events_carousel;
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON events_carousel;
DROP POLICY IF EXISTS "Users can view their own tests." ON vocational_tests;
DROP POLICY IF EXISTS "Users can insert their own tests." ON vocational_tests;
DROP POLICY IF EXISTS "Anyone can view live_stream" ON live_stream;
DROP POLICY IF EXISTS "Admins can manage live_stream" ON live_stream;
DROP POLICY IF EXISTS "Admins can manage financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can manage bills_payable" ON bills_payable;
DROP POLICY IF EXISTS "Anyone can insert planned_visits" ON planned_visits;
DROP POLICY IF EXISTS "Admins can manage planned_visits" ON planned_visits;
DROP POLICY IF EXISTS "Public can view published media_contents" ON media_contents;
DROP POLICY IF EXISTS "Admins can manage all media_contents" ON media_contents;
DROP POLICY IF EXISTS "Users can insert media_contents" ON media_contents;
DROP POLICY IF EXISTS "Anyone can insert visitors" ON visitors;
DROP POLICY IF EXISTS "Admins can view visitors" ON visitors;
DROP POLICY IF EXISTS "Public can view app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can register for mercado" ON mercado_solidario_registrations;
DROP POLICY IF EXISTS "Admins can manage mercado registrations" ON mercado_solidario_registrations;

-- 5.1 Políticas para Profiles (Utilizando leituras diretas do JWT do Auth para otimizar velocidade)
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 5.2 Políticas para Células
CREATE POLICY "Public can view cell groups" ON cell_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage cell groups" ON cell_groups FOR ALL USING (is_admin());

-- 5.3 Políticas para Ministérios
CREATE POLICY "Public can view ministries" ON ministries FOR SELECT USING (true);
CREATE POLICY "Admins can manage ministries" ON ministries FOR ALL USING (is_admin());

-- 5.4 Políticas para Ministérios de Usuários
CREATE POLICY "Users can manage own ministries" ON user_ministries FOR ALL USING (auth.uid() = user_id OR is_admin());

-- 5.5 Políticas para Avisos de Ministérios
CREATE POLICY "Public can view ministry notices" ON ministry_notices FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry notices" ON ministry_notices FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_notices.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- 5.6 Políticas para Escalas
CREATE POLICY "Public can view ministry scales" ON ministry_scales FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry scales" ON ministry_scales FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_scales.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- 5.7 Políticas para Relatórios
CREATE POLICY "Leaders can manage ministry reports" ON ministry_reports FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = ministry_reports.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- 5.8 Políticas para Leitura Bíblica
CREATE POLICY "Users can manage own bible reading" ON bible_reading FOR ALL USING (auth.uid() = user_id OR is_admin());

-- 5.9 Políticas para Cadastro Infantil
CREATE POLICY "Parents can manage kids registrations" ON kids_registrations FOR ALL USING (auth.uid() = parent_id OR is_admin());

-- 5.10 Políticas para Pedidos de Oração
CREATE POLICY "Anyone can create prayer requests" ON prayer_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view public prayer requests" ON prayer_requests FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own prayer requests" ON prayer_requests FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can manage all prayer requests" ON prayer_requests FOR ALL USING (is_admin());

-- 5.11 Políticas para Comunicados Gerais
CREATE POLICY "Public can view announcements" ON announcements FOR SELECT USING (true);

-- 5.12 Políticas para Cantina
CREATE POLICY "Anyone can view active cantina products" ON cantina_products FOR SELECT USING (is_active = true OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins can manage cantina products" ON cantina_products FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Anyone can purchase vouchers" ON cantina_vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view vouchers" ON cantina_vouchers FOR SELECT USING (true);
CREATE POLICY "Admins can manage all vouchers" ON cantina_vouchers FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 5.13 Políticas para Congressos e Inscrições
CREATE POLICY "Public can view active congresses" ON congresses FOR SELECT USING (is_active = true OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
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
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations" ON congress_registrations FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

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

-- 5.14 Políticas para Consentimento de Cookies/Privacidade
CREATE POLICY "Users can view their own consent log" ON privacy_consent_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own consent logs" ON privacy_consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5.15 Políticas para Page Visits
-- Sem policy de INSERT/UPDATE: a contagem é feita exclusivamente pela função
-- increment_page_visit() (SECURITY DEFINER, seção 2.2), que não depende de
-- permissão de escrita direta na tabela. Apenas admins podem ler os números.
CREATE POLICY "Admins can view visits" ON page_visits FOR SELECT TO authenticated USING (is_admin());

-- 5.16 Políticas de Indisponibilidade de Voluntários
CREATE POLICY "Users can manage own unavailability" ON user_unavailability FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Leaders and admins can view unavailability" ON user_unavailability FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_ministries 
    WHERE user_ministries.ministry_id = user_unavailability.ministry_id 
    AND user_ministries.user_id = auth.uid() 
    AND user_ministries.is_leader = true
  )
);

-- 5.17 Políticas do Carrossel de Imagens do Banner Principal
CREATE POLICY "Allow public read access" ON events_carousel FOR SELECT USING (true);

-- Antes qualquer usuário autenticado (não só admin/pastor) podia gerenciar
-- o carrossel de eventos da home.
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON events_carousel;
CREATE POLICY "Staff can manage events carousel" ON events_carousel
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

-- 5.18 Políticas do Teste Vocacional
CREATE POLICY "Users can view their own tests." ON vocational_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tests." ON vocational_tests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5.19 Transmissão ao vivo
CREATE POLICY "Anyone can view live_stream" ON live_stream FOR SELECT USING (true);
CREATE POLICY "Admins can manage live_stream" ON live_stream FOR ALL USING (is_admin());

-- 5.20 Financeiro e Contas a Pagar
CREATE POLICY "Admins can manage financial_transactions" ON financial_transactions FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage bills_payable" ON bills_payable FOR ALL USING (is_admin());

-- 5.21 Planejar Visitas
CREATE POLICY "Anyone can insert planned_visits" ON planned_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage planned_visits" ON planned_visits FOR ALL USING (is_admin());

-- 5.22 Mídia e Devocionais
CREATE POLICY "Public can view published media_contents" ON media_contents FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all media_contents" ON media_contents FOR ALL USING (is_admin());
CREATE POLICY "Users can insert media_contents" ON media_contents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5.23 Visitantes Novos
CREATE POLICY "Anyone can insert visitors" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view visitors" ON visitors FOR SELECT USING (is_admin());

-- 5.24 Políticas de Configurações do Aplicativo (App Settings)
CREATE POLICY "Public can view app settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL USING (is_admin());

-- 5.25 Políticas de Cadastro do Mercado Solidário
CREATE POLICY "Anyone can register for mercado" ON mercado_solidario_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage mercado registrations" ON mercado_solidario_registrations FOR ALL USING (is_admin());


-- ==========================================
-- 6. DADOS PADRÃO DE SISTEMA (MINISTÉRIOS E AMOSTRAS)
-- ==========================================
INSERT INTO ministries (name) VALUES 
('Louvor'), ('Kids'), ('Ação Social'), ('Mídia'), ('Recepção'), ('Intercessão'), ('Teatro'), ('Limpeza')
ON CONFLICT (name) DO NOTHING;

-- Configuração inicial do Mercado Solidário fechado (se não existir)
INSERT INTO app_settings (key, value)
VALUES ('mercado_solidario_open', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Configuração inicial da live stream vazia (se não existir)
INSERT INTO live_stream (url, is_active)
SELECT 'https://youtube.com', false
WHERE NOT EXISTS (SELECT 1 FROM live_stream);


-- =========================================================================
-- DIRETRIZ IMPORTANTÍSIMA DE SINCRONIZAÇÃO E PRIVILÉGIOS DE CONTAS
-- =========================================================================
--
-- 1. SINCRONIZAÇÃO INICIAL DE USUÁRIOS CADASTRADOS PREVIAMENTE:
--    Se existirem usuários que se cadastraram antes de você executar estas 
--    funções e triggers, sincronize-os com os seguintes comandos SQL:
--
--    UPDATE auth.users u
--    SET raw_app_meta_data = jsonb_set(
--      COALESCE(raw_app_meta_data, '{}'::jsonb),
--      '{role}',
--      to_jsonb(p.role)
--    )
--    FROM public.profiles p
--    WHERE u.id = p.id;
--
-- 2. DEFINIR PASTOR / ADMINISTRADOR OFICIAL MANUALMENTE:
--    Se você se registrou e quer garantir nível completo administrativo, 
--    execute no painel SQL de forma simples (substituindo o e-mail real):
--
--    UPDATE public.profiles 
--    SET role = 'admin' 
--    WHERE id IN (
--      SELECT id FROM auth.users WHERE email = 'seu-email-aqui@gmail.com'
--    );
--
--    * O gatilho 'on_profile_role_updated' irá atualizar o metadado no Auth de forma garantida.
-- =========================================================================
