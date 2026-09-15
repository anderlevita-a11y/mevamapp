import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configuração VAPID (chaves pública/privada para autenticação junto aos servidores Web Push / Google FCM)
const VAPID_PUBLIC_KEY = 
  process.env.VAPID_PUBLIC_KEY || 
  'BOrM4QJ-a66bIJToFdUHBnNtBdsqMhqyFn74cNODno8UQDRTfETpSrEHJFrxNO5j1mLIoovAuPXJZZBpv0Ba0ZE';

const VAPID_PRIVATE_KEY = 
  process.env.VAPID_PRIVATE_KEY || 
  'q6YMrK4NENpglJagIpR6Ms7S_qS7BFChQGCFw-feNUY';

const VAPID_SUBJECT = 
  process.env.VAPID_SUBJECT || 
  'mailto:pastoral@mevamitapema.com.br';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[Push Batch] Detalhes VAPID já configurados ou erro na inicialização:', err);
}

// Inicializa o cliente do Supabase com a Service Role Key (ou fallback seguro para anon key) para ter permissão de exclusão
const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://edjewxtfhsiekxiuhmrd.supabase.co'
).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para fatiar o array em lotes
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function sendPushInBatches(payloadData: any) {
  // 1. Busca todas as subscrições ativas
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, keys, p256dh, auth');

  if (error || !subscriptions || subscriptions.length === 0) {
    return { success: true, count: 0, totalSent: 0, totalCleaned: 0 };
  }

  const payload = typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData);
  
  // Define o tamanho do lote de chamadas simultâneas (ex: 50 por vez)
  const BATCH_SIZE = 50; 
  const batches = chunkArray(subscriptions, BATCH_SIZE);
  
  const expiredSubscriptionIds: string[] = [];
  let totalSent = 0;

  // 2. Processa cada lote em sequência
  for (const batch of batches) {
    const promises = batch.map(async (sub: any) => {
      // Suporta subscrição onde keys é coluna JSON/string OU colunas individuais p256dh/auth
      let subKeys = sub.keys;
      if (typeof subKeys === 'string') {
        try {
          subKeys = JSON.parse(subKeys);
        } catch (_) {}
      }
      if (!subKeys || !subKeys.p256dh) {
        if (sub.p256dh && sub.auth) {
          subKeys = { p256dh: sub.p256dh, auth: sub.auth };
        }
      }

      if (!sub.endpoint || !subKeys?.p256dh || !subKeys?.auth) {
        return { status: 'skipped', id: sub.id };
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: subKeys,
      };

      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60 * 60 * 24 // 24 horas no FCM / APNs
        });
        return { status: 'fulfilled', id: sub.id };
      } catch (err: any) {
        // Captura códigos de token inativo ou removido pelo usuário (410 Gone ou 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubscriptionIds.push(sub.id);
        }
        throw err;
      }
    });

    // Aguarda a resolução de todas as requisições do lote atual
    const results = await Promise.allSettled(promises);
    
    // Contabiliza apenas os envios bem-sucedidos
    totalSent += results.filter((r) => r.status === 'fulfilled').length;
  }

  // 3. Expurga em massa os tokens inválidos/expirados do Supabase
  if (expiredSubscriptionIds.length > 0) {
    try {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptionIds);
      console.log(`[Push Batch] Expurgo de ${expiredSubscriptionIds.length} tokens inválidos/expirados concluído no Supabase.`);
    } catch (cleanErr) {
      console.warn('[Push Batch] Erro ao expurgar tokens expirados:', cleanErr);
    }
  }

  return {
    success: true,
    totalSent,
    totalCleaned: expiredSubscriptionIds.length,
  };
}
