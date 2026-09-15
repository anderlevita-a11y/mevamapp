import { useEffect, useState, useCallback } from 'react';
import {
  subscribeUserToPush,
  isPushNotificationSupported,
  getNotificationPermissionStatus,
  testLocalPushNotification,
} from '../lib/pushNotifications';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Estados de Notificações Push no Dispositivo
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Atualiza o status atual de permissão de notificações
  const updateNotificationStatus = useCallback(() => {
    if (!isPushNotificationSupported()) {
      setNotificationPermission('unsupported');
      setIsNotificationEnabled(false);
      return;
    }

    const currentStatus = getNotificationPermissionStatus();
    setNotificationPermission(currentStatus);
    const hasPushEnabled = localStorage.getItem('mevam_push_enabled') === 'true';
    setIsNotificationEnabled(currentStatus === 'granted' && hasPushEnabled);
  }, []);

  useEffect(() => {
    // 1. Detecta se o aplicativo está rodando em modo standalone (instalado na tela inicial / desktop)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      return isStandaloneMedia || isIOSStandalone || isAndroidApp;
    };

    const standalone = checkStandalone();
    setIsInstalled(standalone);

    // 2. Detecta dispositivo iOS / Android
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    setIsAndroid(/android/.test(userAgent));

    // 3. Verifica cache de dispensa do banner de instalação
    const dismissedUntil = localStorage.getItem('mevam_pwa_install_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsDismissed(true);
    }

    // 4. Checa status inicial das notificações no dispositivo
    updateNotificationStatus();

    // Se o aplicativo já estiver instalado (standalone) e as notificações ainda estiverem em 'default',
    // convida o usuário a autorizar o recebimento de notificações no dispositivo
    if (standalone && isPushNotificationSupported()) {
      const currentStatus = getNotificationPermissionStatus();
      if (currentStatus === 'default') {
        const hasPrompted = localStorage.getItem('mevam_standalone_notif_prompted');
        if (!hasPrompted) {
          setShowNotificationPrompt(true);
        }
      } else if (currentStatus === 'granted') {
        // Garante que a subscrição está sincronizada em segundo plano
        subscribeUserToPush().catch(() => {});
      }
    }

    // 5. Captura prompt de instalação nativo do navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 6. Evento disparado quando o app é instalado com sucesso no sistema operacional
    const handleAppInstalled = async () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setJustInstalled(true);
      localStorage.removeItem('mevam_pwa_install_dismissed_until');

      // Ao instalar o app, verifica se as notificações já foram autorizadas
      if (isPushNotificationSupported()) {
        const perm = getNotificationPermissionStatus();
        if (perm === 'granted') {
          setIsNotificationEnabled(true);
          subscribeUserToPush().catch(() => {});
        } else if (perm === 'default') {
          // Abre o prompt de autorização para o novo app instalado
          setShowNotificationPrompt(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [updateNotificationStatus]);

  /**
   * Solicita e configura a autorização de notificações no dispositivo
   */
  const requestNotificationPermission = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isPushNotificationSupported()) {
      return { success: false, error: 'Notificações Push não suportadas neste dispositivo.' };
    }

    setIsSubscribingPush(true);
    try {
      const res = await subscribeUserToPush();
      setIsSubscribingPush(false);

      if (res.success) {
        setNotificationPermission('granted');
        setIsNotificationEnabled(true);
        setShowNotificationPrompt(false);
        localStorage.setItem('mevam_standalone_notif_prompted', 'true');
        localStorage.setItem('mevam_push_enabled', 'true');

        // Dispara notificação de boas-vindas para confirmação instantânea no aparelho
        try {
          await testLocalPushNotification(
            'MEVAM Itapema • Notificações Ativadas!',
            'Seu aparelho está autorizado para receber avisos de cultos e comunicados da igreja.'
          );
        } catch (e) {
          // Silencioso se o SO suprimir
        }

        return { success: true };
      } else {
        setNotificationPermission(res.permission || 'denied');
        return {
          success: false,
          error: res.error || 'A autorização de notificações foi recusada ou cancelada.',
        };
      }
    } catch (err: any) {
      setIsSubscribingPush(false);
      return {
        success: false,
        error: err?.message || 'Falha ao ativar notificações no dispositivo.',
      };
    }
  }, []);

  /**
   * Instalação do PWA + Configuração Automática de Notificações no Dispositivo
   */
  const install = async (): Promise<{ success: boolean; notificationGranted: boolean }> => {
    if (!deferredPrompt) {
      return { success: false, notificationGranted: false };
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setJustInstalled(true);

        // Configuração de autorização de notificações na instalação
        let notificationGranted = false;
        if (isPushNotificationSupported()) {
          try {
            const pushResult = await subscribeUserToPush();
            if (pushResult.success && pushResult.permission === 'granted') {
              notificationGranted = true;
              setNotificationPermission('granted');
              setIsNotificationEnabled(true);
              localStorage.setItem('mevam_standalone_notif_prompted', 'true');
              localStorage.setItem('mevam_push_enabled', 'true');

              try {
                await testLocalPushNotification(
                  'MEVAM Itapema Instalado!',
                  'Notificações autorizadas com sucesso no seu dispositivo.'
                );
              } catch (e) {}
            } else if (pushResult.permission === 'default') {
              // Se o navegador necessita de clique específico, exibe o prompt pós-instalação
              setShowNotificationPrompt(true);
            }
          } catch (pushErr) {
            console.warn('[PWA] Configuração de notificações pós-instalação:', pushErr);
            setShowNotificationPrompt(true);
          }
        }

        return { success: true, notificationGranted };
      }

      return { success: false, notificationGranted: false };
    } catch (err) {
      console.error('Erro ao executar prompt de instalação PWA:', err);
      return { success: false, notificationGranted: false };
    }
  };

  const dismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('mevam_standalone_notif_prompted', 'true');
  };

  const dismiss = (hours = 48) => {
    setIsDismissed(true);
    localStorage.setItem('mevam_pwa_install_dismissed_until', String(Date.now() + hours * 3600 * 1000));
  };

  const resetDismiss = () => {
    setIsDismissed(false);
    localStorage.removeItem('mevam_pwa_install_dismissed_until');
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isDismissed,
    notificationPermission,
    isNotificationEnabled,
    showNotificationPrompt,
    isSubscribingPush,
    justInstalled,
    install,
    requestNotificationPermission,
    dismissNotificationPrompt,
    setShowNotificationPrompt,
    dismiss,
    resetDismiss,
    promptEvent: deferredPrompt,
  };
}
