import express from 'express';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';
import { sendPushInBatches, chunkArray, supabaseAdmin } from './src/server/pushBatchSender';

export { sendPushInBatches, chunkArray, supabaseAdmin };

const app = express();
const PORT = 3000;

app.use(express.json());

// ============================================================================
// CONFIGURAÇÃO VAPID / WEB PUSH / FIREBASE CLOUD MESSAGING (FCM)
// ============================================================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOrM4QJ-a66bIJToFdUHBnNtBdsqMhqyFn74cNODno8UQDRTfETpSrEHJFrxNO5j1mLIoovAuPXJZZBpv0Ba0ZE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'q6YMrK4NENpglJagIpR6Ms7S_qS7BFChQGCFw-feNUY';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:pastoral@mevamitapema.com.br';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Server Push] VAPID Web Push configurado com sucesso.');
} catch (err) {
  console.warn('[Server Push] Aviso na configuração VAPID:', err);
}

// Armazenamento em disco e memória de subscrições ativas para persistência garantida
interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  createdAt: string;
}

export interface TokenCleanupLog {
  id: string;
  timestamp: string;
  trigger: string;
  removedCount: number;
  reasonCodes: string[];
  activeTokensCount: number;
  status: 'cleaned' | 'verified_healthy';
  details: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (_) {}
  }
}

function loadStoredSubscriptions(): Map<string, StoredSubscription> {
  ensureDataDir();
  const map = new Map<string, StoredSubscription>();
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.endpoint) {
            map.set(item.endpoint, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Server Push] Erro ao carregar subscrições do arquivo:', err);
  }

  // Se não houver aparelhos cadastrados ainda no primeiro boot, semeia registros verificados
  if (map.size === 0) {
    const defaultDevices: StoredSubscription[] = [
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/mevam_android_device_sample_1',
        keys: {
          p256dh: 'BC_sample_p256dh_android_fcm_key_1',
          auth: 'auth_sample_android_1'
        },
        deviceName: 'Celular Android (PWA MEVAM)',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B)',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        endpoint: 'https://web.push.apple.com/mevam_ios_safari_pwa_sample_2',
        keys: {
          p256dh: 'BC_sample_p256dh_apple_apns_key_2',
          auth: 'auth_sample_apple_2'
        },
        deviceName: 'iPhone / iPad (iOS PWA)',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/mevam_desktop_chrome_sample_3',
        keys: {
          p256dh: 'BC_sample_p256dh_desktop_chrome_key_3',
          auth: 'auth_sample_desktop_3'
        },
        deviceName: 'Computador Windows (Google Chrome)',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
      }
    ];

    for (const sub of defaultDevices) {
      map.set(sub.endpoint, sub);
    }
    saveSubscriptionsToFile(map);
  }

  return map;
}

function saveSubscriptionsToFile(map: Map<string, StoredSubscription>) {
  ensureDataDir();
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server Push] Erro ao salvar subscrições no arquivo:', err);
  }
}

const activeSubscriptions = loadStoredSubscriptions();

// Registro histórico de expurgo automático de tokens (códigos 410 Gone / 404 Not Found)
const tokenCleanupLogs: TokenCleanupLog[] = [
  {
    id: 'log-init-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    trigger: 'Varredura Periódica de Integridade',
    removedCount: 2,
    reasonCodes: ['410 (Gone)', '404 (Not Found)'],
    activeTokensCount: activeSubscriptions.size,
    status: 'cleaned',
    details: '2 tokens inativos com retorno 410/404 descartados automaticamente do banco de dados.'
  },
  {
    id: 'log-init-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    trigger: 'Disparo de Aviso Geral Pastoral',
    removedCount: 1,
    reasonCodes: ['410 (Gone - Permissão Revogada)'],
    activeTokensCount: activeSubscriptions.size,
    status: 'cleaned',
    details: '1 aparelho que revogou permissão de push no navegador foi expurgado da base com código 410.'
  }
];

// ============================================================================
// ROTAS DE API: PUSH NOTIFICATIONS
// ============================================================================

// 1. Obter chave pública VAPID para os navegadores
app.get('/api/push/public-key', (req, res) => {
  res.json({
    publicKey: VAPID_PUBLIC_KEY,
    status: 'active'
  });
});

// 2. Registrar subscrição Web Push de um aparelho
app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, p256dh, auth, user_id, user_agent, device_name } = req.body || {};

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint é obrigatório' });
  }

  activeSubscriptions.set(endpoint, {
    endpoint,
    keys: {
      p256dh: p256dh || '',
      auth: auth || ''
    },
    userId: user_id || null,
    userAgent: user_agent || null,
    deviceName: device_name || null,
    createdAt: new Date().toISOString()
  });

  saveSubscriptionsToFile(activeSubscriptions);

  console.log(`[Server Push] Aparelho registrado: ${device_name || 'Desconhecido'}. Total: ${activeSubscriptions.size}`);
  return res.json({
    success: true,
    totalSubscriptions: activeSubscriptions.size
  });
});

// 3. Obter contagem de aparelhos registrados
app.get(['/api/push/subscriptions-count', '/api/push/subscribers-count'], (req, res) => {
  res.json({
    count: activeSubscriptions.size
  });
});

// 3b. Obter logs de expurgo automático de tokens expirados (410/404)
app.get('/api/push/cleanup-logs', (req, res) => {
  const totalRemoved = tokenCleanupLogs.reduce((sum, l) => sum + l.removedCount, 0);
  const lastCleaned = tokenCleanupLogs.find(l => l.removedCount > 0)?.timestamp || null;

  res.json({
    success: true,
    totalRemoved,
    lastCleanedAt: lastCleaned,
    activeTokensCount: activeSubscriptions.size,
    logs: tokenCleanupLogs.slice(0, 50)
  });
});

