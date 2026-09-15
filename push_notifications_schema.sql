-- ============================================================================
-- MEVAM ITAPEMA: TABELA DE SUBSCRIÇÕES WEB PUSH / FCM NO SUPABASE
-- Guarda os endpoints e chaves dos aparelhos dos membros para Push Notifications
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Aparelhos Registrados para Notificação Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON public.push_subscriptions(endpoint);

-- 3. Habilitação de RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert and update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Staff can view all push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Staff can delete push subscriptions" ON public.push_subscriptions;

-- Qualquer visitante ou membro com o app/navegador pode registrar seu token de push
CREATE POLICY "Public can insert and update push subscriptions" 
ON public.push_subscriptions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Tabela de Logs de Disparos de Push (Histórico de Envios)
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  url TEXT DEFAULT '/#avisos',
  sent_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read push logs" ON public.push_notification_logs;
DROP POLICY IF EXISTS "Staff can insert push logs" ON public.push_notification_logs;

CREATE POLICY "Anyone can read push logs" ON public.push_notification_logs FOR SELECT USING (true);
CREATE POLICY "Staff can insert push logs" ON public.push_notification_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Tabela de Fila de Notificações Push (Queue para processamento assíncrono pela Edge Function)
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  url TEXT DEFAULT '/#avisos',
  badge TEXT DEFAULT '/pwa-192x192.png',
  icon TEXT DEFAULT '/pwa-192x192.png',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  cleaned_count INTEGER DEFAULT 0,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_queue_status ON public.push_notification_queue(status, created_at);

ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read push queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Staff can insert and update push queue" ON public.push_notification_queue;

CREATE POLICY "Anyone can read push queue" ON public.push_notification_queue FOR SELECT USING (true);
CREATE POLICY "Staff can insert and update push queue" ON public.push_notification_queue FOR ALL USING (true) WITH CHECK (true);

-- 6. Habilitar Realtime para subscrições, avisos e fila
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notification_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notification_queue;
