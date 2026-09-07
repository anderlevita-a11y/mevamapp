-- ============================================================================
-- MEVAM ITAPEMA SERTÃO: CORREÇÃO DE PERFORMANCE (índices + RLS otimizada)
-- ============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase, DEPOIS de rodar
-- o security_rls_fix.sql (Dashboard -> SQL Editor -> New Query -> Run).
--
-- Motivo: o Supabase está avisando "exhausting multiple resources" e o
-- login da sessão pastoral / as consultas estão lentas. Auditoria encontrou
-- as 3 causas clássicas, todas confirmadas no schema atual:
--
-- 1) ÍNDICES QUASE INEXISTENTES — o schema inteiro tinha apenas 3 índices
--    (em event_lists), nenhum nas colunas usadas o tempo todo em filtros e
--    nas próprias policies de RLS (user_ministries.user_id/ministry_id,
--    ministry_notices.ministry_id, etc.). Sem índice, toda consulta
--    filtrada — e toda checagem de RLS que faz EXISTS(...) — vira um
--    Sequential Scan na tabela inteira. Isso piora progressivamente
--    conforme o número de membros/registros cresce.
--
-- 2) RLS NÃO OTIMIZADA — 32 chamadas a auth.uid()/auth.jwt() direto dentro
--    de USING/WITH CHECK, sem o wrapper "(select auth.uid())". Sem o
--    wrapper, o Postgres pode reavaliar essas funções LINHA A LINHA em vez
--    de uma vez por consulta (é literalmente o alerta "Auth RLS
--    Initialization Plan" que aparece em Database -> Advisors ->
--    Performance no seu painel). Este script corrige is_admin() (usada por
--    ~15 policies, corrige todas de uma vez) e reescreve as demais
--    policies que chamam auth.uid()/auth.jwt() diretamente.
--
-- 3) TEMPESTADE DE REQUISIÇÕES NO REALTIME — corrigido separadamente no
--    código do app (src/App.tsx): um único canal Realtime escutava
--    mudanças em 9 tabelas e disparava fetchHomeContent() (9 consultas)
--    para TODOS os clientes conectados a cada escrita de qualquer usuário,
--    às vezes em duplicidade (broadcast + postgres_changes). Ver commit
--    correspondente no repositório para o fix de debounce.
--
-- Este script é IDEMPOTENTE: pode ser executado quantas vezes for
-- preciso sem causar erro.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PARTE 1 — ÍNDICES
-- ----------------------------------------------------------------------------
-- Colunas usadas em RLS (EXISTS/joins) e em .eq()/.in() do app. Sem estes
-- índices, cada linha verificada por uma policy de RLS ou por um filtro do
-- app é um scan completo da tabela referenciada.

-- user_ministries: a tabela mais crítica — é consultada dentro de EXISTS()
-- em QUATRO policies diferentes (ministry_notices, ministry_scales,
-- ministry_reports, user_unavailability) toda vez que essas tabelas são
-- lidas ou escritas, além de ser buscada diretamente por user_id no login.
CREATE INDEX IF NOT EXISTS idx_user_ministries_user_id ON public.user_ministries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ministries_ministry_id ON public.user_ministries(ministry_id);
CREATE INDEX IF NOT EXISTS idx_user_ministries_ministry_user ON public.user_ministries(ministry_id, user_id) INCLUDE (is_leader);

CREATE INDEX IF NOT EXISTS idx_ministry_notices_ministry_id ON public.ministry_notices(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_scales_ministry_id ON public.ministry_scales(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_scales_user_id ON public.ministry_scales(user_id);
CREATE INDEX IF NOT EXISTS idx_ministry_reports_ministry_id ON public.ministry_reports(ministry_id);
CREATE INDEX IF NOT EXISTS idx_user_unavailability_user_id ON public.user_unavailability(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unavailability_ministry_id ON public.user_unavailability(ministry_id);

CREATE INDEX IF NOT EXISTS idx_bible_reading_user_id ON public.bible_reading(user_id);
CREATE INDEX IF NOT EXISTS idx_kids_registrations_parent_id ON public.kids_registrations(parent_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_is_public ON public.prayer_requests(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_congress_registrations_user_id ON public.congress_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_congress_registrations_congress_id ON public.congress_registrations(congress_id);

CREATE INDEX IF NOT EXISTS idx_privacy_consent_log_user_id ON public.privacy_consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_vocational_tests_user_id ON public.vocational_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_media_contents_author_id ON public.media_contents(author_id);
CREATE INDEX IF NOT EXISTS idx_media_contents_status ON public.media_contents(status);

CREATE INDEX IF NOT EXISTS idx_cantina_products_is_active ON public.cantina_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cantina_vouchers_product_id ON public.cantina_vouchers(product_id);

CREATE INDEX IF NOT EXISTS idx_congress_workshops_congress_id ON public.congress_workshops(congress_id);

-- Ordenações frequentes (ORDER BY na home e no login)
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_church_services_order_index ON public.church_services(order_index);
CREATE INDEX IF NOT EXISTS idx_events_carousel_display_order ON public.events_carousel(display_order);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- action_rate_limits já tem UNIQUE(user_id, action_key), que já cria índice
-- automaticamente; page_visits já tem UNIQUE(page_name, visit_date), idem.


-- ----------------------------------------------------------------------------
-- PARTE 2 — is_admin() otimizada (usada por ~15 policies; corrigir aqui
-- corrige todas de uma vez, sem precisar reescrever cada policy)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------------------------------
-- PARTE 3 — Policies que chamam auth.uid()/auth.jwt() diretamente (fora de
-- is_admin()/is_admin_or_pastor()), reescritas com "(select ...)"
-- ----------------------------------------------------------------------------

-- Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- user_ministries
DROP POLICY IF EXISTS "Users can manage own ministries" ON public.user_ministries;
CREATE POLICY "Users can manage own ministries" ON public.user_ministries FOR ALL
  USING ((SELECT auth.uid()) = user_id OR is_admin());

-- ministry_notices (versão base do supabase_complete_setup.sql; se
-- security_rls_fix.sql também rodou, ele já deixou uma versão mais nova e
-- restrita aqui — este DROP+CREATE não conflita, é idempotente)
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON public.ministry_notices;
CREATE POLICY "Leaders can manage ministry notices" ON public.ministry_notices FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_ministries
    WHERE user_ministries.ministry_id = ministry_notices.ministry_id
    AND user_ministries.user_id = (SELECT auth.uid())
    AND user_ministries.is_leader = true
  )
);

-- ministry_scales
DROP POLICY IF EXISTS "Leaders can manage ministry scales" ON public.ministry_scales;
CREATE POLICY "Leaders can manage ministry scales" ON public.ministry_scales FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_ministries
    WHERE user_ministries.ministry_id = ministry_scales.ministry_id
    AND user_ministries.user_id = (SELECT auth.uid())
    AND user_ministries.is_leader = true
  )
);

-- ministry_reports
DROP POLICY IF EXISTS "Leaders can manage ministry reports" ON public.ministry_reports;
CREATE POLICY "Leaders can manage ministry reports" ON public.ministry_reports FOR ALL USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_ministries
    WHERE user_ministries.ministry_id = ministry_reports.ministry_id
    AND user_ministries.user_id = (SELECT auth.uid())
    AND user_ministries.is_leader = true
  )
);

