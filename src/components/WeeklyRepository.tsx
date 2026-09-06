import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Share2, 
  FileText, 
  Download, 
  Eye, 
  Radio, 
  ExternalLink, 
  X, 
  Check, 
  BookOpen, 
  Sparkles,
  Calendar,
  User,
  Music2,
  Clock,
  Copy,
  FolderArchive,
  Layers,
  MessageCircle
} from 'lucide-react';

export interface WeeklyVideoItem {
  id?: string;
  title: string;
  url: string;
  author_name: string;
  thumbnail_url: string;
  category?: string;
}

export interface WeeklyPdfItem {
  id?: string;
  title: string;
  subtitle?: string;
  url: string;
  author_name: string;
  pages?: string;
  size?: string;
  content_text?: string;
}

export interface WeeklySpotifyItem {
  id?: string;
  title: string;
  url: string;
  category?: string;
  author_name?: string;
}

export interface WeeklyRepositoryData {
  video1: WeeklyVideoItem;
  video2: WeeklyVideoItem;
  pdf: WeeklyPdfItem;
  spotify: WeeklySpotifyItem;
  updated_at?: string;
}

interface MediaItem {
  id: string;
  title: string;
  category?: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  content_text?: string;
  author_name?: string;
  created_at?: string;
}

interface WeeklyRepositoryProps {
  mediaContents?: MediaItem[];
  weeklyData?: WeeklyRepositoryData | null;
  onOpenPost?: (post: any) => void;
}

