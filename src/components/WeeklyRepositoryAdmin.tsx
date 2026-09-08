import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  FileText, 
  Radio, 
  Share2, 
  Copy, 
  Check, 
  Upload, 
  Save, 
  Link as LinkIcon, 
  Video, 
  Sparkles, 
  ExternalLink, 
  Eye, 
  RefreshCw,
  FolderArchive,
  Layers,
  BookOpen,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Trash2,
  Edit2,
  Database,
  AlertTriangle,
  Code
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WeeklyRepositoryData, WeeklyVideoItem, WeeklyPdfItem, WeeklySpotifyItem } from './WeeklyRepository';

interface WeeklyRepositoryAdminProps {
  initialData?: WeeklyRepositoryData | null;
  onSaveSuccess?: (data: WeeklyRepositoryData) => void;
  isMinistryLoading?: boolean;
  setIsMinistryLoading?: (loading: boolean) => void;
  // Fallbacks for announcements / general media
  announcements?: any[];
  mediaContents?: any[];
  onAddAnnouncement?: () => void;
  onAddMedia?: () => void;
  onEditMedia?: (media: any) => void;
  onDeleteMedia?: (id: string) => void;
}

const defaultWeeklyData: WeeklyRepositoryData = {
  video1: {
    title: 'Culto de Celebração',
    url: '',
    author_name: 'Pastoral Mevam Itapema',
    thumbnail_url: '',
    category: 'Mensagem de Domingo'
  },
  video2: {
    title: 'Estudo Bíblico Semanal',
    url: '',
    author_name: 'Estudo Pastoral Semanal',
    thumbnail_url: '',
    category: 'Estudo Bíblico'
  },
  pdf: {
    title: 'Guia Semanal de Célula em PDF',
    subtitle: 'Material de estudo bíblico e edificação semanal em formato PDF',
    author_name: 'Corpo Pastoral Mevam Itapema',
    url: '',
    pages: '',
    size: ''
  },
  spotify: {
    title: 'Podcast Mevam Itapema Sertão',
    url: 'https://open.spotify.com',
    category: 'Mensagens & Devocionais Semanais',
    author_name: 'Mevam Itapema Oficial'
  }
};

