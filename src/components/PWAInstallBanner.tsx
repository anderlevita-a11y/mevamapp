import React, { useState } from 'react';
import {
  Download,
  X,
  Share2,
  Smartphone,
  Monitor,
  CheckCircle,
  Bell,
  BellRing,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  forceShowModal?: boolean;
  onCloseModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  forceShowModal = false,
  onCloseModal
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDismissed,
    notificationPermission,
    isNotificationEnabled,
    showNotificationPrompt,
    isSubscribingPush,
    install,
    requestNotificationPermission,
    dismissNotificationPrompt,
    dismiss
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [installedMessage, setInstalledMessage] = useState('Aplicativo instalado com sucesso!');
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const res = await install();
      setInstalling(false);
      if (res.success) {
        if (res.notificationGranted) {
          setInstalledMessage('Aplicativo instalado e notificações autorizadas com sucesso!');
        } else {
          setInstalledMessage('Aplicativo instalado com sucesso!');
        }
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 5000);
      }
    } else if (isIOS) {
      setShowGuideModal(true);
    } else {
      // Desktop or Android without direct prompt yet
      setShowGuideModal(true);
    }
  };

  const handleAuthorizeNotifications = async () => {
    setNotificationError(null);
    const res = await requestNotificationPermission();
    if (res.success) {
      setInstalledMessage('Notificações no dispositivo autorizadas com sucesso!');
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    } else {
      setNotificationError(res.error || 'Não foi possível autorizar notificações.');
    }
  };

  const handleShareOnWhatsApp = () => {
    const text = `Acesse e instale o aplicativo oficial da MEVAM Itapema Sertão! Cultos ao vivo, mensagens, escalas e notificações no celular: ${window.location.origin}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isModalOpen = forceShowModal || showGuideModal;
  const handleCloseModal = () => {
    setShowGuideModal(false);
    if (onCloseModal) onCloseModal();
  };

  return (
    <>
      {/* 1. Floating Installation Banner for Devices where App is not yet installed */}
      {!isDismissed && !isInstalled && (
        <aside
          aria-label="Instalação do Aplicativo e Autorização de Notificações"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-stone-900/95 backdrop-blur-md border border-stone-800 text-white rounded-2xl p-4 shadow-2xl shadow-black/50 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Logo Image */}
            <div className="relative flex-shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="MEVAM App"
                className="w-12 h-12 rounded-xl object-contain bg-black border border-stone-700 shadow-md"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/banner/Gemini_Generated_Image_9pspc69pspc69psp.jfif';
                }}
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 p-1 rounded-full ring-2 ring-stone-900">
                <Bell size={10} strokeWidth={2.5} />
              </span>
            </div>

            {/* Banner Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm tracking-tight text-white truncate">
                  Instalar MEVAM Itapema
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <BellRing size={9} />
                  <span>Notificações</span>
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                Instale para acesso offline e autorize receber alertas de cultos ao vivo e comunicados no seu aparelho.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-stone-800/80 sm:border-0">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                <span>{installing ? 'Instalando...' : 'Instalar'}</span>
              </button>

              <button
                type="button"
                onClick={() => dismiss(48)}
                className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition cursor-pointer"
                title="Fechar por 48 horas"
                aria-label="Fechar banner de instalação"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Success Toast (Install or Notification Authorization) */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 max-w-sm">
          <CheckCircle size={20} className="flex-shrink-0 text-emerald-100" />
          <span className="text-xs sm:text-sm font-semibold leading-tight">{installedMessage}</span>
        </div>
      )}

      {/* 3. Modal Dedicado: Autorização de Notificações no Dispositivo (Pós-Instalação ou Standalone) */}
      {showNotificationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-amber-500/30 text-stone-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                <BellRing size={24} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles size={13} />
                  <span>Configuração do Dispositivo</span>
                </div>
                <h3 className="font-bold text-lg text-white leading-snug">
                  Autorizar Notificações no Dispositivo
                </h3>
                <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                  Deseja receber avisos de cultos ao vivo, escalas ministeriais e comunicados pastorais diretamente no seu celular?
                </p>
              </div>
            </div>

            {/* Notification Benefits */}
            <div className="mt-4 bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
                <span>Alertas em tempo real quando o culto começar</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
                <span>Lembretes de escalas de serviço e ministérios</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
                <span>Sem propagandas, apenas comunicados da MEVAM</span>
              </div>
            </div>

            {/* Error state if any */}
            {notificationError && (
              <div className="mt-3 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 text-red-400 mt-0.5" />
                <span>{notificationError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={isSubscribingPush}
                onClick={handleAuthorizeNotifications}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Bell size={16} />
                <span>{isSubscribingPush ? 'Configurando no Aparelho...' : 'Autorizar Notificações Agora'}</span>
              </button>

              <button
                type="button"
                onClick={dismissNotificationPrompt}
                className="py-3 px-4 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 font-medium rounded-xl text-xs transition cursor-pointer text-center"
              >
                Mais Tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Guided Installation & Notification Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="MEVAM Itapema Sertão"
                  className="w-12 h-12 rounded-2xl object-contain bg-black border border-stone-700 shadow-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/banner/Gemini_Generated_Image_9pspc69pspc69psp.jfif';
                  }}
                />
                <div>
                  <h3 className="font-bold text-lg text-white">Instalar Aplicativo</h3>
                  <p className="text-xs text-stone-400">MEVAM Itapema Sertão</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Notification Status Banner inside modal */}
            <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
              <BellRing size={18} className="text-amber-400 flex-shrink-0" />
              <div className="text-xs leading-tight">
                {isNotificationEnabled ? (
                  <span className="text-emerald-400 font-semibold">
                    ✓ Notificações já autorizadas e ativas neste dispositivo.
                  </span>
                ) : (
                  <span className="text-stone-300">
                    A autorização de <strong>notificações no dispositivo</strong> é configurada durante a instalação.
                  </span>
                )}
              </div>
            </div>

            {/* Device-Specific Instructions */}
            <div className="py-4 space-y-4">
              {isIOS ? (
                // iOS Safari Steps
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Smartphone size={18} />
                    <span>Como instalar no iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="space-y-2.5 text-xs text-stone-300">
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>
                        Toque no botão de <strong>Compartilhar</strong> na barra inferior do Safari (ícone de um quadrado com seta para cima).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>
                        Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        3
                      </span>
                      <span>
                        Toque em <strong>"Adicionar"</strong> e depois abra o app instalado na sua tela inicial para <strong>autorizar as notificações</strong>.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : isInstallable ? (
                // Direct Chrome/Edge install (native browser prompt available)
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    {isAndroid ? <Smartphone size={18} /> : <Monitor size={18} />}
                    <span>{isAndroid ? 'Instalação Direta no Android:' : 'Instalação Direta:'}</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Instale o app na tela inicial e autorize o recebimento de notificações no seu dispositivo com um clique.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Download size={18} />
                    <span>{installing ? 'Instalando e Ativando...' : 'Instalar e Autorizar Notificações'}</span>
                  </button>
                </div>
              ) : isAndroid ? (
                // Android manual steps
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Smartphone size={18} />
                    <span>Como instalar no Android (Chrome):</span>
                  </div>
                  <ol className="space-y-2.5 text-xs text-stone-300">
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>
                        Toque no menu de <strong>3 pontinhos</strong> no canto superior direito do navegador.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>
                        Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        3
                      </span>
                      <span>
                        Confirme a instalação e autorize as notificações para receber avisos em tempo real.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                // Desktop guidance
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Monitor size={18} />
                    <span>Instalação no Navegador / Desktop:</span>
                  </div>
                  <ol className="space-y-2.5 text-xs text-stone-300">
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>
                        Na barra de endereços ou no menu de 3 pontos do navegador, clique em <strong>"Instalar aplicativo"</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>
                        Ao instalar, clique em <strong>"Permitir"</strong> quando o navegador solicitar autorização para notificações.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Botão para ativar notificações manualmente se o app já estiver instalado */}
              {isInstalled && !isNotificationEnabled && (
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isSubscribingPush}
                    onClick={handleAuthorizeNotifications}
                    className="w-full py-2.5 px-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <BellRing size={16} />
                    <span>{isSubscribingPush ? 'Configurando...' : 'Autorizar Notificações no Dispositivo'}</span>
                  </button>
                </div>
              )}

              {/* Share on WhatsApp */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleShareOnWhatsApp}
                  className="w-full py-2.5 px-4 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/50 text-emerald-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 size={16} />
                  <span>Compartilhar Link do App no WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
