import React, { useState } from 'react';
import { Download, X, Share2, Smartphone, Monitor, CheckCircle, ArrowUpRight, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  forceShowModal?: boolean;
  onCloseModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  forceShowModal = false,
  onCloseModal
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDismissed, install, dismiss } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running as installed standalone PWA, don't show the banner
  if (isInstalled && !forceShowModal) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowGuideModal(true);
    } else {
      // Desktop or Android without prompt yet
      setShowGuideModal(true);
    }
  };

  const handleShareOnWhatsApp = () => {
    const text = `Acesse e instale o aplicativo oficial da MEVAM Itapema Sertão! Cultos ao vivo, mensagens, escalas e comunidade na palma da mão: ${window.location.origin}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isModalOpen = forceShowModal || showGuideModal;
  const handleCloseModal = () => {
    setShowGuideModal(false);
    if (onCloseModal) onCloseModal();
  };

  return (
    <>
      {/* Floating Installation Banner for Not-Yet-Installed Devices */}
      {!isDismissed && !isInstalled && (
        <aside
          aria-label="Instalação do Aplicativo"
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
                  // Fallback to Supabase image if static file is loading
                  (e.currentTarget as HTMLImageElement).src = 'https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/banner/Gemini_Generated_Image_9pspc69pspc69psp.jfif';
                }}
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 p-0.5 rounded-full ring-2 ring-stone-900">
                <Download size={10} strokeWidth={3} />
              </span>
            </div>

            {/* Banner Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm tracking-tight text-white truncate">
                  Instalar MEVAM Itapema
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  App PWA
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                Adicione à sua tela inicial ou área de trabalho para acesso rápido offline e notificações.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-stone-800/80 sm:border-0">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download size={14} />
                <span>{installing ? 'Instalando...' : 'Instalar'}</span>
              </button>

              <button
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

      {/* Success Notification */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">Aplicativo instalado com sucesso!</span>
        </div>
      )}

      {/* Guided Install Modal (For iOS or Manual Browser Prompt) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="MEVAM Itapema Sertão"
                  className="w-12 h-12 rounded-2xl object-contain bg-black border border-stone-700 shadow-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/banner/Gemini_Generated_Image_9pspc69pspc69psp.jfif';
                  }}
                />
                <div>
                  <h3 className="font-bold text-lg text-white">Instalar Aplicativo</h3>
                  <p className="text-xs text-stone-400">MEVAM Itapema Sertão</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Device-Specific Instructions */}
            <div className="py-5 space-y-4">
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
                        Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.
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
                  <p className="text-xs text-stone-300">
                    {isAndroid
                      ? 'O aplicativo pode ser instalado direto na tela inicial do seu celular com um único toque.'
                      : 'O aplicativo pode ser instalado diretamente na sua área de trabalho com um único clique.'}
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
                  >
                    <Download size={18} />
                    <span>Confirmar e Instalar Agora</span>
                  </button>
                </div>
              ) : isAndroid ? (
                // Android manual steps (Chrome without a native prompt yet, or another Android browser)
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
                        Confirme tocando em <strong>"Instalar"</strong> — o ícone do MEVAM aparece na sua tela inicial.
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
                        No menu de 3 pontos do navegador (canto superior direito) ou na barra de endereços, procure pelo ícone de <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-stone-800/60 p-3 rounded-xl border border-stone-700/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>
                        Confirme a instalação para ter o ícone do MEVAM na sua área de trabalho ou lista de apps.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Share on WhatsApp button */}
              <div className="pt-2">
                <button
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