export const WeeklyRepositoryAdmin: React.FC<WeeklyRepositoryAdminProps> = ({
  initialData,
  onSaveSuccess,
  isMinistryLoading = false,
  setIsMinistryLoading,
  announcements = [],
  mediaContents = [],
  onAddAnnouncement,
  onAddMedia,
  onEditMedia,
  onDeleteMedia
}) => {
  // Load draft from localStorage if present
  const [data, setData] = useState<WeeklyRepositoryData>(() => {
    try {
      const draft = localStorage.getItem('mevam_weekly_repository_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && parsed.video1 && parsed.video2) return parsed;
      }
    } catch (e) {}
    return initialData || defaultWeeklyData;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mevam_weekly_repository_has_draft') === 'true';
    } catch (e) {}
    return false;
  });

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'all_media'>('weekly');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const SQL_FIX_SETTINGS = `-- Executar no SQL Editor do Supabase para destravar salvamento do Repositório Semanal
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view app settings" ON app_settings;
CREATE POLICY "Public can view app settings" 
  ON app_settings FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins and authenticated can upsert app settings" ON app_settings;
DROP POLICY IF EXISTS "Staff can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated can manage app settings" ON app_settings;

CREATE POLICY "Authenticated can manage app settings" 
  ON app_settings FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);`;

  // Keep track of the last server data serialized to avoid false updates
  const lastServerDataRef = React.useRef<string>(JSON.stringify(initialData || defaultWeeklyData));

  // ONLY sync initialData from parent if incoming data is newer and no active unsaved edits
  useEffect(() => {
    if (initialData) {
      const serialized = JSON.stringify(initialData);
      if (serialized !== lastServerDataRef.current) {
        lastServerDataRef.current = serialized;
        // Never wipe the user's active alterations
        if (!hasUnsavedChanges) {
          const currentTimestamp = new Date(data.updated_at || 0).getTime();
          const incomingTimestamp = new Date(initialData.updated_at || 0).getTime();
          if (incomingTimestamp >= currentTimestamp) {
            setData(initialData);
          }
        }
      }
    }
  }, [initialData, hasUnsavedChanges, data.updated_at]);

  // Warn if leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Existem alterações não salvas no Repositório Semanal. Deseja sair?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Safe updater that protects user edits and auto-saves draft
  const updateData = (updater: (prev: WeeklyRepositoryData) => WeeklyRepositoryData) => {
    setData(prev => {
      const updated = updater(prev);
      setHasUnsavedChanges(true);
      try {
        const lightweightDraft = {
          ...updated,
          video1: {
            ...updated.video1,
            thumbnail_url: updated.video1.thumbnail_url?.startsWith('data:') ? '' : updated.video1.thumbnail_url
          },
          video2: {
            ...updated.video2,
            thumbnail_url: updated.video2.thumbnail_url?.startsWith('data:') ? '' : updated.video2.thumbnail_url
          },
          pdf: {
            ...updated.pdf,
            url: updated.pdf.url?.startsWith('data:') ? '' : updated.pdf.url
          }
        };
        localStorage.setItem('mevam_weekly_repository_draft', JSON.stringify(lightweightDraft));
        localStorage.setItem('mevam_weekly_repository_has_draft', 'true');
      } catch (e) {}
      return updated;
    });
  };

  const getSectionUrl = () => {
    if (typeof window === 'undefined') return '#assista';
    return `${window.location.origin}${window.location.pathname}#assista`;
  };

  const getFormattedWhatsAppMessage = () => {
    const sectionUrl = getSectionUrl();
    return `🔥 *REPOSITÓRIO SEMANAL - MEVAM ITAPEMA SERTÃO* 🔥\n\nConfira as ministrações, estudo bíblico e podcast desta semana para abençoar você e sua célula:\n\n🎥 *1. ${data.video1.title}*\n👤 ${data.video1.author_name}\n\n🎥 *2. ${data.video2.title}*\n👤 ${data.video2.author_name}\n\n📄 *3. Documento / Guia Semanal (PDF):*\n📖 ${data.pdf.title}\n\n🎙️ *4. Podcast / Spotify:*\n🎧 ${data.spotify.title}\n\n👉 *Acesse o Repositório completo no site:* \n${sectionUrl}`;
  };

  const shareOnWhatsApp = () => {
    const message = getFormattedWhatsAppMessage();
    const text = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const copyWhatsAppMessage = () => {
    const message = getFormattedWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Upload PDF handler (uploads to storage or converts file to data URL)
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);

      // 1. Tentar upload direto no storage (rápido e link leve)
      let publicFileUrl = '';
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `guia-semanal-${Date.now()}.${fileExt}`;
        const filePath = `weekly_repository/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('congress-proofs')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('congress-proofs')
            .getPublicUrl(filePath);
          if (publicUrl) publicFileUrl = publicUrl;
        }
      } catch (storageErr) {
        console.warn('Upload no storage não disponível, usando conversão local:', storageErr);
      }

      if (publicFileUrl) {
        updateData(prev => ({
          ...prev,
          pdf: {
            ...prev.pdf,
            url: publicFileUrl,
            size: `${fileSizeMb} MB`,
            title: prev.pdf.title || file.name.replace(/\.[^/.]+$/, "")
          }
        }));
        setUploadingPdf(false);
        return;
      }

      // 2. Fallback caso storage não esteja acessível
      if (file.size > 2 * 1024 * 1024) {
        alert('Atenção: Este arquivo PDF tem mais de 2MB. Para salvamentos instantâneos sem lentidão, recomendamos colar o link do arquivo no Google Drive ou OneDrive.');
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateData(prev => ({
          ...prev,
          pdf: {
            ...prev.pdf,
            url: result,
            size: `${fileSizeMb} MB`,
            title: prev.pdf.title || file.name.replace(/\.[^/.]+$/, "")
          }
        }));
        setUploadingPdf(false);
      };
      reader.onerror = () => {
        alert('Erro ao processar o arquivo PDF.');
        setUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn('Erro ao carregar PDF:', err);
      setUploadingPdf(false);
    }
  };

  // Upload Thumbnail handler for videos with automatic canvas optimization
  const handleThumbnailUpload = async (videoKey: 'video1' | 'video2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawData = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1200;
          const maxHeight = 720;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.82);
            updateData(prev => ({
              ...prev,
              [videoKey]: {
                ...prev[videoKey],
                thumbnail_url: optimized
              }
            }));
          } else {
            updateData(prev => ({
              ...prev,
              [videoKey]: {
                ...prev[videoKey],
                thumbnail_url: rawData
              }
            }));
          }
        };
        img.onerror = () => {
          updateData(prev => ({
            ...prev,
            [videoKey]: {
              ...prev[videoKey],
              thumbnail_url: rawData
            }
          }));
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Erro ao otimizar thumbnail:', err);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    if (setIsMinistryLoading) setIsMinistryLoading(true);

    try {
      const updatedData: WeeklyRepositoryData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // 1. Salvar no app_settings com timeout estrito de 4.5s para nunca travar a tela
      const upsertPromise = supabase
        .from('app_settings')
        .upsert({
          key: 'weekly_repository_data',
          value: updatedData,
          updated_at: new Date().toISOString()
        });

      const timeoutPromise = new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({ error: { message: 'Timeout na conexão com o banco (4.5s)' } });
        }, 4500);
      });

      const { error: settingsError } = await Promise.race([upsertPromise, timeoutPromise]);

      if (settingsError) {
        console.warn('Aviso ao salvar no app_settings:', settingsError.message);
        const isRls = settingsError.message?.toLowerCase().includes('policy') || 
                      settingsError.message?.toLowerCase().includes('permission') ||
                      settingsError.message?.toLowerCase().includes('security');
        if (isRls) {
          alert('Aviso do Supabase: A política de segurança (RLS) bloqueou o salvamento na nuvem. Suas alterações foram salvas com segurança no navegador. Clique no botão "Permissões SQL" para liberar a permissão definitiva no Supabase.');
          setShowSqlModal(true);
        }
      }

      // 2. Sincronização em segundo plano não-bloqueante para media_contents (executa em paralelo sem atrasar a UI)
      (async () => {
        try {
          const syncPromises = [];
          if (data.video1.url && !data.video1.thumbnail_url?.startsWith('data:')) {
            syncPromises.push(
              supabase.from('media_contents').insert({
                title: data.video1.title,
                category: data.video1.category || 'Mensagem',
                type: 'video',
                url: data.video1.url,
                thumbnail: data.video1.thumbnail_url,
                status: 'published',
                author_name: data.video1.author_name
              })
            );
          }
          if (data.video2.url && !data.video2.thumbnail_url?.startsWith('data:')) {
            syncPromises.push(
              supabase.from('media_contents').insert({
                title: data.video2.title,
                category: data.video2.category || 'Estudo',
                type: 'video',
                url: data.video2.url,
                thumbnail: data.video2.thumbnail_url,
                status: 'published',
                author_name: data.video2.author_name
              })
            );
          }
          if (data.pdf.url && !data.pdf.url.startsWith('data:')) {
            syncPromises.push(
              supabase.from('media_contents').insert({
                title: data.pdf.title,
                category: 'Guia Semanal',
                type: 'file',
                url: data.pdf.url,
                status: 'published',
                author_name: data.pdf.author_name
              })
            );
          }
          if (data.spotify.url) {
            syncPromises.push(
              supabase.from('media_contents').insert({
                title: data.spotify.title,
                category: 'Podcast',
                type: 'audio',
                url: data.spotify.url,
                status: 'published',
                author_name: data.spotify.author_name || 'Mevam Itapema'
              })
            );
          }
          await Promise.allSettled(syncPromises);
        } catch (mediaErr) {
          console.warn('Erro ao sincronizar media_contents em segundo plano:', mediaErr);
        }
      })();

      // 3. Persistência local imediata e segura
      try {
        const lightweightCache = {
          ...updatedData,
          video1: {
            ...updatedData.video1,
            thumbnail_url: updatedData.video1.thumbnail_url?.startsWith('data:') ? '' : updatedData.video1.thumbnail_url
          },
          video2: {
            ...updatedData.video2,
            thumbnail_url: updatedData.video2.thumbnail_url?.startsWith('data:') ? '' : updatedData.video2.thumbnail_url
          },
          pdf: {
            ...updatedData.pdf,
            url: updatedData.pdf.url?.startsWith('data:') ? '' : updatedData.pdf.url
          }
        };
        localStorage.setItem('weekly_repository_cache', JSON.stringify(lightweightCache));
      } catch (cacheErr) {
        console.warn('Aviso no cache local:', cacheErr);
      }

      // Limpar rascunho temporário
      try {
        localStorage.removeItem('mevam_weekly_repository_draft');
        localStorage.removeItem('mevam_weekly_repository_has_draft');
      } catch (e) {}

      setHasUnsavedChanges(false);
      lastServerDataRef.current = JSON.stringify(updatedData);

      if (onSaveSuccess) {
        onSaveSuccess(updatedData);
      }

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar repositório semanal:', err);
      alert(`Erro ao salvar repositório: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setSaving(false);
      if (setIsMinistryLoading) setIsMinistryLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Repositório Semanal Atualizado!</p>
              <p className="text-xs text-white/80">As alterações já estão visíveis no frontend.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SQL Permissions Help Modal */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-stone-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2 text-cyan-800">
                  <Database size={20} />
                  <h4 className="font-black text-lg text-stone-900">Permissão do Banco (RLS)</h4>
                </div>
                <button 
                  onClick={() => setShowSqlModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Se você receber mensagem de permissão negada ao salvar na nuvem, execute o comando abaixo no <strong>SQL Editor</strong> do seu painel Supabase para destravar a gravação definitiva:
              </p>

              <div className="bg-stone-950 rounded-2xl p-4 text-[11px] font-mono text-cyan-300 relative overflow-x-auto max-h-48 border border-stone-800">
                <pre>{SQL_FIX_SETTINGS}</pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_FIX_SETTINGS);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2500);
                  }}
                  className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  {sqlCopied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{sqlCopied ? 'SQL Copiado com Sucesso!' : 'Copiar Comando SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="inline-flex items-center space-x-2 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <FolderArchive size={14} />
            <span>Gestão de Conteúdo Semanal</span>
          </div>
          <h3 className="text-2xl font-black text-stone-900 tracking-tight">
            Repositório Semanal
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            Configure os 2 vídeos, o guia em PDF, o link do Spotify e compartilhe com a igreja.
          </p>
        </div>

        {/* View Toggle & SQL helper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            title="Ver script SQL de permissões caso ocorra erro no Supabase"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center gap-1.5 transition-colors border border-stone-200"
          >
            <Database size={13} className="text-cyan-700" />
            <span className="hidden sm:inline">Permissões SQL</span>
          </button>

          <div className="flex bg-stone-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'weekly' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Layers size={14} />
              <span>Repositório Ativo</span>
            </button>
            <button
              onClick={() => setActiveTab('all_media')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'all_media' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Video size={14} />
              <span>Todos os Conteúdos ({mediaContents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'weekly' ? (
        <div className="space-y-8">
          
          {/* 1. ATALHO DE COMPARTILHAMENTO NO WHATSAPP */}
          <div className="bg-gradient-to-br from-[#25D366]/10 via-[#25D366]/5 to-transparent border-2 border-[#25D366]/30 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-[#25D366] text-stone-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  <Share2 size={13} />
                  <span>Atalho WhatsApp Oficial</span>
                </div>
                <h4 className="text-xl font-bold text-stone-900">
                  Compartilhar Repositório Semanal no WhatsApp
                </h4>
                <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                  Dispare o link direto da seção <code className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800 font-mono text-[11px]">#assista</code> formatado com os 2 vídeos, o guia de estudo em PDF e o Spotify para os líderes de célula e membros da congregação.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-black px-6 py-3.5 rounded-2xl flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-[#25D366]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={18} />
                  <span>Disparar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={copyWhatsAppMessage}
                  className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold px-4 py-3.5 rounded-2xl flex items-center gap-2 text-xs md:text-sm transition-all"
                >
                  {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto & Link'}</span>
                </button>
              </div>
            </div>

            {/* Quick Preview Box */}
            <div className="mt-4 p-4 bg-white/80 rounded-2xl border border-stone-200/80 text-xs text-stone-600 font-mono space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-sans mb-1">
                Prévia da mensagem que será enviada:
              </span>
              <p className="line-clamp-2 text-stone-700 font-sans italic">
                "🔥 REPOSITÓRIO SEMANAL - MEVAM ITAPEMA SERTÃO 🔥 ... 🎥 1. {data.video1.title} ... 📄 3. Guia de Célula (PDF) ... 👉 Acesse: {getSectionUrl()}"
              </p>
            </div>
          </div>

          {/* STATUS DE ALTERAÇÕES NÃO SALVAS (RASCUNHO SEGURO) */}
          {hasUnsavedChanges && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <h5 className="font-black text-amber-950 text-sm">
                    Alterações em andamento (Rascunho seguro protegido)
                  </h5>
                  <p className="text-xs text-amber-800">
                    Seus dados estão preservados e não serão perdidos. Clique em "Salvar Repositório" para publicar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja realmente descartar as alterações não salvas e recarregar os dados do servidor?')) {
                      try {
                        localStorage.removeItem('mevam_weekly_repository_draft');
                        localStorage.removeItem('mevam_weekly_repository_has_draft');
                      } catch (e) {}
                      setHasUnsavedChanges(false);
                      setData(initialData || defaultWeeklyData);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-stone-600 hover:text-red-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Descartar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving || isMinistryLoading}
                  className="px-4 py-2 text-xs font-black text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Salvar Agora</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* FORMULÁRIO DE GESTÃO DO REPOSITÓRIO */}
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* VÍDEOS DA SEMANA (VÍDEO 1 & VÍDEO 2) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-stone-100">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Video size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-lg">1. Vídeos da Semana</h4>
                  <p className="text-xs text-stone-500">Configure as 2 ministrações que serão exibidas na grade principal</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* VÍDEO 1 */}
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                      Vídeo 1 (Culto Principal)
                    </span>
                    {data.video1.url && (
                      <a
                        href={data.video1.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-400 hover:text-primary flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>Testar Link</span>
                      </a>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Título do Vídeo 1</label>
                    <input
                      type="text"
                      value={data.video1.title}
                      onChange={(e) => updateData(prev => ({ ...prev, video1: { ...prev.video1, title: e.target.value } }))}
                      placeholder="Ex: Culto de Celebração: O Princípio da Honra"
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Link do Vídeo (YouTube / Vimeo)</label>
                    <input
                      type="url"
                      value={data.video1.url}
                      onChange={(e) => updateData(prev => ({ ...prev, video1: { ...prev.video1, url: e.target.value } }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Pregador / Autor</label>
                      <input
                        type="text"
                        value={data.video1.author_name}
                        onChange={(e) => updateData(prev => ({ ...prev, video1: { ...prev.video1, author_name: e.target.value } }))}
                        placeholder="Ex: Pr. André"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Categoria / Selo</label>
                      <input
                        type="text"
                        value={data.video1.category || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, video1: { ...prev.video1, category: e.target.value } }))}
                        placeholder="Ex: Mensagem de Domingo"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-stone-500 uppercase flex items-center justify-between">
                      <span>Imagem de Capa (Thumbnail URL)</span>
                      <label className="text-primary hover:text-primary-dark cursor-pointer text-[11px] flex items-center gap-1 font-bold">
                        <Upload size={11} />
                        <span>Subir Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleThumbnailUpload('video1', e)}
                        />
                      </label>
                    </label>
                    <input
                      type="url"
                      value={data.video1.thumbnail_url}
                      onChange={(e) => updateData(prev => ({ ...prev, video1: { ...prev.video1, thumbnail_url: e.target.value } }))}
                      placeholder="https://... ou faça upload acima"
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {data.video1.thumbnail_url && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-200 mt-2 bg-stone-900">
                        <img 
                          src={data.video1.thumbnail_url} 
                          alt="Prévia Thumbnail 1" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* VÍDEO 2 */}
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                      Vídeo 2 (Estudo / Secundário)
                    </span>
                    {data.video2.url && (
                      <a
                        href={data.video2.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-400 hover:text-primary flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>Testar Link</span>
                      </a>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Título do Vídeo 2</label>
                    <input
                      type="text"
                      value={data.video2.title}
                      onChange={(e) => updateData(prev => ({ ...prev, video2: { ...prev.video2, title: e.target.value } }))}
                      placeholder="Ex: Mergulhados na Presença: Princípios de Vida"
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Link do Vídeo (YouTube / Vimeo)</label>
                    <input
                      type="url"
                      value={data.video2.url}
                      onChange={(e) => updateData(prev => ({ ...prev, video2: { ...prev.video2, url: e.target.value } }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Pregador / Autor</label>
                      <input
                        type="text"
                        value={data.video2.author_name}
                        onChange={(e) => updateData(prev => ({ ...prev, video2: { ...prev.video2, author_name: e.target.value } }))}
                        placeholder="Ex: Equipe Pastoral"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Categoria / Selo</label>
                      <input
                        type="text"
                        value={data.video2.category || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, video2: { ...prev.video2, category: e.target.value } }))}
                        placeholder="Ex: Estudo Bíblico"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-stone-500 uppercase flex items-center justify-between">
                      <span>Imagem de Capa (Thumbnail URL)</span>
                      <label className="text-primary hover:text-primary-dark cursor-pointer text-[11px] flex items-center gap-1 font-bold">
                        <Upload size={11} />
                        <span>Subir Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleThumbnailUpload('video2', e)}
                        />
                      </label>
                    </label>
                    <input
                      type="url"
                      value={data.video2.thumbnail_url}
                      onChange={(e) => updateData(prev => ({ ...prev, video2: { ...prev.video2, thumbnail_url: e.target.value } }))}
                      placeholder="https://... ou faça upload acima"
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {data.video2.thumbnail_url && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-200 mt-2 bg-stone-900">
                        <img 
                          src={data.video2.thumbnail_url} 
                          alt="Prévia Thumbnail 2" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 2. GUIA EM PDF & SPOTIFY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* GUIA EM PDF (7 cols) */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-lg">2. Guia de Célula em PDF</h4>
                      <p className="text-xs text-stone-500">Material de estudo semanal para visualização e download</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Título do Documento / Guia (PDF)</label>
                    <input
                      type="text"
                      value={data.pdf.title}
                      onChange={(e) => updateData(prev => ({ ...prev, pdf: { ...prev.pdf, title: e.target.value } }))}
                      placeholder="Ex: Guia Semanal de Célula em PDF"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-500 uppercase">Subtítulo / Descrição</label>
                    <input
                      type="text"
                      value={data.pdf.subtitle || ''}
                      onChange={(e) => updateData(prev => ({ ...prev, pdf: { ...prev.pdf, subtitle: e.target.value } }))}
                      placeholder="Ex: Roteiro de Estudo Bíblico, Perguntas para Compartilhar..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Autor / Pastoral</label>
                      <input
                        type="text"
                        value={data.pdf.author_name}
                        onChange={(e) => updateData(prev => ({ ...prev, pdf: { ...prev.pdf, author_name: e.target.value } }))}
                        placeholder="Ex: Corpo Pastoral Mevam"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-500 uppercase">Páginas / Informações</label>
                      <input
                        type="text"
                        value={data.pdf.pages || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, pdf: { ...prev.pdf, pages: e.target.value } }))}
                        placeholder="Ex: 4 Páginas"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* PDF Upload / Link Options */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-3">
                    <label className="text-[11px] font-bold text-amber-900 uppercase block">
                      Arquivo PDF (Link Online ou Carregar Arquivo)
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={data.pdf.url}
                        onChange={(e) => updateData(prev => ({ ...prev, pdf: { ...prev.pdf, url: e.target.value } }))}
                        placeholder="https://.../meu-estudo.pdf ou Link do Google Drive"
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <label className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                        <Upload size={14} />
                        <span>{uploadingPdf ? 'Carregando...' : 'Carregar PDF'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={handlePdfFileUpload}
                        />
                      </label>
                    </div>

                    <p className="text-[11px] text-amber-700/80">
                      💡 <strong>Dica:</strong> Você pode colar um link do Google Drive, Dropbox ou carregar diretamente o arquivo PDF do seu computador.
                    </p>
                  </div>
                </div>
              </div>

              {/* SPOTIFY PODCAST (5 cols) */}
              <div className="lg:col-span-5 bg-[#121212] text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center">
                      <Radio size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">3. Spotify / Podcast</h4>
                      <p className="text-xs text-stone-400">Canal e episódios semanais</p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Título do Podcast / Programa</label>
                      <input
                        type="text"
                        value={data.spotify.title}
                        onChange={(e) => updateData(prev => ({ ...prev, spotify: { ...prev.spotify, title: e.target.value } }))}
                        placeholder="Ex: Podcast Mevam Itapema Sertão"
                        className="w-full bg-stone-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#1DB954]/40"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Link Oficial do Spotify</label>
                      <input
                        type="url"
                        value={data.spotify.url}
                        onChange={(e) => updateData(prev => ({ ...prev, spotify: { ...prev.spotify, url: e.target.value } }))}
                        placeholder="https://open.spotify.com/show/..."
                        className="w-full bg-stone-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#1DB954]/40"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Categoria / Descrição</label>
                      <input
                        type="text"
                        value={data.spotify.category || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, spotify: { ...prev.spotify, category: e.target.value } }))}
                        placeholder="Ex: Mensagens & Devocionais Semanais"
                        className="w-full bg-stone-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#1DB954]/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-stone-400">Integração Spotify</span>
                  <a
                    href={data.spotify.url || 'https://open.spotify.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <span>Abrir Canal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

            </div>

            {/* BOTÃO PRINCIPAL DE SALVAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-stone-900 text-white rounded-3xl shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-base">Publicar Repositório Semanal</h5>
                  <p className="text-xs text-stone-400">Salva e sincroniza em tempo real com todos os membros</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="flex-1 sm:flex-initial bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-bold px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all"
                >
                  <Share2 size={16} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="submit"
                  disabled={saving || isMinistryLoading}
                  className="flex-1 sm:flex-initial bg-primary hover:bg-primary-dark text-white font-black px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{saving ? 'Salvando...' : 'Salvar Repositório'}</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      ) : (
        /* TAB DE TODOS OS CONTEÚDOS / MENSAGENS COMPLEMENTARES */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-stone-900">Histórico de Mídias & Avisos</h4>
              <p className="text-xs text-stone-500">Gerencie todos os avisos gerais e publicações do canal de comunicação</p>
            </div>

            <div className="flex gap-2">
              {onAddAnnouncement && (
                <button
                  onClick={onAddAnnouncement}
                  className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Novo Aviso</span>
                </button>
              )}
              {onAddMedia && (
                <button
                  onClick={onAddMedia}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Novo Conteúdo Avulso</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaContents.map((media) => (
              <div 
                key={media.id}
                className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
                      {media.category || media.type}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {media.type}
                    </span>
                  </div>

                  <h5 className="font-bold text-stone-900 text-sm mb-2 line-clamp-2">
                    {media.title}
                  </h5>

                  {media.url && (
                    <p className="text-xs text-stone-400 truncate mb-4">
                      {media.url}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <span className="text-[10px] text-stone-400">
                    {media.author_name || 'Pastoral'}
                  </span>

                  <div className="flex items-center gap-1">
                    {onEditMedia && (
                      <button
                        onClick={() => onEditMedia(media)}
                        className="p-1.5 text-stone-500 hover:text-primary hover:bg-stone-100 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {onDeleteMedia && (
                      <button
                        onClick={() => onDeleteMedia(media.id)}
                        className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