export const WeeklyRepository: React.FC<WeeklyRepositoryProps> = ({ 
  mediaContents = [], 
  weeklyData,
  onOpenPost 
}) => {
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string; author: string } | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Helper to get embeddable YouTube URL
  const getEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    try {
      if (rawUrl.includes('youtube.com/watch?v=')) {
        const id = rawUrl.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (rawUrl.includes('youtu.be/')) {
        const id = rawUrl.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (rawUrl.includes('youtube.com/live/')) {
        const id = rawUrl.split('youtube.com/live/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (rawUrl.includes('youtube.com/embed/')) {
        return rawUrl.includes('?') ? `${rawUrl}&autoplay=1` : `${rawUrl}?autoplay=1`;
      }
    } catch {
      return rawUrl;
    }
    return rawUrl;
  };

  const getSectionUrl = () => {
    if (typeof window === 'undefined') return '#assista';
    return `${window.location.origin}${window.location.pathname}#assista`;
  };

  const shareSectionOnWhatsApp = () => {
    const sectionUrl = getSectionUrl();
    const message = `🔥 *REPOSITÓRIO SEMANAL - MEVAM ITAPEMA SERTÃO* 🔥\n\nConfira as ministrações, estudo bíblico e podcast desta semana para abençoar você e sua célula:\n\n🎥 *1. ${video1.title}*\n👤 ${video1.author_name}\n\n🎥 *2. ${video2.title}*\n👤 ${video2.author_name}\n\n📄 *3. Documento / Guia Semanal (PDF):*\n📖 ${pdfItem.title}\n\n🎙️ *4. Podcast / Mensagens no Spotify:*\n🎧 ${spotifyTitle}\n\n👉 *Acesse o Repositório completo no site:* \n${sectionUrl}`;
    
    const text = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const copySectionLink = () => {
    const sectionUrl = getSectionUrl();
    navigator.clipboard.writeText(sectionUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const shareItemOnWhatsApp = (title: string, message: string, url: string) => {
    const text = encodeURIComponent(`*${title}*\n${message}\n\nAcesse: ${url || getSectionUrl()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Helper to extract YouTube video ID
  const getYouTubeId = (url?: string): string => {
    if (!url) return '';
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : '';
    } catch {
      return '';
    }
  };

  // Helper to get thumbnail safely without external mock photos
  const getThumbnail = (thumbnailUrl?: string, videoUrl?: string): string => {
    if (thumbnailUrl && thumbnailUrl.trim() && !thumbnailUrl.includes('unsplash.com')) {
      return thumbnailUrl;
    }
    if (videoUrl) {
      const ytId = getYouTubeId(videoUrl);
      if (ytId && ytId !== 'dQw4w9WgXcQ') {
        return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }
    return '';
  };

  // Find dynamic items from database or state
  const dbVideos = mediaContents.filter(m => m.type === 'video');
  const dbPdf = mediaContents.find(m => m.type === 'file' || m.url?.toLowerCase().endsWith('.pdf') || m.category?.toLowerCase().includes('pdf') || m.category?.toLowerCase().includes('estudo'));
  const dbPodcast = mediaContents.find(m => m.type === 'audio' || m.category?.toLowerCase().includes('podcast') || m.url?.includes('spotify'));

  // 1. Two Videos (Priority: weeklyData -> dbVideos -> clean defaults)
  const video1: WeeklyVideoItem = weeklyData?.video1 || (dbVideos[0] ? {
    id: dbVideos[0].id,
    title: dbVideos[0].title || 'Culto de Celebração',
    author_name: dbVideos[0].author_name || 'Pastoral Mevam Itapema',
    thumbnail_url: dbVideos[0].thumbnail_url || '',
    url: dbVideos[0].url || '',
    category: dbVideos[0].category || 'Mensagem de Domingo'
  } : {
    id: 'vid-1',
    title: 'Culto de Celebração',
    author_name: 'Pastoral Mevam Itapema',
    thumbnail_url: '',
    url: '',
    category: 'Mensagem de Domingo'
  });

  const video2: WeeklyVideoItem = weeklyData?.video2 || (dbVideos[1] ? {
    id: dbVideos[1].id,
    title: dbVideos[1].title || 'Estudo Bíblico Semanal',
    author_name: dbVideos[1].author_name || 'Estudo Pastoral Semanal',
    thumbnail_url: dbVideos[1].thumbnail_url || '',
    url: dbVideos[1].url || '',
    category: dbVideos[1].category || 'Estudo Bíblico'
  } : {
    id: 'vid-2',
    title: 'Estudo Bíblico Semanal',
    author_name: 'Estudo Pastoral Semanal',
    thumbnail_url: '',
    url: '',
    category: 'Estudo Bíblico'
  });

  // 2. PDF Document
  const pdfItem = {
    title: weeklyData?.pdf?.title || dbPdf?.title || 'Guia Semanal de Célula em PDF',
    subtitle: weeklyData?.pdf?.subtitle || dbPdf?.description || 'Material de estudo bíblico e edificação semanal disponível em formato PDF',
    author: weeklyData?.pdf?.author_name || dbPdf?.author_name || 'Corpo Pastoral Mevam Itapema',
    date: 'Semana Vigente',
    url: weeklyData?.pdf?.url || dbPdf?.url || '',
    size: weeklyData?.pdf?.size || '',
    pages: weeklyData?.pdf?.pages || ''
  };

  // 3. Spotify Link
  const spotifyUrl = weeklyData?.spotify?.url || (dbPodcast?.url?.includes('spotify') ? dbPodcast.url : 'https://open.spotify.com');
  const spotifyTitle = weeklyData?.spotify?.title || dbPodcast?.title || 'Podcast Mevam Itapema Sertão';
  const spotifyCategory = weeklyData?.spotify?.category || dbPodcast?.category || 'Mensagens & Devocionais Semanais';

  // Handle PDF Download / Direct Open
  const handleDownloadPdf = () => {
    setDownloadingPdf(true);
    if (pdfItem.url && (pdfItem.url.startsWith('http') || pdfItem.url.startsWith('blob:') || pdfItem.url.startsWith('data:'))) {
      if (pdfItem.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = pdfItem.url;
        link.download = `${pdfItem.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(pdfItem.url, '_blank');
      }
      setDownloadingPdf(false);
    } else {
      // Direct notification or open viewer
      setIsPdfModalOpen(true);
      setDownloadingPdf(false);
    }
  };

  return (
    <section id="assista" className="py-20 md:py-28 bg-stone-900 text-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        {/* Section Header with Badge and WhatsApp Share Shortcut */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="inline-flex items-center space-x-2 bg-primary/20 text-primary-light px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-primary/30">
              <Sparkles size={14} className="text-primary" />
              <span>Edificação & Estudos da Semana</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Repositório <span className="text-primary">Semanal</span>
            </h2>
            <p className="text-stone-400 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
              Acesse as ministrações em vídeo, o material de estudo bíblico para células em PDF e o nosso podcast oficial no Spotify.
            </p>
          </div>

          {/* Quick WhatsApp Share Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={shareSectionOnWhatsApp}
              id="btn-share-whatsapp-section"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-bold px-5 py-3 rounded-2xl flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98]"
              title="Compartilhar Repositório no WhatsApp"
            >
              <Share2 size={18} className="text-stone-950" />
              <span>Compartilhar no WhatsApp</span>
            </button>

            <button
              onClick={copySectionLink}
              id="btn-copy-section-link"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-xs md:text-sm transition-all border border-white/10"
              title="Copiar Link da Seção"
            >
              {copiedLink ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>

        {/* 1. SEÇÃO DOS 2 VÍDEOS DA SEMANA */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary">
                <Play size={20} className="fill-primary" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white">Vídeos da Semana</h3>
                <p className="text-xs text-stone-400">Ministrações e mensagens para o seu crescimento</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-stone-300">
              2 Ministrações
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card Vídeo 1 */}
            {(() => {
              const thumb1 = getThumbnail(video1.thumbnail_url, video1.url);
              const hasUrl1 = Boolean(video1.url && video1.url.trim());
              return (
                <div 
                  className="group bg-stone-950/60 border border-white/10 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div 
                      className={`relative aspect-video overflow-hidden ${hasUrl1 ? 'cursor-pointer' : ''} bg-stone-950 flex items-center justify-center`}
                      onClick={() => {
                        if (hasUrl1) {
                          setSelectedVideo({ title: video1.title, url: video1.url, author: video1.author_name });
                        }
                      }}
                    >
                      {thumb1 ? (
                        <img 
                          src={thumb1} 
                          alt={video1.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Play size={24} className="text-primary fill-primary/30 translate-x-0.5" />
                          </div>
                          <span className="text-xs text-stone-400 font-bold max-w-xs truncate">{video1.author_name || 'Ministração em Vídeo'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent pointer-events-none" />
                      
                      {/* Play button overlay */}
                      {hasUrl1 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-16 h-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                            <Play size={26} className="fill-white translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      <span className="absolute top-4 left-4 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                        {video1.category || 'Ministração Principal'}
                      </span>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
                        <User size={13} className="text-primary" />
                        <span>{video1.author_name}</span>
                      </div>
                      <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {video1.title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex items-center justify-between border-t border-white/5 mt-4">
                    <button
                      onClick={() => {
                        if (hasUrl1) {
                          setSelectedVideo({ title: video1.title, url: video1.url, author: video1.author_name });
                        }
                      }}
                      disabled={!hasUrl1}
                      className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${hasUrl1 ? 'text-primary hover:text-primary-light' : 'text-stone-500 cursor-default'}`}
                    >
                      <Play size={14} className={hasUrl1 ? 'fill-current' : ''} />
                      <span>{hasUrl1 ? 'Assistir Agora' : 'Disponível em Breve'}</span>
                    </button>
                    {hasUrl1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareItemOnWhatsApp(video1.title, `Assista à ministração: ${video1.title}`, video1.url);
                        }}
                        className="text-stone-400 hover:text-primary bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all"
                        title="Compartilhar no WhatsApp"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Card Vídeo 2 */}
            {(() => {
              const thumb2 = getThumbnail(video2.thumbnail_url, video2.url);
              const hasUrl2 = Boolean(video2.url && video2.url.trim());
              return (
                <div 
                  className="group bg-stone-950/60 border border-white/10 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div 
                      className={`relative aspect-video overflow-hidden ${hasUrl2 ? 'cursor-pointer' : ''} bg-stone-950 flex items-center justify-center`}
                      onClick={() => {
                        if (hasUrl2) {
                          setSelectedVideo({ title: video2.title, url: video2.url, author: video2.author_name });
                        }
                      }}
                    >
                      {thumb2 ? (
                        <img 
                          src={thumb2} 
                          alt={video2.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Play size={24} className="text-amber-400 fill-amber-400/30 translate-x-0.5" />
                          </div>
                          <span className="text-xs text-stone-400 font-bold max-w-xs truncate">{video2.author_name || 'Estudo em Vídeo'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent pointer-events-none" />
                      
                      {/* Play button overlay */}
                      {hasUrl2 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-16 h-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                            <Play size={26} className="fill-white translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      <span className="absolute top-4 left-4 bg-amber-500/90 backdrop-blur-md text-stone-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                        {video2.category || 'Estudo & Reflexão'}
                      </span>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
                        <User size={13} className="text-amber-400" />
                        <span>{video2.author_name}</span>
                      </div>
                      <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {video2.title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex items-center justify-between border-t border-white/5 mt-4">
                    <button
                      onClick={() => {
                        if (hasUrl2) {
                          setSelectedVideo({ title: video2.title, url: video2.url, author: video2.author_name });
                        }
                      }}
                      disabled={!hasUrl2}
                      className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${hasUrl2 ? 'text-primary hover:text-primary-light' : 'text-stone-500 cursor-default'}`}
                    >
                      <Play size={14} className={hasUrl2 ? 'fill-current' : ''} />
                      <span>{hasUrl2 ? 'Assistir Agora' : 'Disponível em Breve'}</span>
                    </button>
                    {hasUrl2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareItemOnWhatsApp(video2.title, `Assista ao estudo: ${video2.title}`, video2.url);
                        }}
                        className="text-stone-400 hover:text-primary bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all"
                        title="Compartilhar no WhatsApp"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. LINHA COM GUIA EM PDF & SPOTIFY PODCAST */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Card PDF Documento / Guia da Semana (7 cols) */}
          <div className="lg:col-span-7 bg-stone-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      Material Semanal em PDF
                    </span>
                    <h3 className="text-xl font-bold text-white">Guia de Estudo Bíblico & Célula</h3>
                  </div>
                </div>

                <button
                  onClick={() => shareItemOnWhatsApp(pdfItem.title, `Confira o Guia de Célula e Estudo Bíblico da semana:`, pdfItem.url || getSectionUrl())}
                  className="text-stone-400 hover:text-amber-400 bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all"
                  title="Compartilhar Guia no WhatsApp"
                >
                  <Share2 size={16} />
                </button>
              </div>

              <div className="bg-stone-900/90 border border-white/10 rounded-2xl p-5 mb-6">
                <h4 className="font-bold text-white text-base mb-1.5">
                  {pdfItem.title}
                </h4>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  {pdfItem.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-400 pt-3 border-t border-white/10">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-amber-400" />
                    {pdfItem.author}
                  </span>
                  {pdfItem.pages ? (
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} className="text-amber-400" />
                      {pdfItem.pages}
                    </span>
                  ) : null}
                  {pdfItem.size ? (
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-amber-400" />
                      {pdfItem.size}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-400" />
                    {pdfItem.date}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do PDF: Visualizar e Baixar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  if (pdfItem.url && (pdfItem.url.startsWith('http') || pdfItem.url.startsWith('blob:') || pdfItem.url.startsWith('data:'))) {
                    if (pdfItem.url.startsWith('http') && !pdfItem.url.toLowerCase().endsWith('.pdf')) {
                      window.open(pdfItem.url, '_blank');
                    } else {
                      setIsPdfModalOpen(true);
                    }
                  } else {
                    setIsPdfModalOpen(true);
                  }
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 px-5 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-white/20"
              >
                <Eye size={16} />
                <span>Visualizar Documento</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3.5 px-5 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98]"
              >
                <Download size={16} />
                <span>{downloadingPdf ? 'Baixando...' : 'Baixar Documento'}</span>
              </button>
            </div>
          </div>

          {/* Card Spotify Podcast (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#121212] to-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#1DB954]/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center flex-shrink-0">
                    <Radio size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest">
                      Áudio & Podcast
                    </span>
                    <h3 className="text-xl font-bold text-white">Spotify Mevam</h3>
                  </div>
                </div>

                <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 px-2.5 py-1 rounded-full text-[#1DB954] text-[10px] font-bold">
                  Oficial
                </div>
              </div>

              <div className="p-5 bg-black/40 rounded-2xl border border-white/5 mb-6">
                <div className="flex items-center gap-2 text-xs text-[#1DB954] font-bold mb-1">
                  <Music2 size={14} />
                  <span>{spotifyCategory}</span>
                </div>
                <h4 className="text-lg font-bold text-white leading-snug mb-2">
                  {spotifyTitle}
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Ouça a palavra de Deus no trânsito, no trabalho ou em seus momentos de devocional diário.
                </p>
              </div>
            </div>

            {/* Ações do Spotify */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1DB954]/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play size={16} className="fill-black" />
                <span>Ouvir no Spotify</span>
                <ExternalLink size={14} />
              </a>

              <button
                onClick={() => shareItemOnWhatsApp(spotifyTitle, `Ouça nossas mensagens e podcasts no Spotify:`, spotifyUrl)}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all flex items-center justify-center"
                title="Compartilhar Podcast"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL DE REPRODUÇÃO DO VÍDEO */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-white/20 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-stone-950">
                <div className="truncate pr-4">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Ministração</span>
                  <h3 className="text-base font-bold text-white truncate">{selectedVideo.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Player */}
              <div className="aspect-video w-full bg-black flex items-center justify-center">
                {selectedVideo.url && (selectedVideo.url.includes('youtube') || selectedVideo.url.includes('youtu.be')) ? (
                  <iframe
                    src={getEmbedUrl(selectedVideo.url)}
                    title={selectedVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-stone-950">
                    <Play size={48} className="text-primary mb-4 animate-pulse" />
                    <p className="text-stone-300 font-bold mb-2">{selectedVideo.title}</p>
                    <p className="text-stone-500 text-xs mb-6">Reproduzindo via link externo da ministração</p>
                    <a
                      href={selectedVideo.url || 'https://youtube.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-primary/30"
                    >
                      <span>Abrir no YouTube</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-stone-950 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-stone-400">{selectedVideo.author}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shareItemOnWhatsApp(selectedVideo.title, 'Assista a esta ministração:', selectedVideo.url)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Share2 size={14} />
                    <span>Compartilhar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE VISUALIZAÇÃO DO PDF */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-stone-900 border border-white/20 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-stone-950">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <FileText size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Leitor de PDF</span>
                    <h3 className="text-lg font-bold text-white leading-tight">{pdfItem.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content / Reader */}
              <div className="p-6 sm:p-8 bg-stone-900 max-h-[70vh] overflow-y-auto space-y-6 text-stone-200">
                {pdfItem.url && (pdfItem.url.toLowerCase().endsWith('.pdf') || pdfItem.url.startsWith('data:application/pdf') || pdfItem.url.startsWith('blob:')) ? (
                  <iframe 
                    src={pdfItem.url} 
                    title={pdfItem.title}
                    className="w-full h-[55vh] rounded-2xl border border-white/10 bg-white"
                  />
                ) : pdfItem.url ? (
                  <div className="bg-stone-950 border border-white/10 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">{pdfItem.title}</h4>
                      <p className="text-xs text-stone-400 max-w-md mx-auto">{pdfItem.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-xs text-stone-400 pt-2 border-t border-white/10 max-w-md mx-auto">
                      <span><strong>Autor:</strong> {pdfItem.author}</span>
                      <span><strong>Páginas:</strong> {pdfItem.pages}</span>
                      <span><strong>Tamanho:</strong> {pdfItem.size}</span>
                    </div>
                    <div className="pt-4">
                      <a
                        href={pdfItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
                      >
                        <ExternalLink size={16} />
                        <span>Abrir Documento Completo</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-950 border border-white/10 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">{pdfItem.title}</h4>
                      <p className="text-xs text-stone-400 max-w-md mx-auto">{pdfItem.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-xs text-stone-400 pt-2 border-t border-white/10 max-w-md mx-auto">
                      <span><strong>Autor:</strong> {pdfItem.author}</span>
                      <span><strong>Páginas:</strong> {pdfItem.pages}</span>
                      <span><strong>Tamanho:</strong> {pdfItem.size}</span>
                    </div>
                    <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl max-w-md mx-auto">
                      O arquivo deste documento pode ser baixado diretamente pelo botão abaixo ou visualizado quando o link/arquivo PDF for carregado.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-stone-950 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Download size={16} />
                  <span>{downloadingPdf ? 'Baixando...' : 'Baixar Documento (PDF)'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