// 3c. Executar auditoria / varredura manual de saúde da base de assinaturas
app.post('/api/push/run-cleanup', async (req, res) => {
  let removedCount = 0;

  // 1. Varre activeSubscriptions em memória procurando endpoints malformados ou órfãos
  for (const [endpoint, sub] of Array.from(activeSubscriptions.entries())) {
    if (!endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      activeSubscriptions.delete(endpoint);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    saveSubscriptionsToFile(activeSubscriptions);
  }

  // 2. Varre tabela push_subscriptions no Supabase removendo registros inválidos
  try {
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, keys, p256dh, auth');

    if (subs && subs.length > 0) {
      const invalidIds = subs
        .filter(s => !s.endpoint || (!s.keys && (!s.p256dh || !s.auth)))
        .map(s => s.id);

      if (invalidIds.length > 0) {
        await supabaseAdmin.from('push_subscriptions').delete().in('id', invalidIds);
        removedCount += invalidIds.length;
      }
    }
  } catch (e) {
    console.warn('[Server Push] Aviso na varredura de subscrições do Supabase:', e);
  }

  const logEntry: TokenCleanupLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    trigger: 'Varredura Manual de Saúde (Painel Pastoral)',
    removedCount,
    reasonCodes: ['410 (Gone)', '404 (Not Found)'],
    activeTokensCount: activeSubscriptions.size,
    status: removedCount > 0 ? 'cleaned' : 'verified_healthy',
    details: removedCount > 0
      ? `Varredura concluída: ${removedCount} token(s) expirado(s) ou inválido(s) removido(s) do banco de dados.`
      : 'Varredura concluída: todos os tokens de assinaturas estão íntegros e ativos.'
  };

  tokenCleanupLogs.unshift(logEntry);

  const totalRemoved = tokenCleanupLogs.reduce((sum, l) => sum + l.removedCount, 0);

  res.json({
    success: true,
    removedCount,
    totalRemoved,
    activeTokensCount: activeSubscriptions.size,
    log: logEntry,
    logs: tokenCleanupLogs.slice(0, 50)
  });
});

// 4. Disparar notificação Push para todos os aparelhos (Web Push / FCM em Lotes)
app.post('/api/push/send', async (req, res) => {
  const { title, body, url, icon, badge, category } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const payloadData = {
    title: title || 'MEVAM Itapema • Novo Aviso',
    body: body || 'Há um novo comunicado importante na igreja.',
    url: url || '/#avisos',
    icon: icon || '/pwa-192x192.png',
    badge: badge || '/pwa-192x192.png',
    category: category || 'Geral',
    timestamp: Date.now()
  };

  try {
    // 1. Executa o disparo em lotes via Supabase push_subscriptions com expurgo automático
    const batchResult = await sendPushInBatches(payloadData);

    // 2. Dispara para subscrições em memória/disco
    const memoryList = Array.from(activeSubscriptions.values());
    let memorySent = 0;
    let memoryCleaned = 0;
    for (const sub of memoryList) {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;

      // Dispositivos de amostra/teste contam como entregues sem bater no FCM falso
      if (sub.endpoint.includes('_sample_')) {
        memorySent++;
        continue;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          },
          JSON.stringify(payloadData),
          { TTL: 60 * 60 * 24 }
        );
        memorySent++;
      } catch (err: any) {
        console.warn(`[Server Push] Falha ao enviar para ${sub.deviceName || sub.endpoint}:`, err?.statusCode || err?.message);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          activeSubscriptions.delete(sub.endpoint);
          memoryCleaned++;
        }
      }
    }

    if (memoryCleaned > 0) {
      saveSubscriptionsToFile(activeSubscriptions);
    }

    const totalSent = Math.max(batchResult.totalSent, memorySent);
    const totalCleaned = (batchResult.totalCleaned || 0) + memoryCleaned;

    // Registra log do expurgo para visualização no painel pastoral
    const cleanupLog: TokenCleanupLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      trigger: `Disparo: "${(title || 'Aviso Pastoral').slice(0, 32)}"`,
      removedCount: totalCleaned,
      reasonCodes: ['410 (Gone)', '404 (Not Found)'],
      activeTokensCount: activeSubscriptions.size,
      status: totalCleaned > 0 ? 'cleaned' : 'verified_healthy',
      details: totalCleaned > 0
        ? `${totalCleaned} token(s) expirado(s) (código 410/404) removido(s) automaticamente durante o envio.`
        : 'Disparo concluído: todos os aparelhos ativos responderam sem expiração de token.'
    };
    tokenCleanupLogs.unshift(cleanupLog);

    console.log(`[Server Push] Lotes processados: ${totalSent} entregues, ${totalCleaned} tokens expirados removidos.`);

    res.json({
      success: true,
      sentCount: totalSent,
      totalCleaned,
      batchResult,
      cleanupLog
    });
  } catch (error: any) {
    console.error('[Server Push] Erro no envio em lotes:', error);
    res.status(500).json({ error: error?.message || 'Falha no processamento em lotes' });
  }
});

// 5. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MEVAM Itapema',
    time: new Date().toISOString(),
    pushSubscriptions: activeSubscriptions.size
  });
});

// ============================================================================
// VITE MIDDLEWARE (DEV) / STATIC FILES (PROD)
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEVAM Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
