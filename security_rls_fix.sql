-- ============================================================================
-- MEVAM ITAPEMA SERTÃO: CORREÇÃO DE SEGURANÇA (RLS)
-- ============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Dashboard do Supabase -> SQL Editor -> New Query -> Run)
--
-- Este script corrige os problemas encontrados em auditoria de segurança:
--
-- 1) CRÍTICO — Escalação de privilégio: a política de UPDATE da tabela
--    "profiles" ("Users can update own profile") só verifica
--    auth.uid() = id, sem restringir QUAIS colunas podem ser alteradas.
--    Como existe um trigger que sincroniza profiles.role para o
--    app_metadata do JWT (usado por is_admin() em todas as outras
--    tabelas), qualquer usuário autenticado podia se autopromover a
--    admin com uma chamada direta à API:
--      supabase.from('profiles').update({ role: 'admin' }).eq('id', meuId)
--    Correção: um trigger BEFORE INSERT/UPDATE que reverte qualquer
--    alteração da coluna "role" feita por quem não é admin.
--
-- 2) ALTO — Políticas de escrita abertas: as tabelas "announcements",
--    "ministry_notices" e "church_services" tinham policies de
--    INSERT/UPDATE/DELETE com "USING (true) / WITH CHECK (true)" e sem
--    "TO authenticated", ou seja, qualquer pessoa (mesmo não logada)
--    podia criar, editar ou apagar avisos e cultos via API REST do
--    Supabase, sem passar pela interface do app.
--    Correção: escrita restrita a administradores/pastores; leitura
--    pública continua liberada (é conteúdo público do site).
--
-- Também ajusta "page_visits": a contagem de visitas já é feita pela
-- função increment_page_visit() (SECURITY DEFINER), então a policy
-- pública de UPDATE direto na tabela não é necessária e foi removida.
--
-- 3) ALTO — "congress_registrations" (CPF, WhatsApp, endereço de todo mundo
--    que já se inscreveu em algum congresso) tinha SELECT com USING(true):
--    qualquer requisição direta à API REST do Supabase, sem login, listava
--    TODAS as inscrições. Correção: leitura restrita a staff/dono da
--    inscrição; a consulta pública "ver status pela WhatsApp" passa a usar
--    uma função check_congress_registration_by_whatsapp() que só devolve o
--    que casa com o telefone informado, sem permitir dump completo.
--
-- 4) MÉDIO — "app_settings" e "media_contents" tinham policies chamadas
--    "Admins can..." mas com USING(true)/WITH CHECK(true): o nome mentia,
--    a escrita era pública. "events_carousel" liberava gestão pra qualquer
--    usuário autenticado (não só admin/pastor). Todas corrigidas para
--    exigir admin/pastor de fato.
--
-- Este script é IDEMPOTENTE: pode ser executado quantas vezes for
-- preciso sem causar erro.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Função auxiliar: verifica se o usuário logado é admin OU pastor
-- ----------------------------------------------------------------------------
-- auth.jwt() vem envolto em "(select ...)" por performance: sem isso, o
-- Postgres pode reavaliar a chamada linha a linha em vez de uma vez só por
-- consulta (ver seção "Auth RLS Initialization Plan" nos Advisors do
-- Supabase). Como toda policy chama esta função em vez de auth.jwt()
-- diretamente, a otimização se propaga para todas de uma vez.
CREATE OR REPLACE FUNCTION public.is_admin_or_pastor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'pastor');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------------------------------
-- 1. CRÍTICO: impedir que um usuário altere o próprio "role"
-- ----------------------------------------------------------------------------
-- Este trigger roda ANTES do "sync_user_role" (que copia profiles.role
-- para o app_metadata do JWT). Se quem está fazendo a alteração não é
-- admin, a mudança de role é silenciosamente descartada (volta ao valor
-- anterior no UPDATE, ou é forçada para 'member' em um INSERT novo).
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


-- ----------------------------------------------------------------------------
-- 2. ALTO: restringir escrita em "announcements" (avisos gerais)
-- ----------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable insert for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable update for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable delete for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.announcements;
DROP POLICY IF EXISTS "Enable all access for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public read" ON public.announcements;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.announcements;
DROP POLICY IF EXISTS "Staff can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete announcements" ON public.announcements;

CREATE POLICY "Public can view announcements" ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert announcements" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_pastor());

CREATE POLICY "Staff can update announcements" ON public.announcements
  FOR UPDATE TO authenticated USING (public.is_admin_or_pastor()) WITH CHECK (public.is_admin_or_pastor());

CREATE POLICY "Staff can delete announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_admin_or_pastor());


-- ----------------------------------------------------------------------------
-- 3. ALTO: restringir escrita em "ministry_notices" (avisos de ministério)
-- ----------------------------------------------------------------------------
ALTER TABLE public.ministry_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable insert for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable update for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable delete for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Staff can insert ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Staff can update ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Staff can delete ministry notices" ON public.ministry_notices;

CREATE POLICY "Public can view ministry notices" ON public.ministry_notices
  FOR SELECT USING (true);

-- Líderes do próprio ministério (via user_ministries.is_leader) OU admin/pastor
CREATE POLICY "Staff can insert ministry notices" ON public.ministry_notices
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_or_pastor()
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = (select auth.uid())
        AND um.is_leader = true
    )
  );

CREATE POLICY "Staff can update ministry notices" ON public.ministry_notices
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_pastor()
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = (select auth.uid())
        AND um.is_leader = true
    )
  ) WITH CHECK (
    public.is_admin_or_pastor()
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = (select auth.uid())
        AND um.is_leader = true
    )
  );