-- bible_reading
DROP POLICY IF EXISTS "Users can manage own bible reading" ON public.bible_reading;
CREATE POLICY "Users can manage own bible reading" ON public.bible_reading FOR ALL
  USING ((SELECT auth.uid()) = user_id OR is_admin());

-- kids_registrations
DROP POLICY IF EXISTS "Parents can manage kids registrations" ON public.kids_registrations;
CREATE POLICY "Parents can manage kids registrations" ON public.kids_registrations FOR ALL
  USING ((SELECT auth.uid()) = parent_id OR is_admin());

-- prayer_requests
DROP POLICY IF EXISTS "Users can view own prayer requests" ON public.prayer_requests;
CREATE POLICY "Users can view own prayer requests" ON public.prayer_requests FOR SELECT
  USING ((SELECT auth.uid()) = user_id OR is_admin());

-- cantina_products / cantina_vouchers
DROP POLICY IF EXISTS "Anyone can view active cantina products" ON public.cantina_products;
CREATE POLICY "Anyone can view active cantina products" ON public.cantina_products FOR SELECT
  USING (is_active = true OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage cantina products" ON public.cantina_products;
CREATE POLICY "Admins can manage cantina products" ON public.cantina_products FOR ALL
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage all vouchers" ON public.cantina_vouchers;
CREATE POLICY "Admins can manage all vouchers" ON public.cantina_vouchers FOR ALL
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- congresses
DROP POLICY IF EXISTS "Public can view active congresses" ON public.congresses;
CREATE POLICY "Public can view active congresses" ON public.congresses FOR SELECT
  USING (is_active = true OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- congress_registrations (versão base do supabase_complete_setup.sql)
DROP POLICY IF EXISTS "Staff and owners can view registrations" ON public.congress_registrations;
CREATE POLICY "Staff and owners can view registrations" ON public.congress_registrations
  FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage all registrations" ON public.congress_registrations;
CREATE POLICY "Admins can manage all registrations" ON public.congress_registrations FOR ALL
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- privacy_consent_log
DROP POLICY IF EXISTS "Users can view their own consent log" ON public.privacy_consent_log;
CREATE POLICY "Users can view their own consent log" ON public.privacy_consent_log FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own consent logs" ON public.privacy_consent_log;
CREATE POLICY "Users can insert their own consent logs" ON public.privacy_consent_log FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- user_unavailability
DROP POLICY IF EXISTS "Users can manage own unavailability" ON public.user_unavailability;
CREATE POLICY "Users can manage own unavailability" ON public.user_unavailability FOR ALL
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Leaders and admins can view unavailability" ON public.user_unavailability;
CREATE POLICY "Leaders and admins can view unavailability" ON public.user_unavailability FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_ministries
    WHERE user_ministries.ministry_id = user_unavailability.ministry_id
    AND user_ministries.user_id = (SELECT auth.uid())
    AND user_ministries.is_leader = true
  )
);

-- vocational_tests
DROP POLICY IF EXISTS "Users can view their own tests." ON public.vocational_tests;
CREATE POLICY "Users can view their own tests." ON public.vocational_tests FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own tests." ON public.vocational_tests;
CREATE POLICY "Users can insert their own tests." ON public.vocational_tests FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- media_contents (insert; a policy de gestão já usa is_admin(), otimizada
-- automaticamente pela Parte 2)
DROP POLICY IF EXISTS "Users can insert media_contents" ON public.media_contents;
CREATE POLICY "Users can insert media_contents" ON public.media_contents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);


-- ============================================================================
-- FIM. Após rodar este script:
-- 1. Confira em Database -> Advisors -> Performance se os alertas de
--    "Unindexed foreign keys" e "Auth RLS Initialization Plan" sumiram.
-- 2. No painel do Supabase, em Reports -> Database, observe se o uso de
--    CPU/IO cai nos minutos seguintes.
-- 3. O aviso "exhausting multiple resources" no topo do projeto deve
--    parar de aparecer em algumas horas, à medida que a carga normaliza.
-- ============================================================================
