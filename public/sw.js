// ============================================================================
// MEVAM ITAPEMA - SERVICE WORKER & WEB PUSH (sw.js)
// Gerencia notificações em segundo plano (Web Push API / FCM) e cache PWA
// ============================================================================

const SW_VERSION = 'mevam-sw-v1.0.0';
const CACHE_NAME = 'mevam-static-v1';

// 1. Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Instalando ${SW_VERSION}`);
  // Força ativação imediata sem esperar o fechamento de outras abas
  self.skipWaiting();
});

// 2. Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Ativado ${SW_VERSION}`);
  event.waitUntil(
    Promise.all([
      // Assume o controle de todos os clientes/abas abertas imediatamente
      self.clients.claim(),
      // Limpeza de caches antigos caso existam
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// 3. Recepção de Notificação Push em Segundo Plano (Web Push API / FCM)
// Executa mesmo com o navegador ou aplicativo PWA fechado no celular/computador
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Evento Push recebido:', event);

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: 'MEVAM Itapema • Novo Aviso',
        body: event.data.text()
      };
    }
  }

  // Se o push vier no formato padrão FCM/Google (objeto notification dentro do payload)
  const notificationData = payload.notification || payload;

  const title = notificationData.title || payload.title || 'MEVAM Itapema • Novo Aviso';
  const body = notificationData.body || payload.body || payload.content || 'Há um novo comunicado pastoral disponível na igreja.';
  const icon = notificationData.icon || payload.icon || '/pwa-192x192.png';
  const badge = notificationData.badge || payload.badge || '/pwa-192x192.png';
  const image = notificationData.image || payload.image || undefined;
  const tag = payload.tag || `mevam-notice-${Date.now()}`;
  const targetUrl = payload.url || payload.click_action || (notificationData.data && notificationData.data.url) || '/#avisos';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    image: image,
    // Padrão de vibração nativo para celulares Android (vibra, pausa, vibra)
    vibrate: [250, 100, 250, 100, 250],
    tag: tag,
    renotify: true,
    requireInteraction: false,
    data: {
      url: targetUrl,
      timestamp: Date.now(),
      noticeId: payload.id || null
    },
    actions: [
      {
        action: 'open_notice',
        title: 'Visualizar Aviso'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ]
  };

  // Chama a API nativa de notificação do sistema operacional
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// 4. Clique na Notificação pelo Usuário
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada:', event.action);

  // Fecha o banner da notificação no sistema operacional
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const destinationUrl = (event.notification.data && event.notification.data.url) || '/#avisos';

  // Foca na aba/app aberto ou abre uma nova janela
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Procura por uma aba já aberta do MEVAM
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(destinationUrl);
          }
          return client.focus();
        }
      }
      // Se nenhuma estiver aberta, abre uma nova janela/PWA
      if (clients.openWindow) {
        return clients.openWindow(destinationUrl);
      }
    })
  );
});

// 5. Comunicação interna com a aplicação (PostMessage)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Permite que o front-end solicite a exibição de uma notificação de teste ou local
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'MEVAM Itapema', {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      ...options
    });
  }

  // Responder com status do Service Worker
  if (event.data.type === 'PING') {
    if (event.source && event.source.postMessage) {
      event.source.postMessage({ type: 'PONG', version: SW_VERSION, active: true });
    }
  }
});