CREATE POLICY "Staff can delete ministry notices" ON public.ministry_notices
  FOR DELETE TO authenticated USING (
    public.is_admin_or_pastor()
    OR EXISTS (
      SELECT 1 FROM public.user_ministries um
      WHERE um.ministry_id = ministry_notices.ministry_id
        AND um.user_id = (select auth.uid())
        AND um.is_leader = true
    )
  );


-- ----------------------------------------------------------------------------
-- 4. ALTO: restringir escrita em "church_services" (cultos/programação)
-- ----------------------------------------------------------------------------
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable insert for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable update for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable delete for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can insert church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can update church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can delete church_services" ON public.church_services;

CREATE POLICY "Public can view church_services" ON public.church_services
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert church_services" ON public.church_services
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_pastor());

CREATE POLICY "Staff can update church_services" ON public.church_services
  FOR UPDATE TO authenticated USING (public.is_admin_or_pastor()) WITH CHECK (public.is_admin_or_pastor());

CREATE POLICY "Staff can delete church_services" ON public.church_services
  FOR DELETE TO authenticated USING (public.is_admin_or_pastor());


-- ----------------------------------------------------------------------------
-- 5. MÉDIO: remover escrita pública direta em "page_visits"
-- ----------------------------------------------------------------------------
-- Garante que a função de contagem seja SECURITY DEFINER (algumas versões do
-- schema a criaram sem isso), pois ela passa a ser o ÚNICO caminho de escrita
-- na tabela depois que as policies públicas de INSERT/UPDATE são removidas.
CREATE OR REPLACE FUNCTION increment_page_visit(p_page_name TEXT, p_visit_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO page_visits (page_name, visit_date, count)
  VALUES (p_page_name, p_visit_date, 1)
  ON CONFLICT (page_name, visit_date)
  DO UPDATE SET count = page_visits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can increment visits" ON public.page_visits;
DROP POLICY IF EXISTS "Public can update visits" ON public.page_visits;
DROP POLICY IF EXISTS "Admins can view visits" ON public.page_visits;

CREATE POLICY "Admins can view visits" ON public.page_visits
  FOR SELECT TO authenticated USING (public.is_admin());


-- ----------------------------------------------------------------------------
-- 6. ALTO: vazamento de PII em "congress_registrations" (CPF, WhatsApp,
--    endereço de todos os inscritos legível por qualquer requisição direta
--    à API, sem login)
-- ----------------------------------------------------------------------------
-- A inscrição pública continua liberada (INSERT). A leitura direta da tabela
-- passa a exigir ser staff (admin/pastor) ou o próprio dono da inscrição.
-- A consulta pública "ver status pela WhatsApp" (usada por quem se inscreveu
-- sem login) passa a usar a função abaixo em vez de SELECT direto, então
-- continua funcionando sem expor as inscrições de todo mundo.
DROP POLICY IF EXISTS "Anyone can view registrations" ON public.congress_registrations;
DROP POLICY IF EXISTS "Staff and owners can view registrations" ON public.congress_registrations;
DROP POLICY IF EXISTS "Staff can manage all registrations" ON public.congress_registrations;

CREATE POLICY "Staff and owners can view registrations" ON public.congress_registrations
  FOR SELECT TO authenticated
  USING (public.is_admin_or_pastor() OR (select auth.uid()) = user_id);

CREATE POLICY "Staff can manage all registrations" ON public.congress_registrations
  FOR ALL TO authenticated
  USING (public.is_admin_or_pastor())
  WITH CHECK (public.is_admin_or_pastor());

CREATE OR REPLACE FUNCTION public.check_congress_registration_by_whatsapp(
  p_congress_id UUID,
  p_whatsapp TEXT
)
RETURNS SETOF public.congress_registrations AS $$
  SELECT *
  FROM public.congress_registrations
  WHERE congress_id = p_congress_id
    AND personal_data->>'whatsapp' = p_whatsapp
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.check_congress_registration_by_whatsapp(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_congress_registration_by_whatsapp(UUID, TEXT) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 7. MÉDIO: "app_settings" e "media_contents" com nome de policy enganoso
--    ("Admins can...") mas condição USING(true)/WITH CHECK(true) — escrita
--    liberada pra qualquer um, mesmo não logado
-- ----------------------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and authenticated can upsert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Staff can manage app settings" ON public.app_settings;
CREATE POLICY "Staff can manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin_or_pastor())
  WITH CHECK (public.is_admin_or_pastor());

ALTER TABLE public.media_contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all media_contents" ON public.media_contents;
DROP POLICY IF EXISTS "Staff can manage all media_contents" ON public.media_contents;
CREATE POLICY "Staff can manage all media_contents" ON public.media_contents
  FOR ALL TO authenticated
  USING (public.is_admin_or_pastor())
  WITH CHECK (public.is_admin_or_pastor());


-- ----------------------------------------------------------------------------
-- 8. MÉDIO: "events_carousel" gerenciável por qualquer usuário autenticado
--    (não só admin/pastor)
-- ----------------------------------------------------------------------------
ALTER TABLE public.events_carousel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON public.events_carousel;
DROP POLICY IF EXISTS "Staff can manage events carousel" ON public.events_carousel;
CREATE POLICY "Staff can manage events carousel" ON public.events_carousel
  FOR ALL TO authenticated
  USING (public.is_admin_or_pastor())
  WITH CHECK (public.is_admin_or_pastor());


-- ============================================================================
-- FIM. Após rodar este script, confira em Database -> Advisors -> Security
-- no painel do Supabase para garantir que não sobrou nenhum alerta.
-- ============================================================================
