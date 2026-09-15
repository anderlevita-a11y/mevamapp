// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  category?: string;
  timestamp?: number;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  keys?: any;
  p256dh?: string;
  auth?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Configurações e chaves do Supabase & VAPID
const SUPABASE_URL = (
  Deno.env.get("SUPABASE_URL") || 
  "https://edjewxtfhsiekxiuhmrd.supabase.co"
).trim().replace(/\/$/, "");

const SUPABASE_SERVICE_ROLE_KEY = (
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
  Deno.env.get("SUPABASE_ANON_KEY") || 
  ""
).trim();

const VAPID_PUBLIC_KEY = 
  Deno.env.get("VAPID_PUBLIC_KEY") || 
  "BOrM4QJ-a66bIJToFdUHBnNtBdsqMhqyFn74cNODno8UQDRTfETpSrEHJFrxNO5j1mLIoovAuPXJZZBpv0Ba0ZE";

const VAPID_PRIVATE_KEY = 
  Deno.env.get("VAPID_PRIVATE_KEY") || 
  "q6YMrK4NENpglJagIpR6Ms7S_qS7BFChQGCFw-feNUY";

const VAPID_SUBJECT = 
  Deno.env.get("VAPID_SUBJECT") || 
  "mailto:pastoral@mevamitapema.com.br";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn("[Process Push Queue] VAPID já configurado ou aviso:", err);
}

// Utilitário para fatiar lista em lotes paralelos controlados
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Dispara notificação para os inscritos em lotes e limpa tokens expirados (410/404)
async function dispatchToSubscriptions(
  supabaseAdmin: any,
  subscriptions: PushSubscriptionRow[],
  payloadData: PushPayload
) {
  const payloadString = JSON.stringify(payloadData);
  const BATCH_SIZE = 50;
  const batches = chunkArray(subscriptions, BATCH_SIZE);
  const expiredIds: string[] = [];
  let totalSent = 0;

  for (const batch of batches) {
    const promises = batch.map(async (sub) => {
      let subKeys = sub.keys;
      if (typeof subKeys === "string") {
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
        return { status: "skipped", id: sub.id };
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: subKeys,
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString, {
          TTL: 60 * 60 * 24, // 24 horas no Google FCM / Apple APNs
        });
        return { status: "fulfilled", id: sub.id };
      } catch (err: any) {
        // Códigos 410 (Gone) ou 404 (Not Found) indicam que o usuário desinstalou ou revogou o push
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredIds.push(sub.id);
        }
        throw err;
      }
    });

    const results = await Promise.allSettled(promises);
    totalSent += results.filter((r) => r.status === "fulfilled").length;
  }

  // Expurgo automático dos aparelhos que revogaram permissão
  if (expiredIds.length > 0) {
    try {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
      console.log(`[Process Push Queue] Expurgo de ${expiredIds.length} tokens expirados realizado.`);
    } catch (cleanErr) {
      console.warn("[Process Push Queue] Falha ao expurgar tokens:", cleanErr);
    }
  }

  return {
    totalSent,
    totalCleaned: expiredIds.length,
  };
}

Deno.serve(async (req: Request) => {
  // Tratamento de CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // 1. Caso GET: diagnóstico rápido da fila e inscritos
    if (req.method === "GET") {
      const { count: subsCount } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });

      let pendingQueueCount = 0;
      try {
        const { count: qCount } = await supabaseAdmin
          .from("push_notification_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        pendingQueueCount = qCount || 0;
      } catch (_) {}

      return new Response(
        JSON.stringify({
          status: "ready",
          service: "process-push-queue",
          totalSubscribers: subsCount || 0,
          pendingQueueItems: pendingQueueCount,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Extrai parâmetros do corpo da requisição (se houver)
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (_) {
      bodyData = {};
    }

    // 3. Busca lista de subscrições ativas
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, keys, p256dh, auth");

    if (subsError) {
      throw new Error(`Erro ao buscar subscrições: ${subsError.message}`);
    }

    const subsList = (subscriptions || []) as PushSubscriptionRow[];

    // 4. MODO A: Envio Direto de Payload fornecido na requisição
    if (bodyData.title && bodyData.body) {
      const payload: PushPayload = {
        title: bodyData.title,
        body: bodyData.body,
        url: bodyData.url || "/#avisos",
        icon: bodyData.icon || "/pwa-192x192.png",
        badge: bodyData.badge || "/pwa-192x192.png",
        category: bodyData.category || "Geral",
        timestamp: Date.now(),
      };

      const result = await dispatchToSubscriptions(supabaseAdmin, subsList, payload);

      // Registra no histórico de disparos
      try {
        await supabaseAdmin.from("push_notification_logs").insert({
          title: payload.title,
          body: payload.body,
          category: payload.category,
          url: payload.url,
          sent_count: result.totalSent,
        });
      } catch (_) {}

      return new Response(
        JSON.stringify({
          success: true,
          mode: "direct_payload",
          sentCount: result.totalSent,
          totalCleaned: result.totalCleaned,
          totalTargeted: subsList.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 5. MODO B: Processamento da Tabela de Fila (push_notification_queue)
    let queueItems: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("push_notification_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(10);

      if (!error && data) {
        queueItems = data;
      }
    } catch (qErr) {
      console.info("[Process Push Queue] Tabela push_notification_queue não encontrada ou vazia.");
    }

    if (queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma notificação pendente na fila.",
          processedCount: 0,
          totalSubscribers: subsList.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const processedResults = [];

    // Processa cada item pendente da fila
    for (const item of queueItems) {
      // Marca como 'processing'
      await supabaseAdmin
        .from("push_notification_queue")
        .update({ status: "processing", attempts: (item.attempts || 0) + 1 })
        .eq("id", item.id);

      const payload: PushPayload = {
        title: item.title,
        body: item.body,
        url: item.url || "/#avisos",
        icon: item.icon || "/pwa-192x192.png",
        badge: item.badge || "/pwa-192x192.png",
        category: item.category || "Geral",
        timestamp: Date.now(),
      };

      try {
        const result = await dispatchToSubscriptions(supabaseAdmin, subsList, payload);

        // Marca como concluído com métricas
        await supabaseAdmin
          .from("push_notification_queue")
          .update({
            status: "completed",
            sent_count: result.totalSent,
            cleaned_count: result.totalCleaned,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        // Insere log
        try {
          await supabaseAdmin.from("push_notification_logs").insert({
            title: payload.title,
            body: payload.body,
            category: payload.category,
            url: payload.url,
            sent_count: result.totalSent,
          });
        } catch (_) {}

        processedResults.push({
          id: item.id,
          title: item.title,
          sentCount: result.totalSent,
          cleanedCount: result.totalCleaned,
          status: "completed",
        });
      } catch (itemErr: any) {
        // Marca como falha
        await supabaseAdmin
          .from("push_notification_queue")
          .update({
            status: "failed",
            error_message: itemErr?.message || "Erro desconhecido ao processar item",
          })
          .eq("id", item.id);

        processedResults.push({
          id: item.id,
          title: item.title,
          status: "failed",
          error: itemErr?.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "queue_processed",
        processedCount: processedResults.length,
        items: processedResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[Process Push Queue] Erro fatal:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "Erro interno na Edge Function de fila de push",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
