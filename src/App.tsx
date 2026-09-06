import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { sanitizeInputObject, validateTextInput } from './lib/security';
import { PrivacyPolicyModal } from './components/PrivacyPolicy';
import { CookieConsent } from './components/CookieConsent';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { sanitizePII, anonymizeIP } from './lib/privacy-utils';
import { CantinaProduct, CantinaVoucher, CantinaPublic, CantinaAdmin } from './components/CantinaComponents';
import { WeeklyRepository, WeeklyRepositoryData } from './components/WeeklyRepository';
import { WeeklyRepositoryAdmin } from './components/WeeklyRepositoryAdmin';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EventListsModal } from './components/EventListsModal';
import { FolderArchive } from 'lucide-react';
import { 
  Menu, 
  X, 
  MapPin, 
  Clock, 
  User,
  Users, 
  Heart, 
  Play, 
  Radio, 
  Pause,
  ChevronLeft,
  ArrowLeft,
  ChevronRight, 
  MessageCircle, 
  HandHeart,
  BookOpen,
  Mic2,
  Calendar,
  Eye,
  EyeOff,
  Check,
  Database,
  ShieldCheck,
  FileText,
  Plus,
  Archive,
  Trash2,
  Edit2,
  UserPlus,
  UserMinus,
  LogOut,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Share2,
  Layout,
  Home,
  Video,
  Image,
  Type,
  Edit3,
  Search,
  Copy,
  Instagram,
  Youtube,
  Music2,
  Upload,
  Download,
  CheckCircle,
  CheckCircle2,
  Scan,
  RotateCcw,
  CreditCard,
  Map,
  ClipboardList,
  Shirt,
  RefreshCw,
  Lock,
  Camera,
  Banknote,
  Compass,
  Trophy,
  Target,
  PieChart,
  Info,
  ListTodo,
  Smile,
  Shield,
  HelpCircle,
  Coffee,
  ShoppingBag,
  Utensils,
  Bell,
  BellRing,
  Volume2,
  Sparkles,
  HeartHandshake,
  UtensilsCrossed,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

const QRScannerComponent = ({ onScan, onClose }: { onScan: (data: string) => void, onClose: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [isCamerReady, setIsCameraReady] = useState(false);

  const startScanner = async () => {
    setError(null);
    const html5QrCode = new Html5Qrcode("reader");
    const qrCodeSuccessCallback = (decodedText: string) => {
      onScan(decodedText);
      html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
    };
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, () => {});
      setIsCameraReady(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
        setError("Permissão para câmera negada. Por favor, autorize o acesso à câmera nas configurações do seu navegador ou clique no cadeado ao lado da URL.");
      } else {
        setError("Não foi possível iniciar a câmera: " + err.message);
      }
    }

    return html5QrCode;
  };

  React.useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    
    startScanner().then(s => {
      scanner = s;
    });

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => console.error("Error stopping scanner on unmount:", err));
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-6 bg-red-50 text-red-700 rounded-3xl text-center border border-red-100 mb-4">
          <Camera size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-bold text-sm mb-2">Erro de Permissão</p>
          <p className="text-xs leading-relaxed mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold uppercase transition-all hover:bg-red-200"
            >
              Recarregar Página
            </button>
            <p className="text-[10px] text-stone-500 italic">
              Dica: Tente abrir o sistema em uma nova aba se o problema persistir.
            </p>
          </div>
        </div>
      )}
      
      <div 
        id="reader" 
        className={`overflow-hidden rounded-3xl border-4 border-stone-100 shadow-inner aspect-square bg-black transition-opacity duration-500 ${isCamerReady ? 'opacity-100' : 'opacity-0'}`}
      ></div>
      
      {!isCamerReady && !error && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-stone-500 font-medium tracking-wide">Iniciando câmera...</p>
        </div>
      )}

      <button 
        onClick={onClose}
        className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
      >
        Fechar Scanner
      </button>
    </div>
  );
};
import { 
  VOCATIONAL_CATEGORIES, 
  VOCATIONAL_QUESTIONS, 
  getInterpretation 
} from './vocationalData';

const VocationalTest = ({ 
  userId, 
  results, 
  isTakingTest, 
  setIsTakingTest, 
  onComplete 
}: { 
  userId: string, 
  results: any[], 
  isTakingTest: boolean,
  setIsTakingTest: (v: boolean) => void,
  onComplete: () => void 
}) => {
  const [currentStep, setCurrentStep] = useState(0); // 0: intro, 1..14: categories, 15: results
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const categories = VOCATIONAL_CATEGORIES;
  const questions = VOCATIONAL_QUESTIONS;

  const handleAnswer = (questionId: number, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: score }));
  };

  const calculateScores = () => {
    const scores: Record<string, number> = {};
    categories.forEach(cat => {
      const catQuestions = questions.filter(q => q.category === cat.id);
      const sum = catQuestions.reduce((acc, q) => acc + (responses[q.id] || 0), 0);
      scores[cat.id] = sum;
    });
    return scores;
  };

  const downloadResults = async () => {
    if (resultsRef.current) {
      try {
        const dataUrl = await toPng(resultsRef.current as HTMLElement, { 
          cacheBust: true, 
          backgroundColor: '#0c0a09', // stone-950
          style: {
            borderRadius: '0px'
          }
        });
        const link = document.createElement('a');
        link.download = `meu-perfil-vocacional-mevam.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error generating image:', err);
        alert('Erro ao gerar imagem para download.');
      }
    }
  };

  const shareResults = () => {
    const scores = calculateScores();
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    
    const title = "*MEU PERFIL VOCACIONAL - MEVAM* ✝️";
    const text = `Descobri minha inclinação ministerial no corpo de Cristo! 🕊️\n\nMeus principais destaques:\n1️⃣ *${categories.find(c => c.id === sorted[0][0])?.name}* (${sorted[0][1]} pts)\n2️⃣ *${categories.find(c => c.id === sorted[1][0])?.name}* (${sorted[1][1]} pts)\n3️⃣ *${categories.find(c => c.id === sorted[2][0])?.name}* (${sorted[2][1]} pts)\n\n"Pois somos feitura dele, criados em Cristo Jesus para as boas obras..." (Efésios 2:10)`;
    
    shareOnWhatsApp(title, text);
  };

  const saveResults = async () => {
    setLoading(true);
    const scores = calculateScores();
    const topAreas = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id);

    try {
      const { error } = await supabase
        .from('vocational_tests')
        .insert([{
          user_id: userId,
          responses,
          scores,
          top_areas: topAreas
        }]);

      if (error) throw error;
      onComplete();
      setCurrentStep(15); // Show results
    } catch (err) {
      console.error('Error saving vocational test:', err);
      alert('Erro ao salvar os resultados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setResponses({});
    setCurrentStep(0);
    setIsTakingTest(false);
  };

  if (!isTakingTest && results.length > 0 && currentStep === 0) {
    const latest = results[0];
    return (
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Compass size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">Seu Perfil Vocacional</h3>
              <p className="text-sm text-stone-500">Última atualização em {new Date(latest.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {latest.top_areas.map((areaId: string, idx: number) => {
              const cat = categories.find(c => c.id === areaId);
              const score = latest.scores[areaId];
              const interp = getInterpretation(score);
              return (
                <div key={areaId} className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Trophy size={60} />
                  </div>
                  <div className="text-xs font-bold text-primary mb-1 uppercase tracking-widest flex items-center">
                    {idx === 0 && <Trophy size={14} className="mr-1.5" />}
                    {idx + 1}º Destaque
                  </div>
                  <h4 className="text-lg font-bold text-stone-900 mb-2">{cat?.name}</h4>
                  <div className={`text-xs p-2 rounded-lg inline-block font-bold ${interp.bg} ${interp.color}`}>
                    {score} pts • {interp.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-stone-900 flex items-center">
              <PieChart size={18} className="mr-2 text-stone-400" />
              Análise Completa por Áreas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(latest.scores).map(([areaId, score]: [any, any]) => {
                const cat = categories.find(c => c.id === areaId);
                const percentage = (score / 25) * 100;
                return (
                  <div key={areaId} className="p-4 bg-white border border-stone-100 rounded-xl flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm font-bold text-stone-700">{cat?.name}</span>
                        <span className="text-xs font-mono text-stone-400">{score}/25</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`h-full ${score >= 16 ? 'bg-primary' : 'bg-stone-300'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-stone-100 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setIsTakingTest(true)}
              className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center space-x-2"
            >
              <RefreshCw size={20} />
              <span>Refazer Teste</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-stone-100 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto mb-8">
            <Compass size={40} />
          </div>
          <h2 className="text-3xl font-black text-stone-900 mb-6 tracking-tight">Teste Vocacional Cristão</h2>
          <div className="space-y-6 text-stone-600 text-left mb-10 leading-relaxed">
            <p className="font-medium text-lg text-stone-800">
              Esta pesquisa foi desenvolvida para ajudar cristãos a identificarem tendências ministeriais e dons predominantes.
            </p>
            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
              <h4 className="font-bold text-stone-900 mb-4 flex items-center">
                <Info size={18} className="mr-2 text-stone-400" />
                Como funciona
              </h4>
              <p className="text-sm mb-4">Leia cada afirmação e marque uma nota de 1 a 5:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { n: 1, v: 'Nunca' },
                  { n: 2, v: 'Pouco' },
                  { n: 3, v: 'Às vezes' },
                  { n: 4, v: 'Muito' },
                  { n: 5, v: 'Totalmente' },
                ].map(item => (
                  <div key={item.n} className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs flex items-center space-x-2">
                    <span className="font-black text-primary">{item.n}</span>
                    <span className="text-stone-500 font-medium">{item.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => { setIsTakingTest(true); setCurrentStep(1); }}
            className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3"
          >
            <span>Iniciar Descoberta</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Final Results Screen after taking the test
  if (currentStep === 15) {
    const latestScores = calculateScores();
    const sorted = Object.entries(latestScores).sort(([, a], [, b]) => b - a);
    
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Capture Area for Certificate */}
        <div ref={resultsRef} className="bg-stone-950 text-white p-10 md:p-16 rounded-[48px] relative overflow-hidden shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Target size={200} />
          </div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                <Compass size={48} className="text-primary" />
              </div>
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase italic">Identidade Ministerial</h2>
            <p className="text-stone-400 text-lg max-w-xl mx-auto font-medium mb-12">
              MEVAM Itapema Sertão • Edificação & Propósito
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {sorted.slice(0, 3).map(([areaId, score], idx) => {
                const cat = categories.find(c => c.id === areaId);
                return (
                  <div key={areaId} className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                    <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{idx + 1}º Destaque</div>
                    <h3 className="text-xl font-bold mb-1">{cat?.name}</h3>
                    <div className="text-2xl font-black text-white/90">{score}<span className="text-xs text-white/30 ml-0.5">/25</span></div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-center">
              <div className="px-6 py-2 bg-primary/20 border border-primary/30 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={shareResults}
            className="flex-1 bg-[#25D366] text-white py-5 rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center space-x-3"
          >
            <MessageCircle size={24} />
            <span>Compartilhar WhatsApp</span>
          </button>
          <button 
            onClick={downloadResults}
            className="flex-1 bg-stone-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center space-x-3"
          >
            <Download size={24} />
            <span>Salvar Certificado</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sorted.slice(0, 3).map(([areaId, score], idx) => {
            const cat = categories.find(c => c.id === areaId);
            return (
              <motion.div 
                key={areaId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-8 rounded-[40px] border shadow-sm relative overflow-hidden bg-white border-stone-100`}
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <span className="font-black text-xl">{idx + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-3 tracking-tight">{cat?.name}</h3>
                <p className="text-stone-500 text-sm mb-6 leading-relaxed font-medium">
                  {cat?.description}
                </p>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-6">
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Ministérios Sugeridos</h4>
                  <div className="flex flex-wrap gap-2">
                    {cat?.ministries.map(m => (
                      <span key={m} className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-stone-600 border border-stone-100">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-black text-primary">
                    {score}
                    <span className="text-xs text-stone-300 font-mono ml-1">/25</span>
                  </div>
                  <div className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">Pontuação Alta</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[40px] border border-stone-100 shadow-sm text-center">
          <p className="text-stone-500 mb-8 max-w-2xl mx-auto font-medium">
            Lembre-se: Este resultado é uma ferramenta de orientação. Recomendamos que compartilhe estes destaques com seu líder de célula ou pastor para discernirem juntos os próximos passos do seu discipulado.
          </p>
          <button 
            onClick={resetTest}
            className="px-12 py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-stone-900/20"
          >
            Voltar para Área do Membro
          </button>
        </div>
      </div>
    );
  }

  // Active Test Screen
  const currentCategory = categories[currentStep - 1];
  const currentQuestions = questions.filter(q => q.category === currentCategory.id);
  const progress = (currentStep / categories.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 text-center">
        <div className="flex justify-between items-end mb-4 px-2">
          <div className="text-left">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">{currentCategory.name}</h2>
            <p className="text-stone-400 text-sm font-medium">Bloco {currentStep} de {categories.length}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-50 shadow-inner">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] shadow-primary/20"
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 mb-12">
        {currentQuestions.map((q, idx) => (
          <motion.div 
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm"
          >
            <p className="text-lg font-bold text-stone-800 mb-8 leading-tight">
              {q.text}
            </p>
            <div className="flex justify-between items-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  onClick={() => handleAnswer(q.id, score)}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl font-black text-xl transition-all ${
                    responses[q.id] === score 
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                    : 'bg-white text-stone-400 hover:text-stone-600 hover:bg-white shadow-sm'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-3 px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <span>Nunca</span>
              <span>Sempre</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex space-x-4 bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm sticky bottom-8">
        {currentStep > 1 && (
          <button 
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex-1 py-5 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center space-x-2"
          >
            <span>Anterior</span>
          </button>
        )}
        <button 
          disabled={currentQuestions.some(q => !responses[q.id]) || loading}
          onClick={() => {
            if (currentStep === categories.length) {
              saveResults();
            } else {
              setCurrentStep(prev => prev + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={`flex-[2] py-5 text-white rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center space-x-3 ${
            currentQuestions.some(q => !responses[q.id]) 
              ? 'bg-stone-200 cursor-not-allowed' 
              : 'bg-stone-900 hover:bg-black shadow-stone-900/20'
          }`}
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{currentStep === categories.length ? 'Finalizar e Ver Resultados' : 'Pular para Próximo Bloco'}</span>
              {!loading && <ChevronRight size={20} />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// --- Types ---

const shareOnWhatsApp = (title: string, text: string, url?: string) => {
  const baseUrl = window.location.origin;
  const shareUrl = url && url !== '#' ? url : baseUrl;
  const message = encodeURIComponent(`${title}\n\n${text}\n\nConfira em: ${shareUrl}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
};

interface CellGroup {
  id: string;
  name: string;
  leader: string;
  day: string;
  time: string;
  location: string;
  type: string;
}

const DEFAULT_CELL_GROUPS: CellGroup[] = [
  {
    id: 'c1',
    name: 'Célula Morretes',
    leader: 'Pr. Marcos & Sarah',
    day: 'Quarta-feira',
    time: '20:00',
    location: 'Rua 412, nº 350 - Morretes',
    type: 'Família'
  },
  {
    id: 'c2',
    name: 'Célula Meia Praia',
    leader: 'Lucas & Mariana',
    day: 'Quinta-feira',
    time: '20:00',
    location: 'Rua 240, nº 120 - Meia Praia',
    type: 'Jovens'
  },
  {
    id: 'c3',
    name: 'Célula Centro',
    leader: 'Diác. Paulo & Rute',
    day: 'Terça-feira',
    time: '19:30',
    location: 'Av. Nereu Ramos, nº 800 - Centro',
    type: 'Casais'
  },
  {
    id: 'c4',
    name: 'Célula Alto São Bento',
    leader: 'Gabriel & Ana',
    day: 'Sexta-feira',
    time: '20:00',
    location: 'Rua 600, nº 45 - São Bento',
    type: 'Geral'
  }
];

interface Announcement {
  id: string;
  title: string;
  date: string;
  description: string;
  category?: string;
  created_at?: string;
}

export interface ChurchService {
  id: string;
  title: string;
  day_of_week: string;
  day_short: string;
  time: string;
  description: string;
  badge_text?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
}

export const DEFAULT_CHURCH_SERVICES: ChurchService[] = [
  {
    id: 'default-culto-1',
    title: 'Culto da Família',
    day_of_week: 'Domingo',
    day_short: 'DOM',
    time: '19h00',
    description: 'Celebração com toda a igreja, louvor congregacional, mensagem inspiradora e salinhas para crianças no MEVAM Kids.',
    badge_text: 'Presencial + MEVAM Kids',
    color: 'amber',
    order_index: 1,
    is_active: true
  },
  {
    id: 'default-culto-2',
    title: 'Células nos Lares',
    day_of_week: 'Terça-feira',
    day_short: 'TER',
    time: '20h00',
    description: 'Encontros de comunhão, amizade e estudo da Palavra de Deus em diversos bairros e residências.',
    badge_text: 'Pequenos Grupos',
    color: 'stone',
    order_index: 2,
    is_active: true
  },
  {
    id: 'default-culto-3',
    title: 'Culto de Oração & Ensino',
    day_of_week: 'Quinta-feira',
    day_short: 'QUI',
    time: '20h00',
    description: 'Momento precioso de intercessão coletiva, clamor pelas famílias e edificação doutrinária.',
    badge_text: 'Doutrina & Clamor',
    color: 'stone',
    order_index: 3,
    is_active: true
  }
];

const NOTIFICATION_SOUND_URL = "https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/sign/banner/e-pra-glorificar-de-pe-igreja.mp3?token=eyJraWQiOiI3MTg0NDIzOS05ZGQ3LTQ3NzQtOTA2Ny1mZmE3MjVmM2QzOGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJiYW5uZXIvZS1wcmEtZ2xvcmlmaWNhci1kZS1wZS1pZ3JlamEubXAzIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4ODQzOTcyOSwiZXhwIjoyMTAzNzk5NzI5fQ.JYrwXYCQSn8CeryWbkmZ2-zzrWOuBxwSekU0VrlM9HI";

let notificationAudioInstance: HTMLAudioElement | null = null;

const playNotificationSound = () => {
  try {
    if (!notificationAudioInstance) {
      notificationAudioInstance = new Audio(NOTIFICATION_SOUND_URL);
    } else {
      notificationAudioInstance.currentTime = 0;
    }
    notificationAudioInstance.volume = 0.9;
    const playPromise = notificationAudioInstance.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.info('Notificação sonora aguardando interação prévia do usuário:', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('Erro ao tocar som de notificação:', err);
  }
};

interface Ministry {
  id: string;
  name: string;
  description?: string;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  whatsapp?: string;
  cpf?: string;
  birth_date?: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  cell_id?: string;
  is_archived?: boolean;
}

interface UserMinistry {
  user_id: string;
  ministry_id: string;
  is_leader?: boolean;
}

interface MinistryScale {
  id: string;
  ministry_id: string;
  user_id: string;
  date: string;
  role: string;
  description: string;
  ministry_name?: string;
  user_name?: string;
}

interface MinistryNotice {
  id: string;
  ministry_id: string;
  title: string;
  content: string;
  date: string;
  ministry_name?: string;
}

interface Visitor {
  id: string;
  full_name: string;
  whatsapp: string;
  city: string;
  neighborhood: string;
  wants_to_join_group: boolean;
  created_at: string;
}

interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface BillPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid';
}

interface MediaContent {
  id: string;
  title: string;
  category: string;
  type: 'video' | 'photo' | 'audio' | 'file' | 'text';
  url: string;
  thumbnail_url?: string;
  content_text?: string;
  status: 'pending' | 'published';
  author_id?: string;
  author_name?: string;
  created_at: string;
}

interface PlannedVisit {
  id: string;
  full_name: string;
  visit_date: string;
  whatsapp: string;
  companion_status: 'alone' | 'accompanied';
  church_status: 'other_church' | 'seeking_community';
  status: 'pending' | 'contacted' | 'completed';
  created_at: string;
}

interface PrayerRequest {
  id: string;
  name: string;
  whatsapp: string;
  request: string;
  is_public: boolean;
  status: 'pending' | 'intercession' | 'completed';
  created_at: string;
}

interface MinistryReport {
  id: string;
  ministry_id: string;
  month: string;
  events_held: string;
  avg_participants: string;
  resources_used: string;
  integration: string;
  positive_points: string;
  improvements: string;
  created_at: string;
  ministry_name?: string;
}

interface MercadoSolidarioRegistration {
  id: string;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  civil_status: string;
  phone: string;
  email?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  cep: string;
  reference_point?: string;
  housing_type: string;
  rent_value?: number;
  family_members: any[];
  total_family_income: number;
  income_origin: string;
  income_origin_details?: string;
  vulnerability_factors: string[];
  vulnerability_other?: string;
  expense_rent?: number;
  expense_water?: number;
  expense_electricity?: number;
  expense_food?: number;
  expense_meds?: number;
  expense_others?: number;
  on_cadunico: boolean;
  receives_benefit: boolean;
  benefit_details?: string;
  lacked_food_last_30d: boolean;
  meals_per_day: number;
  signature_url?: string;
  document_photo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Congress {
  id: string;
  title: string;
  banner_url: string;
  date: string;
  schedule: { time: string; activity: string }[];
  location_details: string;
  how_to_get_there: string;
  payment_info: string;
  image_terms: string;
  is_active: boolean;
  price: number;
  about_text: string;
  organizer_phone?: string;
  has_t_shirts?: boolean;
  is_free?: boolean;
  created_at: string;
}

interface CongressWorkshop {
  id: string;
  congress_id: string;
  title: string;
  description: string;
  capacity: number;
}

interface CongressRegistration {
  id: string;
  user_id: string;
  congress_id: string;
  personal_data: {
    full_name: string;
    email: string;
    whatsapp: string;
    birth_date: string;
    cpf: string;
  };
  address: {
    cep: string;
    address: string;
    number: string;
    neighborhood: string;
    city: string;
  };
  t_shirt_size: string;
  selected_workshops: string[];
  image_use_accepted: boolean;
  payment_proof_url: string;
  payment_status: 'pending' | 'confirmed' | 'rejected';
  coupon_serial?: string;
  created_at: string;
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md', zIndex = 'z-[100]' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string, zIndex?: string }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2 sm:p-4`}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full ${maxWidth} bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto`}
          >
            <div className="p-6 sm:p-8">
              {title && (
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-stone-900">{title}</h3>
                  <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                    <X size={20} className="text-stone-400" />
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Auth = ({ onAuthSuccess }: { onAuthSuccess: (user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(() => localStorage.getItem('privacy_accepted') === 'true');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleDemoLogin = (role: 'admin' | 'member') => {
    const mockUser = {
      id: `demo-${role}-${Date.now()}`,
      email: role === 'admin' ? 'anderlevita@gmail.com' : 'membro@mevam.org.br',
      is_demo: true,
      user_metadata: {
        full_name: role === 'admin' ? 'Anderson (Pastor Admin)' : 'Membro de Teste Mevam'
      },
      app_metadata: {
        role: role
      }
    };
    onAuthSuccess(mockUser);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && !acceptedPrivacy) {
      setMessage({ type: 'error', text: 'Você precisa aceitar a Política de Privacidade para continuar.' });
      return;
    }

    // Persist choice in localStorage for convenience
    if (acceptedPrivacy) {
      localStorage.setItem('privacy_accepted', 'true');
    }

    setLoading(true);
    setMessage(null);
    
    // Trim inputs to prevent whitespace errors
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanFullName = fullName.trim();
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (error) throw error;
        if (data?.user) {
          onAuthSuccess(data.user);
        }
      } else {
        if (!cleanFullName) throw new Error('Por favor, informe seu nome completo.');
        
        const { data, error } = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanFullName,
              privacy_policy_accepted: true,
              privacy_policy_accepted_at: new Date().toISOString()
            }
          }
        });
        
        if (error) throw error;
        
        if (data.session && data.user) {
          onAuthSuccess(data.user);
          setMessage({ type: 'success', text: 'Cadastro realizado com sucesso! Bem-vindo.' });
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Cadastro realizado! IMPORTANTE: Verifique seu e-mail para confirmar sua conta. Após confirmar, você poderá fazer login.' 
          });
          // Clear password for security but keep email
          setPassword('');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      let errorMessage = error.message || 'Erro na operação. Verifique seus dados.';
      const lowerError = errorMessage.toLowerCase();
      
      if (lowerError.includes('invalid login credentials') || lowerError.includes('invalid credentials')) {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (lowerError.includes('email not confirmed')) {
        errorMessage = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para ativar sua conta.';
      } else if (lowerError.includes('password should be at least 6 characters')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (lowerError.includes('user already registered') || (error.status === 400 && !isLogin && lowerError.includes('already'))) {
        errorMessage = 'Este e-mail já está cadastrado. Se você já tem uma conta, use o formulário de login.';
      } else if (lowerError.includes('rate limit') || error.status === 429) {
        errorMessage = 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos e tente novamente.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Por favor, informe seu e-mail para recuperar a senha.' });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail de recuperação' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <Users className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
        <p className="text-stone-500 text-sm mt-2">
          {isLogin ? 'Acesse sua área exclusiva de membro' : 'Junte-se à nossa família Mevam'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Nome Completo</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
              placeholder="Como deseja ser chamado"
              required={!isLogin}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
            placeholder="seu@email.com"
            required
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-stone-700">Senha</label>
            {isLogin && (
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-primary hover:underline font-medium"
              >
                Esqueceu a senha?
              </button>
            )}
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12" 
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-3 py-2">
          <div className="flex items-center h-5">
            <input
              id="privacy"
              name="privacy"
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => {
                const checked = e.target.checked;
                setAcceptedPrivacy(checked);
                if (checked) localStorage.setItem('privacy_accepted', 'true');
                else localStorage.removeItem('privacy_accepted');
              }}
              className="h-4 w-4 text-primary border-stone-300 rounded focus:ring-primary/20"
              required={!isLogin}
            />
          </div>
          <div className="text-xs">
            <label htmlFor="privacy" className="font-medium text-stone-600">
              Eu aceito a{' '}
              <button 
                type="button" 
                onClick={() => setShowPrivacyModal(true)}
                className="text-primary font-bold hover:underline"
              >
                Política de Privacidade
              </button>
              {' '}e o tratamento de meus dados conforme a LGPD.
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            isLogin ? 'Entrar Agora' : 'Finalizar Cadastro'
          )}
        </button>
      </form>

      {/* Botões de Acesso Rápido para Desenvolvimento/Testes */}
      <div className="mt-6 pt-6 border-t border-stone-100 bg-stone-50 rounded-2xl p-4 text-center">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center justify-center">
          <ShieldCheck size={14} className="text-primary mr-1" />
          Acesso Rápido de Testes (Sem Confirmar E-mail)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => handleDemoLogin('admin')}
            className="text-xs bg-stone-900 hover:bg-black text-white py-2.5 px-3 rounded-lg font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            Acessar como Pastor/Admin
          </button>
          <button 
            type="button"
            onClick={() => handleDemoLogin('member')}
            className="text-xs bg-stone-200 hover:bg-stone-300 text-stone-800 py-2.5 px-3 rounded-lg font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            Acessar como Membro
          </button>
        </div>
        <p className="text-[10px] text-stone-400 mt-2">
          Permite testar todas as seções (inclusive Área do Pastor) imediatamente sem precisar confirmar e-mail.
        </p>
      </div>

      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
        onAccept={() => {
          setAcceptedPrivacy(true);
          localStorage.setItem('privacy_accepted', 'true');
        }}
      />
      
      <div className="mt-8 pt-6 border-t border-stone-100 text-center">
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage(null);
          }}
          className="text-sm text-stone-500 hover:text-primary font-medium transition-colors"
        >
          {isLogin ? 'Ainda não tem conta? Cadastre-se' : 'Já possui uma conta? Faça login'}
        </button>
      </div>
    </div>
  );
};

const MemberArea = ({ 
  user,
  setCurrentUser,
  onBack,
  onAuthSuccess,
  announcements,
  setAnnouncements,
  fetchHomeContent,
  liveStream,
  setLiveStream,
  carouselEvents,
  userUnavailabilities,
  ministryUnavailabilities,
  fetchUserData,
  profiles,
  ministries,
  userMinistries,
  cellGroups,
  bibleReading,
  setBibleReading,
  kids,
  setKids,
  userRole,
  setUserRole,
  formData,
  setFormData,
  ministryNotices,
  setMinistryNotices,
  ministryScales,
  setMinistryScales,
  ministryReports,
  setMinistryReports,
  userDevotionals,
  setUserDevotionals,
  ministryMembers,
  setMinistryMembers,
  confirmModal,
  setConfirmModal,
  isAddingUnavailability,
  setIsAddingUnavailability,
  newUnavailability,
  setNewUnavailability,
  setUserMinistries,
  setUserUnavailabilities,
  weeklyRepositoryData,
  setWeeklyRepositoryData,
  loading,
  setLoading
}: { 
  user: any;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  onBack: () => void;
  onAuthSuccess?: (user: any) => void;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  fetchHomeContent: () => Promise<void>;
  liveStream: { id?: string, url: string, is_active: boolean } | null;
  setLiveStream: React.Dispatch<React.SetStateAction<{ id?: string, url: string, is_active: boolean } | null>>;
  carouselEvents: any[];
  userUnavailabilities: any[];
  setUserUnavailabilities: React.Dispatch<React.SetStateAction<any[]>>;
  ministryUnavailabilities: any[];
  fetchUserData: (user: any) => Promise<void>;
  profiles: Profile[];
  ministries: Ministry[];
  userMinistries: UserMinistry[];
  setUserMinistries: React.Dispatch<React.SetStateAction<UserMinistry[]>>;
  cellGroups: CellGroup[];
  bibleReading: number[];
  setBibleReading: React.Dispatch<React.SetStateAction<number[]>>;
  kids: any[];
  setKids: React.Dispatch<React.SetStateAction<any[]>>;
  userRole: string;
  setUserRole: React.Dispatch<React.SetStateAction<string>>;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  ministryNotices: MinistryNotice[];
  setMinistryNotices: React.Dispatch<React.SetStateAction<MinistryNotice[]>>;
  ministryScales: MinistryScale[];
  setMinistryScales: React.Dispatch<React.SetStateAction<MinistryScale[]>>;
  ministryReports: MinistryReport[];
  setMinistryReports: React.Dispatch<React.SetStateAction<MinistryReport[]>>;
  userDevotionals: MediaContent[];
  setUserDevotionals: React.Dispatch<React.SetStateAction<MediaContent[]>>;
  ministryMembers: any[];
  setMinistryMembers: React.Dispatch<React.SetStateAction<any[]>>;
  confirmModal: any;
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  isAddingUnavailability: boolean;
  setIsAddingUnavailability: React.Dispatch<React.SetStateAction<boolean>>;
  newUnavailability: any;
  setNewUnavailability: React.Dispatch<React.SetStateAction<any>>;
  weeklyRepositoryData?: WeeklyRepositoryData | null;
  setWeeklyRepositoryData?: React.Dispatch<React.SetStateAction<WeeklyRepositoryData | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [activeTab, setActiveTab] = useState('cadastro');
  const [vocationalResults, setVocationalResults] = useState<any[]>([]);
  const [isTakingTest, setIsTakingTest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ cpf?: string; cep?: string }>({});
  const [selectedMinistryForAction, setSelectedMinistryForAction] = useState<string | null>(null);
  const [isAddingScale, setIsAddingScale] = useState(false);
  const [isAddingNotice, setIsAddingNotice] = useState(false);
  const [newScale, setNewScale] = useState({ 
    date: '', 
    description: '',
    assignments: [{ user_id: '', role: '' }]
  });
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });
  const [selectedBibleDay, setSelectedBibleDay] = useState<number | null>(null);
  const [isConfirmingDeleteNotice, setIsConfirmingDeleteNotice] = useState(false);
  const [isConfirmingDeleteReport, setIsConfirmingDeleteReport] = useState(false);
  const [noticeIdToDelete, setNoticeIdToDelete] = useState<string | null>(null);
  const [reportIdToDelete, setReportIdToDelete] = useState<string | null>(null);
  const [isAddingReport, setIsAddingReport] = useState(false);
  const [isAddingDevotional, setIsAddingDevotional] = useState(false);
  const [newDevotional, setNewDevotional] = useState({ title: '', content: '', thumbnail_url: '' });
  const [newReport, setNewReport] = useState({
    month: '',
    events_held: '',
    avg_participants: '',
    resources_used: '',
    integration: '',
    positive_points: '',
    improvements: ''
  });
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<MinistryNotice | null>(null);
  const [managementTab, setManagementTab] = useState<'escalas' | 'equipe' | 'carousel' | 'repositorio'>('escalas');
  const [isMinistryLoading, setIsMinistryLoading] = useState(false);
  const [isConfirmingAccountDelete, setIsConfirmingAccountDelete] = useState(false);

  const sanitizePII = (data: any): any => {
    if (!data) return data;
    if (typeof data === 'string') {
      if (data.includes('@') && data.includes('.')) return '***@***.***';
      return data;
    }
    if (typeof data === 'object') {
      const sanitized: any = {};
      const sensitive = ['email', 'password', 'cpf', 'phone', 'token', 'secret'];
      for (const key in data) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) sanitized[key] = '[REDACTED]';
        else sanitized[key] = sanitizePII(data[key]);
      }
      return sanitized;
    }
    return data;
  };

  const sanitizedLog = (message: string, data?: any) => {
    const sanitizedData = sanitizePII(data);
    console.log(`[PRIVACY-SAFE-LOG] ${message}`, sanitizedData);
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      operation,
      path,
      timestamp: new Date().toISOString(),
      user_id: user?.id ? `USR_${user.id.slice(0, 8)}` : 'GUEST'
    };
    sanitizedLog(`Firestore Error in ${operation}`, errorInfo);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getBibleReadingForDay = (day: number) => {
    // Simplified reading plan logic for demonstration
    // In a real app, this would be a full 365-day map
    const ot1 = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel"];
    const nt = ["Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios"];
    
    const bookIndex = Math.floor((day - 1) / 30) % ot1.length;
    const chapterStart = ((day - 1) % 30) * 2 + 1;
    
    return `${ot1[bookIndex]} ${chapterStart}-${chapterStart + 1}, ${nt[bookIndex]} ${Math.floor(chapterStart/2) + 1}`;
  };

  const fetchVocationalResults = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('vocational_tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVocationalResults(data || []);
    } catch (err) {
      console.error('Error fetching vocational results:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'vocational') {
      fetchVocationalResults();
    }
  }, [activeTab]);

  const handleAccountDeletion = async () => {
    if (!user || saving) return; 
    
    // Rate Limiting check: Max 1 attempt per hour for account sensitive ops
    try {
      const { data: allowed, error: limitError } = await supabase.rpc('check_rate_limit', {
        p_action_key: 'account_deletion_attempt',
        p_limit: 3, // Allow 3 attempts (e.g. if typing EXCLUIR fails)
        p_window_seconds: 3600
      });

      if (limitError || !allowed) {
        alert('Limite de tentativas excedido. Por favor, tente novamente mais tarde.');
        return;
      }
    } catch (err) {
      console.warn('Rate limit service unavailable, proceeding with caution.');
    }

    setSaving(true);
    try {
      // 1. Delete all personal data in public schema explicitly
      const tables = ['vocational_tests', 'profile_ministries', 'profiles'];
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(table === 'profiles' ? 'id' : 'user_id', user.id); 
        
        if (error) {
          handleFirestoreError(error, 'delete', table);
        }
      }

      // Log the consent revocation for legal audit
      await supabase.from('privacy_consent_log').insert([{
        user_id: user.id,
        consent_type: 'full_deletion',
        action: 'revoke',
        user_agent: navigator.userAgent
      }]);

      setIsConfirmingAccountDelete(false);
      alert('Sua conta e todos os dados relacionados foram excluídos com sucesso.');
      handleLogout();
    } catch (err) {
      handleFirestoreError(err, 'revoke', 'privacy_consent_log');
      alert('Ocorreu um erro ao excluir seus dados. Por favor, entre em contato com o suporte.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    setCurrentUser(null);
    setUserRole('member');
    setUserMinistries([]);
    setMinistryNotices([]);
    setMinistryScales([]);
    setBibleReading([]);
    setUserDevotionals([]);
    setKids([]);
    setUserUnavailabilities([]);
  };

  const handleBibleToggle = async (day: number) => {
    if (!user) return;
    const isCompleted = bibleReading.includes(day);
    try {
      if (isCompleted) {
        await supabase
          .from('bible_reading')
          .delete()
          .eq('user_id', user.id)
          .eq('day_number', day);
        setBibleReading(prev => prev.filter(d => d !== day));
      } else {
        await supabase
          .from('bible_reading')
          .upsert({ user_id: user.id, day_number: day, completed: true });
        setBibleReading(prev => [...prev, day]);
      }
    } catch (error) {
      console.error('Error toggling bible reading:', error);
    }
  };

  const handleResetBiblePlan = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('bible_reading')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setBibleReading([]);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      alert('Seu plano de leitura foi resetado com sucesso.');
    } catch (error) {
      handleFirestoreError(error, 'delete', 'bible_reading');
      alert('Erro ao resetar plano de leitura.');
    }
  };

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const validateCEP = (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'cpf') {
      if (value && !validateCPF(value)) {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido. Verifique os números.' }));
      } else {
        setErrors(prev => ({ ...prev, cpf: undefined }));
      }
    }
    
    if (field === 'cep') {
      if (value && !validateCEP(value)) {
        setErrors(prev => ({ ...prev, cep: 'CEP inválido. Deve conter 8 dígitos.' }));
      } else {
        setErrors(prev => ({ ...prev, cep: undefined }));
      }
    }
  };

  const handleSave = async () => {
    const isDemoUser = user?.id?.startsWith('demo-') || user?.is_demo || !isSupabaseConfigured;
    const cpfValid = !formData.cpf || validateCPF(formData.cpf);
    const cepValid = !formData.cep || validateCEP(formData.cep);

    if (!cpfValid || !cepValid) {
      setErrors({
        cpf: !cpfValid ? 'CPF inválido. Verifique os números.' : undefined,
        cep: !cepValid ? 'CEP inválido. Deve conter 8 dígitos.' : undefined
      });
      return;
    }

    setSaving(true);
    try {
      // Input Validation & Sanitization
      const validation = validateTextInput(formData.nome, 100);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, nome: validation.error }));
        setSaving(false);
        return;
      }

      // Sanitize all inputs
      const sanitizedData = sanitizeInputObject({
        full_name: formData.nome,
        whatsapp: formData.whatsapp,
        address: formData.endereco,
        neighborhood: formData.bairro,
        city: formData.cidade,
        state: formData.estado,
        cep: formData.cep,
        cpf: formData.cpf,
        birth_date: formData.dataNascimento,
        number: formData.numero,
        cell_id: formData.cell_id
      });

      if (isDemoUser) {
        alert('Dados salvos com sucesso! (Modo Demo)');
        setSaving(false);
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const dbUser = data?.user;
      
      if (!dbUser) {
        alert('Você precisa estar logado para salvar seus dados.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: dbUser.id,
          ...sanitizedData,
          birth_date: sanitizedData.birth_date || null,
          cpf: sanitizedData.cpf || null,
          cell_id: sanitizedData.cell_id || null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }
      alert('Dados salvos com sucesso!');
      await fetchUserData(dbUser);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMessage = error?.message || error?.error_description || 'Erro desconhecido';
      
      if (errorMessage.includes('profiles_cpf_key')) {
        alert('Erro: Este CPF já está cadastrado por outro usuário.');
      } else if (errorMessage.toLowerCase().includes('jwt expired') || errorMessage.toLowerCase().includes('not logged in')) {
        alert('Sessão expirada. Por favor, saia e entre novamente.');
      } else {
        alert(`Erro ao salvar dados: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMinistryToggle = async (ministryId: string) => {
    const isDemoUser = user?.id?.startsWith('demo-') || user?.is_demo || !isSupabaseConfigured;
    try {
      if (isDemoUser) {
        const existing = userMinistries.find(m => m.ministry_id === ministryId);
        if (existing) {
          setUserMinistries(prev => prev.filter(m => m.ministry_id !== ministryId));
        } else {
          const newEntry = { user_id: user?.id || 'demo-user', ministry_id: ministryId, is_leader: false };
          setUserMinistries(prev => [...prev, newEntry]);
        }
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const dbUser = data?.user;
      if (!dbUser) return;

      const existing = userMinistries.find(m => m.ministry_id === ministryId);

      if (existing) {
        await supabase
          .from('user_ministries')
          .delete()
          .eq('user_id', dbUser.id)
          .eq('ministry_id', ministryId);
        setUserMinistries(prev => prev.filter(m => m.ministry_id !== ministryId));
      } else {
        const newEntry = { user_id: dbUser.id, ministry_id: ministryId, is_leader: false };
        await supabase
          .from('user_ministries')
          .insert(newEntry);
        setUserMinistries(prev => [...prev, newEntry]);
      }
      
      // Refresh notices and scales after toggle
      fetchUserData(dbUser);
    } catch (error) {
      console.error('Error toggling ministry:', error);
    }
  };

  const handleDeleteScale = (scaleId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Escala',
      message: 'Tem certeza que deseja excluir esta escala?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('ministry_scales')
            .delete()
            .eq('id', scaleId);
          
          if (error) throw error;
          
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
            await supabase.auth.signOut();
            return;
          }
          const user = data?.user;
          if (user) fetchUserData(user);
        } catch (error) {
          console.error('Error deleting scale:', error);
          alert('Erro ao excluir escala.');
        }
      }
    });
  };

  const handleAddScale = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForAction || !newScale.date || newScale.assignments.some(a => !a.user_id || !a.role)) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const inserts = newScale.assignments.map(assignment => ({
        ministry_id: selectedMinistryForAction,
        date: newScale.date,
        description: newScale.description,
        user_id: assignment.user_id,
        role: assignment.role
      }));

      const { error } = await supabase
        .from('ministry_scales')
        .insert(inserts);
      
      if (error) throw error;
      
      setIsAddingScale(false);
      setNewScale({ date: '', description: '', assignments: [{ user_id: '', role: '' }] });
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error adding scale:', error);
      alert('Erro ao adicionar escala.');
    }
  };

  const handleAddNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForAction || !newNotice.title || !newNotice.content) return;

    try {
      const { error } = await supabase
        .from('ministry_notices')
        .insert([{
          ministry_id: selectedMinistryForAction,
          title: newNotice.title,
          content: newNotice.content,
          date: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setIsAddingNotice(false);
      setNewNotice({ title: '', content: '' });
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error adding notice:', error);
      alert('Erro ao adicionar aviso.');
    }
  };

  const handleUpdateNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!noticeToEdit) return;
    try {
      const { error } = await supabase
        .from('ministry_notices')
        .update({
          title: noticeToEdit.title,
          content: noticeToEdit.content
        })
        .eq('id', noticeToEdit.id);
      if (error) throw error;
      setIsEditingNotice(false);
      setNoticeToEdit(null);
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error updating notice:', error);
      alert('Erro ao atualizar aviso.');
    }
  };

  const handleDeleteNotice = (id: string) => {
    setNoticeIdToDelete(id);
    setIsConfirmingDeleteNotice(true);
  };

  const confirmDeleteNotice = async () => {
    if (!noticeIdToDelete) return;
    try {
      const { error } = await supabase
        .from('ministry_notices')
        .delete()
        .eq('id', noticeIdToDelete);
      if (error) throw error;
      setIsConfirmingDeleteNotice(false);
      setNoticeIdToDelete(null);
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error deleting notice:', error);
      alert('Erro ao excluir aviso.');
    }
  };

  const handleSaveDevotional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForAction || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('media_contents')
        .insert([{
          title: newDevotional.title,
          content_text: newDevotional.content,
          thumbnail_url: newDevotional.thumbnail_url,
          type: 'text',
          category: 'Devocional',
          status: 'pending',
          author_id: user.id,
          author_name: formData.nome,
          url: '',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setNewDevotional({ title: '', content: '', thumbnail_url: '' });
      setIsAddingDevotional(false);
      fetchHomeContent();
    } catch (error) {
      console.error('Error saving devotional:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForAction || !newReport.month) return;
    try {
      const { error } = await supabase
        .from('ministry_reports')
        .insert([{
          ministry_id: selectedMinistryForAction,
          ...newReport
        }]);
      if (error) throw error;
      setIsAddingReport(false);
      setNewReport({
        month: '',
        events_held: '',
        avg_participants: '',
        resources_used: '',
        integration: '',
        positive_points: '',
        improvements: ''
      });
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Erro ao salvar relatório.');
    }
  };

  const handleDeleteReport = (id: string) => {
    setReportIdToDelete(id);
    setIsConfirmingDeleteReport(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportIdToDelete) return;
    try {
      const { error } = await supabase
        .from('ministry_reports')
        .delete()
        .eq('id', reportIdToDelete);
      if (error) throw error;
      setIsConfirmingDeleteReport(false);
      setReportIdToDelete(null);
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (user) fetchUserData(user);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Erro ao excluir relatório.');
    }
  };

  const handleShareReport = (report: MinistryReport) => {
    const ministry = ministries.find(m => m.id === report.ministry_id);
    const text = `*Relatório Mensal - ${ministry?.name}*\n` +
      `*Mês:* ${report.month}\n\n` +
      `*Eventos Realizados:* ${report.events_held}\n` +
      `*Média de Participantes:* ${report.avg_participants}\n` +
      `*Recursos Utilizados:* ${report.resources_used}\n` +
      `*Integração:* ${report.integration}\n` +
      `*Pontos Positivos:* ${report.positive_points}\n` +
      `*Melhorias:* ${report.improvements}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleKidsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fData = new FormData(e.target as HTMLFormElement);
    const child_name = fData.get('child_name') as string;
    const birth_date = fData.get('birth_date') as string;
    const medication = fData.get('medication') as string;
    const food_restrictions = fData.get('food_restrictions') as string;
    const special_conditions = fData.get('special_conditions') as string;

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && (userError.message.toLowerCase().includes('refresh token not found') || userError.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      if (!user) {
        alert('Você precisa estar logado.');
        return;
      }

      const { error } = await supabase
        .from('kids_registrations')
        .insert({
          parent_id: user.id,
          child_name,
          birth_date,
          medication,
          food_restrictions,
          special_conditions
        });

      if (error) throw error;
      alert('Cadastro realizado com sucesso!');
      (e.target as HTMLFormElement).reset();
      
      // Refresh kids list
      const { data: kidsData } = await supabase
        .from('kids_registrations')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });
      if (kidsData) setKids(kidsData);
    } catch (error) {
      console.error('Error registering kid:', error);
      alert('Erro ao cadastrar. Tente novamente.');
    }
  };

  const handleDeleteKid = async (kidId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Cadastro',
      message: 'Tem certeza que deseja remover este cadastro?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('kids_registrations')
            .delete()
            .eq('id', kidId);
          if (error) throw error;
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setKids(prev => prev.filter(k => k.id !== kidId));
        } catch (error) {
          console.error('Error deleting kid:', error);
          alert('Erro ao remover cadastro.');
        }
      }
    });
  };

  const tabs = [
    { id: 'cadastro', name: 'Meu Cadastro', icon: <Users size={18} /> },
    { id: 'vocacional', name: 'Teste Vocacional', icon: <Compass size={18} /> },
    { id: 'ministerios', name: 'Ministérios', icon: <HandHeart size={18} /> },
    { id: 'escalas', name: 'Minhas Escalas', icon: <Calendar size={18} /> },
    { id: 'privacidade', name: 'Privacidade', icon: <Shield size={18} /> },
    { id: 'avisos', name: 'Quadro de Avisos', icon: <MessageCircle size={18} /> },
    { id: 'leitura', name: 'Plano de Leitura', icon: <BookOpen size={18} /> },
    { id: 'indisponibilidade', name: 'Indisponibilidade', icon: <Calendar size={18} /> },
    { id: 'celula', name: 'Minha Célula', icon: <Users size={18} /> },
    { id: 'kids', name: 'Kids', icon: <Heart size={18} /> },
  ];

  return (
    <>
      <div className="min-h-screen bg-stone-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-stone-600 hover:text-primary transition-colors font-medium"
          >
            <ChevronRight className="rotate-180 mr-2" size={20} />
            Voltar para o Site
          </button>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Área do Membro</h1>
            {user && (
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
              >
                Sair
              </button>
            )}
          </div>
        </div>

        {!user ? (
          <Auth onAuthSuccess={(u) => {
            if (onAuthSuccess) {
              onAuthSuccess(u);
            }
          }} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 lg:w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-100 lg:border-none'
                }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-stone-100 p-6 md:p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <h3 className="text-lg font-bold text-stone-800 mb-1">Sincronizando com o Supabase...</h3>
                <p className="text-sm text-stone-500 max-w-sm mb-6">
                  Carregando suas informações de cadastro, ministérios e escalas.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setLoading(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Ignorar e Entrar
                  </button>
                  <button
                    onClick={async () => {
                      await handleLogout();
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Sair da Conta (Logout)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'cadastro' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Atualizar Dados Cadastrais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-stone-700 mb-2">E-mail de Login (Base de Dados)</label>
                    <input 
                      type="text" 
                      value={formData.email}
                      readOnly
                      className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 outline-none text-stone-500 cursor-not-allowed" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="Seu nome completo" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">CPF</label>
                    <input 
                      type="text" 
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      className={`w-full bg-stone-50 border ${errors.cpf ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-200'} rounded-xl px-4 py-3 outline-none focus:ring-2 ${errors.cpf ? 'focus:ring-red-200' : 'focus:ring-primary/20'}`} 
                      placeholder="000.000.000-00" 
                    />
                    {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">WhatsApp</label>
                    <input 
                      type="tel" 
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="(47) 99999-9999" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Data de Nascimento</label>
                    <input 
                      type="date" 
                      value={formData.dataNascimento}
                      onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Cidade</label>
                    <input 
                      type="text" 
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="Sua cidade" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Sua Célula</label>
                    <select 
                      value={formData.cell_id}
                      onChange={(e) => handleInputChange('cell_id', e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Selecione uma célula (opcional)</option>
                      {cellGroups.map(cell => (
                        <option key={cell.id} value={cell.id}>{cell.name} - Líd: {cell.leader}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-8 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            )}

            {activeTab === 'vocacional' && (
              <VocationalTest 
                userId={user?.id} 
                results={vocationalResults} 
                isTakingTest={isTakingTest}
                setIsTakingTest={setIsTakingTest}
                onComplete={fetchVocationalResults} 
              />
            )}

            {activeTab === 'ministerios' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold mb-6">Selecione seus Ministérios</h2>
                  <p className="text-stone-500 mb-4">Marque os ministérios nos quais você deseja servir ou já atua.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ministries.map((m) => (
                      <label key={m.id} className="flex items-center space-x-3 p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={userMinistries.some(um => um.ministry_id === m.id)}
                          onChange={() => handleMinistryToggle(m.id)}
                          className="w-5 h-5 text-primary rounded focus:ring-primary" 
                        />
                        <span className="font-medium">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Live Stream Management for Communication Ministry Members */}
                {userMinistries.some(um => ministries.find(m => m.id === um.ministry_id)?.name.toLowerCase().includes('comunicação')) && (
                  <section className="pt-8 border-t border-stone-200">
                    <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                          <Video size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">Transmissão Ao Vivo</h4>
                          <p className="text-xs text-stone-500">Gerencie o link da live na home page</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Link da Transmissão (YouTube/Facebook)</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                              type="url" 
                              value={liveStream?.url || ''}
                              onChange={(e) => setLiveStream(prev => prev ? { ...prev, url: e.target.value } : { url: e.target.value, is_active: false })}
                              placeholder="https://youtube.com/live/..."
                              className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button 
                              disabled={isMinistryLoading}
                              onClick={async () => {
                                if (!liveStream?.url) {
                                  alert('Por favor, insira um link válido.');
                                  return;
                                }
                                setIsMinistryLoading(true);
                                try {
                                  const { error } = await supabase
                                    .from('live_stream')
                                    .upsert({ 
                                      id: liveStream?.id || undefined,
                                      url: liveStream.url, 
                                      is_active: !liveStream.is_active,
                                      updated_at: new Date().toISOString()
                                    });
                                  if (error) throw error;
                                  fetchUserData(user);
                                } catch (err) {
                                  console.error('Error updating live stream:', err);
                                  alert('Erro ao atualizar transmissão.');
                                } finally {
                                  setIsMinistryLoading(false);
                                }
                              }}
                              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                                liveStream?.is_active 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-stone-900 text-white hover:bg-black'
                              } disabled:opacity-50`}
                            >
                              {isMinistryLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (liveStream?.is_active ? 'Encerrar Live' : 'Iniciar Live')}
                            </button>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-2">
                            Ao clicar em "Iniciar Live", o indicador vermelho aparecerá na home page para todos os usuários.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {userMinistries.filter(m => m.is_leader).length > 0 && (
                  <section className="pt-8 border-t border-stone-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <ShieldCheck className="text-primary" size={24} />
                      <h2 className="text-xl font-bold">Painel de Gestão Ministerial</h2>
                    </div>
                    <p className="text-stone-500 mb-6 text-sm">
                      Este painel de liderança foi atribuído a você pela liderança pastoral para gerir o ministério e as escalas dos membros.
                    </p>
                    <div className="grid grid-cols-1 gap-8">
                      {userMinistries.filter(m => m.is_leader).map(um => {
                        const ministry = ministries.find(m => m.id === um.ministry_id);
                        if (!ministry) return null;
                        return (
                          <div key={um.ministry_id} className="bg-stone-50 border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-stone-900">{ministry.name}</h3>
                                <p className="text-[10px] md:text-xs text-stone-500 font-medium uppercase tracking-widest mt-1">Gestão de Liderança Ativa</p>
                              </div>
                              <div className="flex items-center">
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full uppercase tracking-widest">Líder Ministerial</span>
                              </div>
                            </div>

                            {/* Internal Tabs */}
                            <div className="flex border-b border-stone-200 mb-8 overflow-x-auto scrollbar-hide">
                              {[
                                { id: 'escalas', name: 'Escalas', icon: <Calendar size={16} /> },
                                { id: 'equipe', name: 'Equipe', icon: <Users size={16} /> },
                                ...(ministry.name.toLowerCase().includes('comunicação') || userRole === 'admin' || userRole === 'pastor' 
                                  ? [
                                      { id: 'carousel', name: 'Carrossel', icon: <Image size={16} /> },
                                      { id: 'repositorio', name: 'Repositório Semanal', icon: <FolderArchive size={16} /> }
                                    ] 
                                  : [])
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  onClick={() => setManagementTab(tab.id as any)}
                                  className={`flex items-center space-x-2 px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                                    managementTab === tab.id 
                                      ? 'border-primary text-primary' 
                                      : 'border-transparent text-stone-400 hover:text-stone-600'
                                  }`}
                                >
                                  {tab.icon}
                                  <span>{tab.name}</span>
                                </button>
                              ))}
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-6">
                              {managementTab === 'escalas' && (
                                <div className="space-y-6">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                    <h4 className="font-bold text-stone-800 flex items-center space-x-2">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                      <span>Próximas Escalas</span>
                                    </h4>
                                    <button 
                                      onClick={() => {
                                        setSelectedMinistryForAction(ministry.id);
                                        setIsAddingScale(true);
                                      }}
                                      className="text-xs font-bold text-primary hover:text-primary-dark flex items-center justify-center space-x-1.5 bg-primary/5 px-3 py-2 rounded-lg transition-all w-full sm:w-auto"
                                    >
                                      <Plus size={14} />
                                      <span>Nova Escala</span>
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-4">
                                    {ministryScales.filter(s => s.ministry_id === ministry.id).length > 0 ? (
                                      ministryScales.filter(s => s.ministry_id === ministry.id).map(scale => (
                                        <div key={scale.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                          <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-primary shrink-0">
                                              <Calendar size={20} />
                                            </div>
                                            <div>
                                              <p className="text-sm font-bold text-stone-800">{scale.role}</p>
                                              <p className="text-xs text-stone-500">{new Date(scale.date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between sm:justify-end space-x-4">
                                            <div className="text-left sm:text-right">
                                              <p className="text-xs font-bold text-stone-700">{profiles.find(p => p.id === scale.user_id)?.full_name}</p>
                                              <p className="text-[10px] text-stone-400">{scale.description}</p>
                                            </div>
                                            <button 
                                              onClick={() => handleDeleteScale(scale.id)}
                                              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                                              title="Excluir Escala"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-200">
                                        <p className="text-stone-400 text-sm italic">Nenhuma escala definida para este ministério.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {managementTab === 'equipe' && (
                                <div className="space-y-6">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-stone-800 flex items-center space-x-2">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                      <span>Equipe de Voluntários</span>
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ministryMembers.filter(m => m.ministry_id === ministry.id).map(member => (
                                      <div key={member.user_id} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center space-x-4">
                                          <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-primary font-bold text-sm border border-stone-100">
                                            {member.full_name?.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-stone-800">{member.full_name}</p>
                                            <p className="text-[10px] text-stone-400 font-medium">{member.whatsapp}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {member.is_leader && (
                                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Líder</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {managementTab === 'carousel' && (ministry.name.toLowerCase().includes('comunicação') || userRole === 'admin' || userRole === 'pastor') && (
                                <div className="space-y-6">
                                  <div className="flex items-center space-x-3 mb-6">
                                    <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                      <Image size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-stone-900">Gestão do Carrossel Home</h4>
                                      <p className="text-xs text-stone-500">Gerencie os eventos em destaque na página inicial</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm">
                                    <CarouselManagement 
                                      events={carouselEvents} 
                                      onRefresh={fetchHomeContent} 
                                      setConfirmModal={setConfirmModal}
                                    />
                                  </div>
                                </div>
                              )}

                              {managementTab === 'repositorio' && (ministry.name.toLowerCase().includes('comunicação') || userRole === 'admin' || userRole === 'pastor') && (
                                <div className="space-y-6">
                                  <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm">
                                    <WeeklyRepositoryAdmin 
                                      initialData={weeklyRepositoryData}
                                      onSaveSuccess={(savedData) => {
                                        if (setWeeklyRepositoryData) setWeeklyRepositoryData(savedData);
                                        fetchHomeContent();
                                      }}
                                      isMinistryLoading={isMinistryLoading}
                                      setIsMinistryLoading={setIsMinistryLoading}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'escalas' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Minhas Escalas</h2>
                <div className="space-y-4">
                  {ministryScales.length > 0 ? ministryScales.map((scale) => (
                    <div key={scale.id} className="p-6 bg-stone-50 rounded-2xl border-l-4 border-primary flex items-start space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <Calendar className="text-primary" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-lg">{scale.ministry_name}</h3>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{new Date(scale.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-stone-700 font-medium mb-1">{scale.role}</p>
                        <p className="text-stone-500 text-sm">{scale.description}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 bg-stone-50 rounded-2xl">
                      <Calendar className="mx-auto text-stone-300 mb-4" size={48} />
                      <p className="text-stone-500 italic">Você não possui escalas definidas no momento.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'privacidade' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white p-8 md:p-12 rounded-[40px] border border-stone-100 shadow-sm">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-stone-900 tracking-tight">Privacidade e Governança</h2>
                      <p className="text-sm text-stone-500 font-medium italic">Seus direitos e controle de dados (LGPD)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                          <Eye size={16} />
                        </div>
                        <h4 className="font-bold text-stone-900">Direitos do Titular</h4>
                      </div>
                      <ul className="space-y-3 text-sm text-stone-600 font-medium">
                        <li className="flex items-start">
                          <CheckCircle2 size={14} className="mr-2 mt-1 text-green-500 shrink-0" />
                          <span>Confirmação da existência de tratamento.</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 size={14} className="mr-2 mt-1 text-green-500 shrink-0" />
                          <span>Acesso, correção ou atualização de seus dados.</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 size={14} className="mr-2 mt-1 text-green-500 shrink-0" />
                          <span>Portabilidade de dados e revogação de consentimento.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                          <HelpCircle size={16} />
                        </div>
                        <h4 className="font-bold text-stone-900">Canal de Atendimento</h4>
                      </div>
                      <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                        Dúvidas sobre o tratamento de seus dados pessoais ou solicitações formais? Fale com nosso Encarregado (DPO).
                      </p>
                      <button 
                        onClick={() => window.open('https://wa.me/5547999359941?text=Olá,%20gostaria%20de%20falar%20com%20o%20DPO%20sobre%20meus%20dados.', '_blank')}
                        className="w-full bg-[#25D366] text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all"
                      >
                        <MessageCircle size={18} />
                        <span>Falar com DPO</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-red-50">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-600">Exclusão de Conta</h4>
                        <p className="text-xs text-stone-400">Esta ação é irreversível e exclui todos os seus dados.</p>
                      </div>
                    </div>
                    
                    <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 mb-8">
                      <p className="text-sm text-red-900 leading-relaxed font-medium">
                        Ao excluir sua conta, removeremos permanentemente:<br/>
                        • Seus dados cadastrais e foto de perfil<br/>
                        • Seu histórico de testes vocacionais<br/>
                        • Sua participação em escalas e ministérios<br/>
                        • Qualquer rastro de sua atividade nesta plataforma
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsConfirmingAccountDelete(true)}
                      className="py-4 px-8 border-2 border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center space-x-2"
                    >
                      <Trash2 size={18} />
                      <span>Excluir Permanentemente Meus Dados</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'avisos' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold mb-6">Avisos Gerais</h2>
                  <div className="space-y-4">
                    {announcements.length > 0 ? announcements.map((aviso) => (
                      <div key={aviso.id} className="p-6 bg-stone-50 rounded-2xl border-l-4 border-stone-300">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{aviso.title}</h3>
                          <span className="text-xs font-bold text-stone-400 bg-stone-200 px-2 py-1 rounded-full">{aviso.date}</span>
                        </div>
                        <p className="text-stone-600 text-sm">{aviso.description}</p>
                      </div>
                    )) : (
                      <p className="text-stone-500 italic">Nenhum aviso geral no momento.</p>
                    )}
                  </div>
                </section>

                {ministryNotices.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold mb-6">Avisos dos Meus Ministérios</h2>
                    <div className="space-y-4">
                      {ministryNotices.map((aviso) => (
                        <div key={aviso.id} className="p-6 bg-primary/5 rounded-2xl border-l-4 border-primary">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">{aviso.ministry_name}</span>
                              <h3 className="font-bold text-lg">{aviso.title}</h3>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{new Date(aviso.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-stone-600 text-sm">{aviso.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'leitura' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Plano de Leitura Bíblica Anual</h2>
                
                {selectedBibleDay ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <button 
                        onClick={() => setSelectedBibleDay(null)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="relative z-10">
                      <span className="text-primary font-bold text-sm uppercase tracking-widest mb-2 block">Dia {selectedBibleDay}</span>
                      <h3 className="text-3xl font-bold mb-6">Leitura do Dia</h3>
                      
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <BookOpen size={20} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-lg">{getBibleReadingForDay(selectedBibleDay)}</p>
                            <p className="text-white/50 text-sm">Leitura sugerida para hoje</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          handleBibleToggle(selectedBibleDay);
                          setSelectedBibleDay(null);
                        }}
                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                          bibleReading.includes(selectedBibleDay)
                            ? 'bg-white/10 text-white/50 cursor-default'
                            : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
                        }`}
                      >
                        {bibleReading.includes(selectedBibleDay) ? (
                          <>
                            <Check size={20} />
                            <span>Concluído</span>
                          </>
                        ) : (
                          <span>Marcar como Lido</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="bg-stone-900 text-white p-6 rounded-2xl mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-primary uppercase">Hoje: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-white/50">{bibleReading.length} de 365 dias concluídos</span>
                          {bibleReading.length > 0 && (
                            <button 
                              onClick={() => setConfirmModal({
                                isOpen: true,
                                title: 'Resetar Plano de Leitura',
                                message: 'Deseja realmente resetar seu progresso de leitura bíblica? Esta ação não pode ser desfeita.',
                                type: 'danger',
                                onConfirm: handleResetBiblePlan
                              })}
                              className="p-1 text-white/30 hover:text-red-400 transition-colors"
                              title="Resetar Plano"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-white/70 mb-4">Acompanhe sua jornada diária através da Palavra de Deus. Clique em um dia para ver a leitura.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-2">
                      {Array.from({ length: 365 }).map((_, i) => {
                        const day = i + 1;
                        const isCompleted = bibleReading.includes(day);
                        return (
                          <button 
                            key={day} 
                            onClick={() => setSelectedBibleDay(day)}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                              isCompleted 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'indisponibilidade' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Minhas Indisponibilidades</h2>
                  <button 
                    onClick={() => setIsAddingUnavailability(true)}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-primary-dark transition-all"
                  >
                    <Plus size={16} className="mr-2" /> Indicar Data
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {userUnavailabilities.length > 0 ? (
                    userUnavailabilities.map((unavail) => (
                      <div key={unavail.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-stone-800">{new Date(unavail.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-stone-500">Ministério: {unavail.ministry_name}</p>
                          {unavail.reason && <p className="text-xs text-stone-400 mt-1 italic">"{unavail.reason}"</p>}
                        </div>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Remover Indisponibilidade',
                              message: 'Deseja realmente remover esta indisponibilidade?',
                              type: 'danger',
                              onConfirm: async () => {
                                const isDemoUser = user?.id?.startsWith('demo-') || user?.is_demo || !isSupabaseConfigured;
                                if (isDemoUser) {
                                  setUserUnavailabilities(prev => prev.filter(u => u.id !== unavail.id));
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  alert('Indisponibilidade removida com sucesso! (Modo Demo)');
                                  return;
                                }
                                try {
                                  const { error } = await supabase
                                    .from('user_unavailability')
                                    .delete()
                                    .eq('id', unavail.id);
                                  if (error) throw error;
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  fetchUserData(user);
                                } catch (err) {
                                  console.error('Error deleting unavailability:', err);
                                }
                              }
                            });
                          }}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                      <p className="text-stone-400 italic">Nenhuma indisponibilidade cadastrada.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'celula' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Selecione sua Célula</h2>
                <div className="space-y-4">
                  <select 
                    value={(formData as any).cell_id || ''}
                    onChange={(e) => handleInputChange('cell_id', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione seu grupo de discipulado...</option>
                    {cellGroups.map(cell => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name} ({cell.day} {cell.time})
                      </option>
                    ))}
                  </select>
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <h4 className="font-bold text-primary mb-2">Informações da Célula</h4>
                    <p className="text-sm text-stone-600">Ao selecionar sua célula, você receberá avisos específicos do seu líder e poderá confirmar presença nos encontros.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kids' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Cadastre seu filho no Kids</h2>
                <p className="text-stone-500 mb-6">Mantenha as informações de seus filhos atualizadas para maior segurança em nossos cultos.</p>
                <form onSubmit={handleKidsSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Nome da Criança</label>
                      <input name="child_name" type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nome completo" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Data de Nascimento</label>
                      <input name="birth_date" type="date" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Toma algum medicamento contínuo?</label>
                      <input name="medication" type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Se sim, qual? Se não, deixe em branco." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Possui restrição alimentar? Descreva.</label>
                      <textarea name="food_restrictions" rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Ex: Alergia a amendoim, intolerância a lactose..."></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Alguma condição especial? Descreva.</label>
                      <textarea name="special_conditions" rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Descreva qualquer condição que nossa equipe precise saber."></textarea>
                    </div>
                  </div>
                  <button type="submit" className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors">Cadastrar Criança</button>
                </form>

                {kids.length > 0 && (
                  <div className="mt-12 pt-12 border-t border-stone-100">
                    <h3 className="text-lg font-bold mb-6">Crianças Cadastradas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kids.map((kid) => (
                        <div key={kid.id} className="p-6 bg-stone-50 rounded-2xl border border-stone-100 flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-bold text-stone-900">{kid.child_name}</h4>
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {calculateAge(kid.birth_date)} anos
                              </span>
                            </div>
                            <p className="text-sm text-stone-500 mb-2">
                              Nascimento: {new Date(kid.birth_date).toLocaleDateString('pt-BR')}
                            </p>
                            {kid.medication && (
                              <p className="text-xs text-red-600 font-medium">💊 Medicação: {kid.medication}</p>
                            )}
                            {kid.food_restrictions && (
                              <p className="text-xs text-orange-600 font-medium">🍎 Restrição: {kid.food_restrictions}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDeleteKid(kid.id)}
                            className="text-stone-400 hover:text-red-500 transition-colors p-2"
                            title="Remover"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )}
  </div>
</div>

{/* Modals for Ministry Management */}
<Modal 
  isOpen={isAddingScale} 
  onClose={() => setIsAddingScale(false)} 
  title="Adicionar Nova Escala"
>
  <form onSubmit={handleAddScale} className="space-y-6">
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Data</label>
      <input 
        type="date" 
        value={newScale.date}
        onChange={(e) => setNewScale({...newScale, date: e.target.value})}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
        required
      />
    </div>

    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-stone-700">Membros Escalados</label>
        <button 
          type="button"
          onClick={() => setNewScale({
            ...newScale, 
            assignments: [...newScale.assignments, { user_id: '', role: '' }]
          })}
          className="text-primary text-xs font-bold flex items-center hover:underline"
        >
          <Plus size={14} className="mr-1" /> Adicionar Membro
        </button>
      </div>

      {newScale.assignments.map((assignment, index) => {
        const isUnavailable = newScale.date && assignment.user_id && ministryUnavailabilities.some(u => 
          u.user_id === assignment.user_id && 
          u.date === newScale.date && 
          u.ministry_id === selectedMinistryForAction
        );
        const unavailReason = isUnavailable ? ministryUnavailabilities.find(u => 
          u.user_id === assignment.user_id && 
          u.date === newScale.date && 
          u.ministry_id === selectedMinistryForAction
        )?.reason : '';

        return (
          <div key={index} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3 relative">
            {newScale.assignments.length > 1 && (
              <button 
                type="button"
                onClick={() => setNewScale({
                  ...newScale,
                  assignments: newScale.assignments.filter((_, i) => i !== index)
                })}
                className="absolute top-2 right-2 text-stone-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
            
            <div>
              <select 
                value={assignment.user_id}
                onChange={(e) => {
                  const newAssignments = [...newScale.assignments];
                  newAssignments[index].user_id = e.target.value;
                  setNewScale({...newScale, assignments: newAssignments});
                }}
                className={`w-full bg-white border ${isUnavailable ? 'border-amber-500 ring-1 ring-amber-500' : 'border-stone-200'} rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20`}
                required
              >
                <option value="">Selecione o membro...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              {isUnavailable && (
                <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center">
                  <AlertCircle size={10} className="mr-1" /> 
                  Indisponível nesta data! {unavailReason ? `(${unavailReason})` : ''}
                </p>
              )}
            </div>

            <input 
              type="text" 
              value={assignment.role}
              onChange={(e) => {
                const newAssignments = [...newScale.assignments];
                newAssignments[index].role = e.target.value;
                setNewScale({...newScale, assignments: newAssignments});
              }}
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Função/Cargo (Ex: Guitarra, Recepção...)"
              required
            />
          </div>
        );
      })}
    </div>

    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Descrição do Evento (Opcional)</label>
      <textarea 
        value={newScale.description}
        onChange={(e) => setNewScale({...newScale, description: e.target.value})}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        rows={2}
        placeholder="Ex: Culto de Domingo, Ensaio..."
      />
    </div>
    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-all">
      Salvar Escala
    </button>
  </form>
</Modal>

<Modal 
  isOpen={isAddingNotice} 
  onClose={() => setIsAddingNotice(false)} 
  title="Postar Novo Aviso"
>
  <form onSubmit={handleAddNotice} className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Título</label>
      <input 
        type="text" 
        value={newNotice.title}
        onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Título do aviso"
        required
      />
    </div>
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Conteúdo</label>
      <textarea 
        value={newNotice.content}
        onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        rows={5}
        placeholder="Escreva o aviso aqui..."
        required
      />
    </div>
    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-all">
      Postar Aviso
    </button>
  </form>
      </Modal>
      
      <Modal 
        isOpen={isAddingUnavailability} 
        onClose={() => setIsAddingUnavailability(false)} 
        title="Indicar Indisponibilidade"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!user || !newUnavailability.date || !newUnavailability.ministry_id) return;
          const isDemoUser = user.id?.startsWith('demo-') || user.is_demo || !isSupabaseConfigured;
          if (isDemoUser) {
            setUserUnavailabilities(prev => [
              ...prev,
              {
                id: `un-${Date.now()}`,
                user_id: user.id,
                date: newUnavailability.date,
                reason: newUnavailability.reason,
                ministry_id: newUnavailability.ministry_id,
                ministry_name: ministries.find(m => m.id === newUnavailability.ministry_id)?.name || 'Ministério'
              }
            ]);
            setIsAddingUnavailability(false);
            setNewUnavailability({ date: '', ministry_id: '', reason: '' });
            alert('Indisponibilidade indicada com sucesso! (Modo Demo)');
            return;
          }
          try {
            const { error } = await supabase
              .from('user_unavailability')
              .insert([{
                user_id: user.id,
                ...newUnavailability
              }]);
            if (error) throw error;
            setIsAddingUnavailability(false);
            setNewUnavailability({ date: '', ministry_id: '', reason: '' });
            fetchUserData(user);
          } catch (error) {
            console.error('Error saving unavailability:', error);
            alert('Erro ao salvar indisponibilidade. Verifique se já não indicou esta data para este ministério.');
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Data</label>
            <input 
              type="date" 
              value={newUnavailability.date}
              onChange={(e) => setNewUnavailability({...newUnavailability, date: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Ministério</label>
            <select 
              value={newUnavailability.ministry_id}
              onChange={(e) => setNewUnavailability({...newUnavailability, ministry_id: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">Selecione o ministério...</option>
              {userMinistries.map(m => (
                <option key={m.ministry_id} value={m.ministry_id}>
                  {ministries.find(min => min.id === m.ministry_id)?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Motivo (Opcional)</label>
            <input 
              type="text" 
              value={newUnavailability.reason}
              onChange={(e) => setNewUnavailability({...newUnavailability, reason: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex: Viagem, Trabalho..."
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-all">
            Salvar Indisponibilidade
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isConfirmingDeleteNotice} 
        onClose={() => setIsConfirmingDeleteNotice(false)} 
        title="Excluir Aviso"
      >
        <div className="space-y-6">
          <p className="text-stone-600 text-sm leading-relaxed">
            Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
          </p>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsConfirmingDeleteNotice(false)}
              className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteNotice}
              className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isConfirmingDeleteReport} 
        onClose={() => setIsConfirmingDeleteReport(false)} 
        title="Excluir Relatório"
      >
        <div className="space-y-6">
          <p className="text-stone-600 text-sm leading-relaxed">
            Tem certeza que deseja excluir este relatório mensal? Esta ação não pode ser desfeita.
          </p>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsConfirmingDeleteReport(false)}
              className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteReport}
              className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isEditingNotice} 
        onClose={() => setIsEditingNotice(false)} 
        title="Editar Aviso Ministerial"
      >
        <form onSubmit={handleUpdateNotice} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Título</label>
            <input 
              type="text" 
              value={noticeToEdit?.title || ''}
              onChange={(e) => setNoticeToEdit(prev => prev ? {...prev, title: e.target.value} : null)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Conteúdo</label>
            <textarea 
              value={noticeToEdit?.content || ''}
              onChange={(e) => setNoticeToEdit(prev => prev ? {...prev, content: e.target.value} : null)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={5}
              required
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-all">
            Salvar Alterações
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isAddingReport} 
        onClose={() => setIsAddingReport(false)} 
        title="Gerar Novo Relatório Mensal"
      >
        <form onSubmit={handleSaveReport} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              Este relatório será formatado para caber em uma folha A4 e poderá ser compartilhado diretamente com a liderança pastoral.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Mês de Referência</label>
            <select 
              value={newReport.month}
              onChange={(e) => setNewReport({...newReport, month: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">Selecione o mês...</option>
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Quais foram os eventos realizados?</label>
            <textarea 
              value={newReport.events_held}
              onChange={(e) => setNewReport({...newReport, events_held: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="Liste os eventos..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Qual a média de participantes?</label>
            <input 
              type="text"
              value={newReport.avg_participants}
              onChange={(e) => setNewReport({...newReport, avg_participants: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex: 50 pessoas"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Quais recursos foram utilizados?</label>
            <textarea 
              value={newReport.resources_used}
              onChange={(e) => setNewReport({...newReport, resources_used: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="Som, iluminação, materiais..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Houve integração com outros ministérios?</label>
            <textarea 
              value={newReport.integration}
              onChange={(e) => setNewReport({...newReport, integration: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="Descreva as parcerias..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Pontos Positivos</label>
            <textarea 
              value={newReport.positive_points}
              onChange={(e) => setNewReport({...newReport, positive_points: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="O que funcionou bem?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">O que podemos melhorar?</label>
            <textarea 
              value={newReport.improvements}
              onChange={(e) => setNewReport({...newReport, improvements: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="Sugestões para o futuro..."
            />
          </div>

          <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 sticky bottom-0">
            Gerar e Salvar Relatório
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
      >
        <div className="space-y-6">
          <p className="text-stone-600 leading-relaxed">
            {confirmModal.message}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={confirmModal.onConfirm}
              disabled={isMinistryLoading}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center ${
                confirmModal.type === 'danger' 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20' 
                  : 'bg-stone-900 text-white hover:bg-black shadow-stone-900/20'
              } disabled:opacity-50`}
            >
              {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
              Confirmar
            </button>
            <button 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <DeleteAccountModal 
        isOpen={isConfirmingAccountDelete}
        onClose={() => setIsConfirmingAccountDelete(false)}
        onConfirm={handleAccountDeletion}
        isDeleting={saving}
      />
    </>
  );
};

const VisitorModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp: '',
    city: '',
    neighborhood: '',
    wants_to_join_group: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('visitors')
        .insert([formData]);

      if (error) {
        console.error('Supabase error inserting visitor:', error);
        throw error;
      }
      console.log('Visitor saved successfully:', formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          full_name: '',
          whatsapp: '',
          city: '',
          neighborhood: '',
          wants_to_join_group: false
        });
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error saving visitor:', error);
      alert('Erro ao enviar seus dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-stone-900 mb-2">Seja Bem-vindo!</h2>
                  <p className="text-stone-500">Ficamos felizes em ter você conosco. Deixe seus contatos para nos aproximarmos.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={24} className="text-stone-400" />
                </button>
              </div>

              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-2">Recebemos seus dados!</h3>
                  <p className="text-stone-500">Em breve entraremos em contato com você. Deus abençoe!</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">WhatsApp</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Cidade</label>
                      <input 
                        type="text" 
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Sua cidade"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Bairro</label>
                      <input 
                        type="text" 
                        required
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Seu bairro"
                      />
                    </div>
                  </div>
                  
                  <label className="flex items-center space-x-3 p-4 bg-stone-50 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.wants_to_join_group}
                      onChange={(e) => setFormData({...formData, wants_to_join_group: e.target.checked})}
                      className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-stone-600 font-medium">Desejo ser adicionado ao grupo da igreja no WhatsApp</span>
                  </label>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? 'Enviando...' : 'Enviar Cadastro'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ 
  onOpenMemberArea, 
  onOpenPastorArea, 
  onOpenVisitorForm, 
  onOpenPlannedVisit, 
  showNewHereButton,
  isLoggedIn,
  onOpenInstallApp,
  onOpenCongress,
  onOpenCells,
  onOpenRepository,
  onOpenGiving,
  onOpenPrayer,
  onOpenLists
}: { 
  onOpenMemberArea: () => void, 
  onOpenPastorArea: () => void, 
  onOpenVisitorForm: () => void, 
  onOpenPlannedVisit: () => void, 
  showNewHereButton: boolean,
  isLoggedIn: boolean,
  onOpenInstallApp?: () => void,
  onOpenCongress?: () => void,
  onOpenCells?: () => void,
  onOpenRepository?: () => void,
  onOpenGiving?: () => void,
  onOpenPrayer?: () => void,
  onOpenLists?: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { name: 'A Igreja', onClick: onOpenPrayer, href: '#sobre' },
    { name: 'Listas', onClick: onOpenLists, href: '#listas' },
    { name: 'Congressos', onClick: onOpenCongress, href: '#congressos' },
    { name: 'Células', onClick: onOpenCells, href: '#celulas' },
    { name: 'Repositório Semanal', onClick: onOpenRepository, href: '#assista' },
    { name: 'Contribua', onClick: onOpenGiving, href: '#contribua' },
  ];

  const [showLoginOptions, setShowLoginOptions] = useState(false);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${(scrolled || isOpen) ? 'bg-white shadow-md py-3' : 'bg-transparent py-4 md:py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/mensagem/IMG-20260111-WA0002.jpg" 
              alt="Logo MEVAM" 
              className="h-10 w-10 object-contain rounded-lg shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className={`text-xl sm:text-2xl font-bold tracking-tighter transition-colors ${(scrolled || isOpen) ? 'text-primary' : 'text-white'}`}>
              MEVAM<span className="font-light"> ITAPEMA SERTÃO</span>
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a 
                key={item.name} 
                href={item.href} 
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${(scrolled || isOpen) ? 'text-stone-600' : 'text-white/90'}`}
              >
                {item.name}
              </a>
            ))}

            {onOpenInstallApp && (
              <button
                onClick={onOpenInstallApp}
                title="Instalar App no celular ou computador"
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  (scrolled || isOpen) 
                    ? 'border-amber-500/50 text-amber-700 bg-amber-50 hover:bg-amber-100' 
                    : 'border-amber-400/50 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
                }`}
              >
                <Download size={13} />
                <span>Instalar App</span>
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setShowLoginOptions(!showLoginOptions)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all bg-stone-900 text-white md:bg-transparent ${
                  (scrolled || isOpen) 
                    ? 'md:text-stone-700 md:bg-stone-100 md:hover:bg-stone-200' 
                    : 'md:text-white md:bg-white/10 md:hover:bg-white/20'
                }`}
              >
                <User size={16} className="mr-2" />
                {isLoggedIn ? 'Minha Conta' : 'Login'}
              </button>
              <AnimatePresence>
                {showLoginOptions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 py-2 overflow-hidden"
                  >
                    <button 
                      onClick={() => {
                        onOpenMemberArea();
                        setShowLoginOptions(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-primary transition-colors font-medium"
                    >
                      Área do Membro
                    </button>
                    {isLoggedIn && (
                      <button 
                        onClick={() => {
                          onOpenPastorArea();
                          setShowLoginOptions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-primary transition-colors font-medium border-t border-stone-50"
                      >
                        Pastores (as)
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {showNewHereButton && (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onOpenVisitorForm}
                  className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
                >
                  Sou Novo Aqui
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className={`${(scrolled || isOpen) ? 'text-stone-900' : 'text-white'} p-2 hover:bg-black/5 rounded-lg transition-colors`}>
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-stone-100 overflow-hidden shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {menuItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  onClick={(e) => {
                    setIsOpen(false);
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                  className="block px-3 py-4 text-base font-medium text-stone-600 hover:text-primary hover:bg-stone-50 rounded-lg cursor-pointer"
                >
                  {item.name}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 py-2">
                <button 
                  onClick={() => {
                    onOpenMemberArea();
                    setIsOpen(false);
                  }}
                  className="text-center py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20"
                >
                  {isLoggedIn ? 'Minha Conta' : 'Membros'}
                </button>
                {isLoggedIn && (
                  <button 
                    onClick={() => {
                      onOpenPastorArea();
                      setIsOpen(false);
                    }}
                    className="text-center py-3 text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl"
                  >
                    Pastores (as)
                  </button>
                )}
              </div>
              {showNewHereButton && (
                <div className="pt-4">
                  <button 
                    onClick={() => {
                      onOpenVisitorForm();
                      setIsOpen(false);
                    }}
                    className="w-full bg-primary text-white px-5 py-3 rounded-xl font-semibold"
                  >
                    Sou Novo Aqui
                  </button>
                </div>
              )}
              {onOpenInstallApp && (
                <div className="pt-3">
                  <button
                    onClick={() => {
                      onOpenInstallApp();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Instalar Aplicativo MEVAM</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const CongressManagement = ({ 
  congresses, 
  onRefresh,
  setConfirmModal,
  setIsMinistryLoading
}: { 
  congresses: Congress[], 
  onRefresh: () => void,
  setConfirmModal: (modal: any) => void,
  setIsMinistryLoading: (loading: boolean) => void
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCongress, setEditingCongress] = useState<Congress | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedCongressForView, setSelectedCongressForView] = useState<string | null>(null);
  const [selectedRegForVoucher, setSelectedRegForVoucher] = useState<any | null>(null);
  const [regToReset, setRegToReset] = useState<any | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<any | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedRegistration, setScannedRegistration] = useState<any | null>(null);
  const [scannerCongressId, setScannerCongressId] = useState<string | null>(null);
  const [editRegFormData, setEditRegFormData] = useState<any>({
    full_name: '',
    whatsapp: '',
    cpf: '',
    city: '',
    payment_status: ''
  });

  const handleEditRegistration = (reg: any) => {
    setEditingRegistration(reg);
    setEditRegFormData({
      full_name: reg.personal_data?.full_name || '',
      whatsapp: reg.personal_data?.whatsapp || '',
      cpf: reg.personal_data?.cpf || '',
      city: reg.personal_data?.city || '',
      payment_status: reg.payment_status || 'pending'
    });
  };

  const handleUpdateRegistrationDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRegistration) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('congress_registrations')
        .update({
          personal_data: {
            ...editingRegistration.personal_data,
            full_name: editRegFormData.full_name,
            whatsapp: editRegFormData.whatsapp,
            cpf: editRegFormData.cpf,
            city: editRegFormData.city
          },
          payment_status: editRegFormData.payment_status
        })
        .eq('id', editingRegistration.id);

      if (error) throw error;
      setEditingRegistration(null);
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
    } catch (error: any) {
      console.error('Error updating registration:', error);
      alert('Erro ao atualizar inscrição: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleQRScan = async (data: string) => {
    setIsMinistryLoading(true);
    try {
      let regId = '';
      let couponSerial = '';

      if (data.startsWith('REGISTRATION:')) {
        regId = data.split(':')[1];
      } else if (data.startsWith('CONGRESS-REG-')) {
        // Fallback para formato antigo, tentando pegar o ID no final ou reconstruir
        const parts = data.split('-');
        // Se o congress ID for UUID (36 chars), ele tem 4 dashes.
        // CONGRESS(0)-REG(1)-UUID_PART1(2)-P2(3)-P3(4)-P4(5)-P5(6)-CPF(7)
        if (parts.length >= 8) {
          const cpf = parts[parts.length - 1];
          const { data: reg, error } = await supabase
            .from('congress_registrations')
            .select('*')
            .filter('personal_data->>cpf', 'eq', cpf)
            .limit(1)
            .single();
          if (reg) {
            setScannedRegistration(reg);
            setIsScannerOpen(false);
            return;
          }
        }
      } else if (data.startsWith('VERIFY:')) {
        couponSerial = data.split(':')[1];
      } else if (data.length > 20) {
        // Pode ser o ID direto?
        regId = data;
      }

      let query = supabase.from('congress_registrations').select('*');
      
      if (regId) {
        query = query.eq('id', regId);
      } else if (couponSerial) {
        query = query.eq('coupon_serial', couponSerial);
      } else {
        throw new Error('Código QR não reconhecido.');
      }

      const { data: reg, error } = await query.single();

      if (error) throw error;
      setScannedRegistration(reg);
      setIsScannerOpen(false);
    } catch (err: any) {
      alert('Inscrição não encontrada: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleManualSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    setIsMinistryLoading(true);
    try {
      // Tenta buscar por CPF ou Cupom ou ID (truncado)
      const { data: regs, error } = await supabase
        .from('congress_registrations')
        .select('*')
        .or(`coupon_serial.eq.${searchTerm},id.eq.${searchTerm},personal_data->>cpf.eq.${searchTerm}`);

      if (error) throw error;
      if (regs && regs.length > 0) {
        setScannedRegistration(regs[0]);
        setIsScannerOpen(false);
      } else {
        alert('Nenhuma inscrição encontrada com este termo.');
      }
    } catch (err: any) {
      alert('Erro na busca: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleConfirmCheckIn = async (regId: string) => {
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('congress_registrations')
        .update({
          check_in_status: 'checked_in',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (error) throw error;
      setScannedRegistration((prev: any) => prev ? { ...prev, check_in_status: 'checked_in' } : null);
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
      alert('Check-in realizado com sucesso! ✅');
    } catch (err: any) {
      alert('Erro ao realizar check-in: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleFullConfirmCheckIn = async (regId: string) => {
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('congress_registrations')
        .update({
          payment_status: 'confirmed',
          check_in_status: 'checked_in',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (error) throw error;
      setScannedRegistration((prev: any) => prev ? { ...prev, payment_status: 'confirmed', check_in_status: 'checked_in' } : null);
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
      alert('Inscrição confirmada e Check-in realizado! ✅');
    } catch (err: any) {
      alert('Erro ao confirmar inscrição: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    banner_url: '',
    date: '',
    schedule: [] as { time: string; activity: string }[],
    location_details: '',
    how_to_get_there: '',
    payment_info: '',
    image_terms: '',
    is_active: true,
    price: 0,
    about_text: '',
    organizer_phone: '',
    has_t_shirts: true,
    is_free: false
  });

  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    description: '',
    capacity: 50
  });
  const [editingWorkshops, setEditingWorkshops] = useState<CongressWorkshop[]>([]);

  useEffect(() => {
    if (editingCongress) {
      setFormData({
        title: editingCongress.title,
        banner_url: editingCongress.banner_url,
        date: editingCongress.date,
        schedule: editingCongress.schedule,
        location_details: editingCongress.location_details,
        how_to_get_there: editingCongress.how_to_get_there,
        payment_info: editingCongress.payment_info,
        image_terms: editingCongress.image_terms,
        is_active: editingCongress.is_active,
        price: editingCongress.price || 0,
        about_text: editingCongress.about_text || '',
        organizer_phone: editingCongress.organizer_phone || '',
        has_t_shirts: editingCongress.has_t_shirts ?? true,
        is_free: editingCongress.is_free ?? false
      });
      fetchEditingWorkshops(editingCongress.id);
    } else {
      setFormData({
        title: '',
        banner_url: '',
        date: '',
        schedule: [],
        location_details: '',
        how_to_get_there: '',
        payment_info: '',
        image_terms: '',
        is_active: true,
        price: 0,
        about_text: '',
        has_t_shirts: true,
        is_free: false
      });
      setEditingWorkshops([]);
    }
  }, [editingCongress]);

  const fetchEditingWorkshops = async (congressId: string) => {
    const { data } = await supabase
      .from('congress_workshops')
      .select('*')
      .eq('congress_id', congressId);
    if (data) setEditingWorkshops(data);
  };

  const handleAddWorkshop = async () => {
    if (!editingCongress || !newWorkshop.title) return;
    try {
      const { error } = await supabase
        .from('congress_workshops')
        .insert([{ ...newWorkshop, congress_id: editingCongress.id }]);
      if (error) throw error;
      fetchEditingWorkshops(editingCongress.id);
      setNewWorkshop({ title: '', description: '', capacity: 50 });
    } catch (error) {
      console.error('Error adding workshop:', error);
    }
  };

  const handleDeleteWorkshop = async (workshopId: string) => {
    try {
      const { error } = await supabase
        .from('congress_workshops')
        .delete()
        .eq('id', workshopId);
      if (error) throw error;
      if (editingCongress) fetchEditingWorkshops(editingCongress.id);
    } catch (error) {
      console.error('Error deleting workshop:', error);
    }
  };

  const handleSaveCongress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.info('Iniciando salvamento de congresso:', editingCongress ? 'Edição' : 'Novo');
    try {
      if (editingCongress) {
        const { error } = await supabase
          .from('congresses')
          .update({
            title: formData.title,
            banner_url: formData.banner_url,
            date: formData.date,
            schedule: formData.schedule,
            location_details: formData.location_details,
            how_to_get_there: formData.how_to_get_there,
            payment_info: formData.payment_info,
            image_terms: formData.image_terms,
            is_active: formData.is_active,
            price: formData.price,
            about_text: formData.about_text,
            organizer_phone: formData.organizer_phone,
            has_t_shirts: formData.has_t_shirts,
            is_free: formData.is_free
          })
          .eq('id', editingCongress.id);
        if (error) throw error;
        console.info('Congresso atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('congresses')
          .insert([formData]);
        if (error) throw error;
        console.info('Novo congresso criado com sucesso');
      }
      await onRefresh();
      setIsModalOpen(false);
      setEditingCongress(null);
    } catch (error: any) {
      console.error('Error saving congress:', error);
      alert('Erro ao salvar congresso: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCongress = (id: string) => {
    console.info('Solicitando exclusão de congresso:', id);
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Congresso',
      message: 'Deseja realmente excluir este congresso? Todas as oficinas e inscrições vinculadas também serão excluídas.',
      type: 'danger',
      onConfirm: async () => {
        setIsMinistryLoading(true);
        try {
          console.info('Iniciando processo de exclusão...');
          
          // 1. Deletar oficinas vinculadas
          const { error: workshopsError } = await supabase
            .from('congress_workshops')
            .delete()
            .eq('congress_id', id);
          if (workshopsError) console.warn('Aviso ao deletar oficinas:', workshopsError.message);

          // 2. Deletar inscrições vinculadas
          const { error: regsError } = await supabase
            .from('congress_registrations')
            .delete()
            .eq('congress_id', id);
          if (regsError) console.warn('Aviso ao deletar inscrições:', regsError.message);

          // 3. Deletar o congresso
          const { error } = await supabase
            .from('congresses')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          console.info('Congresso excluído com sucesso');
          await onRefresh();
          setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error('Error deleting congress:', error);
          alert('Erro ao excluir congresso: ' + error.message);
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  const fetchRegistrations = async (congressId: string) => {
    if (selectedCongressForView === congressId) {
      setSelectedCongressForView(null);
      return;
    }

    setSelectedCongressForView(congressId);
    setLoadingRegistrations(true);
    console.info('Buscando inscrições para o congresso:', congressId);
    
    try {
      const { data, error } = await supabase
        .from('congress_registrations')
        .select('*')
        .eq('congress_id', congressId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.info(`${data?.length || 0} inscrições encontradas.`);
      setRegistrations(data || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      alert('Erro ao carregar inscrições: ' + error.message);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleUpdateRegStatus = async (regId: string, status: string) => {
    setIsMinistryLoading(true);
    try {
      let updateData: any = { payment_status: status };
      
      if (status === 'confirmed') {
        // Gera número de série único e seguro (Hash/UUID fake para demo)
        const serial = `CONG-${regId.slice(0, 4)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        updateData.coupon_serial = serial;
        updateData.payment_status = 'paid'; // Normalizando status
      }

      const { error } = await supabase
        .from('congress_registrations')
        .update(updateData)
        .eq('id', regId);
      
      if (error) throw error;
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleResetRegStatus = async () => {
    if (!regToReset) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('congress_registrations')
        .update({ 
          payment_status: 'pending',
          coupon_serial: null 
        })
        .eq('id', regToReset.id);
      
      if (error) throw error;
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
      setRegToReset(null);
    } catch (error: any) {
      console.error('Error resetting status:', error);
      alert('Erro ao resetar status: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteRegistration = async (regId: string) => {
    if (!window.confirm('Deseja realmente excluir esta inscrição?')) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('congress_registrations')
        .delete()
        .eq('id', regId);
      
      if (error) throw error;
      if (selectedCongressForView) fetchRegistrations(selectedCongressForView);
    } catch (error: any) {
      console.error('Error deleting registration:', error);
      alert('Erro ao excluir inscrição: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-stone-900">Gestão de Congressos</h3>
        <button 
          onClick={() => { setEditingCongress(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-primary-dark transition-all"
        >
          <Plus size={20} />
          <span>Novo Congresso</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {congresses.map(congress => (
          <div key={congress.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <img src={congress.banner_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-stone-900">{congress.title}</h4>
                  <p className="text-stone-500 flex items-center text-sm">
                    <Calendar size={14} className="mr-1" />
                    {new Date(congress.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 self-end sm:self-auto">
                <button onClick={() => fetchRegistrations(congress.id)} className="p-2 text-stone-400 hover:text-primary transition-all" title="Ver Inscrições">
                  <Users size={20} />
                </button>
                <button 
                  onClick={() => { setScannerCongressId(congress.id); setIsScannerOpen(true); }} 
                  className="p-2 text-stone-400 hover:text-primary transition-all" 
                  title="Check-in QR Code (Scanner)"
                >
                  <Camera size={20} />
                </button>
                <button onClick={() => { setEditingCongress(congress); setIsModalOpen(true); }} className="p-2 text-stone-400 hover:text-primary transition-all">
                  <Edit2 size={20} />
                </button>
                <button onClick={() => handleDeleteCongress(congress.id)} className="p-2 text-stone-400 hover:text-red-500 transition-all">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {selectedCongressForView === congress.id && (
              <div className="mt-6 border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-bold text-stone-900 flex items-center">
                    <ClipboardList size={18} className="mr-2 text-primary" />
                    Inscrições ({registrations.length})
                  </h5>
                  <button 
                    onClick={() => {
                      setSelectedCongressForView(null);
                      setTimeout(() => fetchRegistrations(congress.id), 100);
                    }}
                    className="text-xs text-primary hover:underline flex items-center"
                  >
                    <RefreshCw size={12} className="mr-1" /> Atualizar
                  </button>
                </div>

                {loadingRegistrations ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs text-stone-400 font-medium">Carregando inscritos...</p>
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <Users size={32} className="mx-auto text-stone-300 mb-2" />
                    <p className="text-sm text-stone-500 font-medium">Nenhuma inscrição encontrada para este congresso.</p>
                    <p className="text-[10px] text-stone-400">As inscrições aparecerão aqui assim que forem realizadas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-stone-400 border-b">
                          <th className="pb-3 font-medium">Participante</th>
                          <th className="pb-3 font-medium">Status Pagto</th>
                          <th className="pb-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map(reg => (
                          <tr key={reg.id} className="border-b last:border-0 hover:bg-stone-50/50 transition-colors">
                            <td className="py-3">
                              <div className="font-medium text-stone-900">
                                {reg.personal_data?.full_name || reg.profiles?.full_name || 'N/A'}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {reg.personal_data?.cpf || 'CPF não informado'} • {new Date(reg.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                reg.payment_status === 'paid' ? 'bg-green-100 text-green-600' :
                                reg.payment_status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-600'
                              }`}>
                                {reg.payment_status === 'paid' ? 'Pago' : 
                                 reg.payment_status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => setSelectedRegForVoucher({ reg, congress })}
                                  className="p-1.5 text-stone-400 hover:text-primary transition-all bg-stone-50 rounded-lg"
                                  title="Ver Voucher"
                                >
                                  <Scan size={16} />
                                </button>
                                <button 
                                  onClick={() => handleEditRegistration(reg)}
                                  className="p-1.5 text-stone-400 hover:text-primary transition-all bg-stone-50 rounded-lg"
                                  title="Editar Dados / Status"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const text = `Olá ${reg.personal_data?.full_name || 'Participante'}! Passando para informar que sua inscrição no ${congress.title} está com status: ${reg.payment_status === 'paid' || reg.payment_status === 'confirmed' ? 'CONFIRMADA ✅' : 'PENDENTE ⏳'}.`;
                                    const phone = (reg.personal_data?.whatsapp || '').replace(/\D/g, '');
                                    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                  title="Chamar WhatsApp"
                                >
                                  <MessageCircle size={16} />
                                </button>
                                {reg.payment_status === 'pending' && (
                                  <button 
                                    onClick={() => handleUpdateRegStatus(reg.id, 'confirmed')}
                                    className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all"
                                    title="Confirmar Pagamento Rapido"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteRegistration(reg.id)}
                                  className="p-1.5 text-stone-300 hover:text-red-500 transition-all bg-stone-50 rounded-lg"
                                  title="Excluir Inscrição"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCongress ? 'Editar Congresso' : 'Novo Congresso'}>
        <form onSubmit={handleSaveCongress} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Título</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">URL do Banner</label>
                <input 
                  type="text" 
                  value={formData.banner_url}
                  onChange={(e) => setFormData({...formData, banner_url: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Data</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Preço (R$)</label>
                <input 
                  type="number" 
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">WhatsApp do Organizador</label>
                <input 
                  type="text" 
                  placeholder="Ex: 5511999999999"
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData({...formData, organizer_phone: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Localização (Detalhes)</label>
                <textarea 
                  value={formData.location_details}
                  onChange={(e) => setFormData({...formData, location_details: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Como Chegar</label>
                <textarea 
                  value={formData.how_to_get_there}
                  onChange={(e) => setFormData({...formData, how_to_get_there: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-stone-400 uppercase">Cronograma</label>
              <button 
                type="button"
                onClick={() => setFormData({...formData, schedule: [...formData.schedule, { time: '', activity: '' }]})}
                className="text-xs font-bold text-primary hover:underline"
              >
                + Adicionar Item
              </button>
            </div>
            <div className="space-y-2">
              {formData.schedule.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="08:00"
                    value={item.time}
                    onChange={(e) => {
                      const newSchedule = [...formData.schedule];
                      newSchedule[idx].time = e.target.value;
                      setFormData({...formData, schedule: newSchedule});
                    }}
                    className="w-24 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="text" 
                    placeholder="Atividade"
                    value={item.activity}
                    onChange={(e) => {
                      const newSchedule = [...formData.schedule];
                      newSchedule[idx].activity = e.target.value;
                      setFormData({...formData, schedule: newSchedule});
                    }}
                    className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newSchedule = formData.schedule.filter((_, i) => i !== idx);
                      setFormData({...formData, schedule: newSchedule});
                    }}
                    className="text-stone-400 hover:text-red-500 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {formData.schedule.length === 0 && (
                <p className="text-xs text-stone-400 italic text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  Nenhum item no cronograma.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Info de Pagamento (PIX, etc)</label>
              <textarea 
                value={formData.payment_info}
                onChange={(e) => setFormData({...formData, payment_info: e.target.value})}
                className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Termos de Uso de Imagem (Padrão)</label>
              <div className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 text-xs text-stone-500 leading-relaxed italic">
                Autorizo o uso da minha imagem em fotos e vídeos capturados durante o evento para fins de divulgação e registros da igreja.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Sobre o Congresso (Descrição Longa)</label>
            <textarea 
              value={formData.about_text}
              onChange={(e) => setFormData({...formData, about_text: e.target.value})}
              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 h-32 resize-none"
              placeholder="Descreva os detalhes do congresso, objetivos, etc."
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-stone-700">Congresso Ativo (Visível para Inscrição)</span>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={formData.has_t_shirts}
                onChange={(e) => setFormData({...formData, has_t_shirts: e.target.checked})}
                className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-stone-700">Disponibilizar Camisetas</span>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={formData.is_free}
                onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-stone-700">Entrada Gratuita (Sem Pagamento)</span>
            </div>
          </div>

          {editingCongress && (
            <div className="pt-6 border-t border-stone-100">
              <h4 className="font-bold text-stone-900 mb-4 flex items-center">
                <Users size={18} className="mr-2 text-primary" />
                Gestão de Oficinas / Workshops
              </h4>
              <div className="space-y-4 mb-6">
                {editingWorkshops.map(workshop => (
                  <div key={workshop.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div>
                      <p className="font-bold text-sm text-stone-900">{workshop.title}</p>
                      <p className="text-xs text-stone-500">{workshop.capacity} vagas</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteWorkshop(workshop.id)}
                      className="text-stone-400 hover:text-red-500 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Adicionar Oficina</p>
                <input 
                  type="text" 
                  placeholder="Título da Oficina"
                  value={newWorkshop.title}
                  onChange={(e) => setNewWorkshop({...newWorkshop, title: e.target.value})}
                  className="w-full bg-white border border-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Descrição curta"
                    value={newWorkshop.description}
                    onChange={(e) => setNewWorkshop({...newWorkshop, description: e.target.value})}
                    className="flex-1 bg-white border border-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="number" 
                    placeholder="Vagas"
                    value={newWorkshop.capacity}
                    onChange={(e) => setNewWorkshop({...newWorkshop, capacity: parseInt(e.target.value) || 0})}
                    className="w-24 bg-white border border-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleAddWorkshop}
                  className="w-full bg-stone-900 text-white py-2 rounded-xl font-bold text-sm hover:bg-black transition-all"
                >
                  Adicionar Oficina
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 bg-stone-100 text-stone-600 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (editingCongress ? 'Salvar Alterações' : 'Criar Congresso')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Reset */}
      <Modal 
        isOpen={!!regToReset} 
        onClose={() => setRegToReset(null)} 
        title="Confirmar Reset de Status"
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RotateCcw size={32} className="text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">Deseja resetar esta inscrição?</h3>
          <p className="text-sm text-stone-500 mb-6">
            O status voltará para <strong>Pendente</strong> e o <strong>Número de Série (Cupom)</strong> será removido. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setRegToReset(null)}
              className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleResetRegStatus}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all"
            >
              Confirmar Reset
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!selectedRegForVoucher} 
        onClose={() => setSelectedRegForVoucher(null)} 
        title=""
        maxWidth="max-w-md"
      >
        {selectedRegForVoucher && (
          <CongressVoucher 
            congress={selectedRegForVoucher.congress} 
            registration={selectedRegForVoucher.reg} 
            onClose={() => setSelectedRegForVoucher(null)}
          />
        )}
      </Modal>

      <Modal 
        isOpen={!!editingRegistration} 
        onClose={() => setEditingRegistration(null)} 
        title="Editar Inscrição"
      >
        <form onSubmit={handleUpdateRegistrationDetails} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={editRegFormData.full_name}
              onChange={(e) => setEditRegFormData({...editRegFormData, full_name: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">WhatsApp</label>
              <input 
                type="text" 
                value={editRegFormData.whatsapp}
                onChange={(e) => setEditRegFormData({...editRegFormData, whatsapp: e.target.value})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">CPF</label>
              <input 
                type="text" 
                value={editRegFormData.cpf}
                onChange={(e) => setEditRegFormData({...editRegFormData, cpf: e.target.value})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Cidade</label>
            <input 
              type="text" 
              value={editRegFormData.city}
              onChange={(e) => setEditRegFormData({...editRegFormData, city: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Status do Pagamento</label>
            <select 
              value={editRegFormData.payment_status}
              onChange={(e) => setEditRegFormData({...editRegFormData, payment_status: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado / Pago</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>
          <div className="pt-4 flex space-x-3">
            <button 
              type="button"
              onClick={() => setEditingRegistration(null)}
              className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        title="Check-in de Participantes"
        maxWidth="max-w-md"
      >
        <div className="p-4">
          <div className="mb-6">
            <p className="text-xs font-bold text-stone-400 uppercase mb-3 tracking-widest text-center">Opção 1: Escanear QR Code</p>
            <div className="relative">
              {isScannerOpen && (
                <QRScannerComponent 
                  onScan={handleQRScan}
                  onClose={() => setIsScannerOpen(false)}
                />
              )}
            </div>
          </div>

          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-stone-300 font-bold tracking-widest">OU</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-stone-400 uppercase mb-1 tracking-widest text-center">Opção 2: Busca Manual (CPF ou Cupom)</p>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="CPF ou Código do Cupom"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualSearch((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button 
                onClick={(e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  handleManualSearch(input.value);
                }}
                className="p-3 bg-stone-900 text-white rounded-xl hover:bg-black transition-all"
              >
                <Search size={20} />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 text-center italic">
              Use esta opção caso a câmera não esteja funcionando ou o QR Code esteja ilegível.
            </p>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!scannedRegistration} 
        onClose={() => setScannedRegistration(null)} 
        title="Validar Inscrição"
        maxWidth="max-w-md"
      >
        {scannedRegistration && (
          <div className="space-y-6">
            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <CheckCircle2 size={120} />
              </div>
              
              <div className="flex items-center space-x-4 mb-6 relative">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <User size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-stone-900 leading-tight">
                    {scannedRegistration.personal_data?.full_name}
                  </h4>
                  <p className="text-xs text-stone-500 font-mono tracking-widest uppercase mt-0.5">
                    CPF: {scannedRegistration.personal_data?.cpf}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative">
                <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Pagamento</p>
                  <div className="flex items-center">
                    {scannedRegistration.payment_status === 'confirmed' || scannedRegistration.payment_status === 'paid' ? (
                      <span className="text-sm font-bold text-green-600 flex items-center">
                        <CheckCircle size={14} className="mr-1.5" /> PAGO
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-orange-500 flex items-center">
                        <AlertCircle size={14} className="mr-1.5" /> PENDENTE
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Check-in</p>
                  <div className="flex items-center">
                    {scannedRegistration.check_in_status === 'checked_in' ? (
                      <span className="text-sm font-bold text-green-600 flex items-center">
                        <CheckCircle2 size={14} className="mr-1.5" /> VERIFICADO
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-stone-300">AGUARDANDO</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              {(scannedRegistration.payment_status === 'confirmed' || scannedRegistration.payment_status === 'paid') ? (
                scannedRegistration.check_in_status === 'checked_in' ? (
                  <div className="p-5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center space-x-3 text-green-700 font-bold">
                    <CheckCircle2 size={24} />
                    <span className="text-lg">Participante Verificado</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConfirmCheckIn(scannedRegistration.id)}
                    className="w-full bg-green-600 text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 size={24} />
                    <span>Confirmar Check-in</span>
                  </button>
                )
              ) : (
                <div className="space-y-3">
                  <div className="p-5 bg-orange-50 border border-orange-100 rounded-3xl">
                    <div className="flex items-center space-x-3 text-orange-600 font-black uppercase tracking-tighter text-lg mb-2">
                      <AlertCircle size={28} />
                      <span>Pagamento Pendente</span>
                    </div>
                    <p className="text-sm text-orange-800 mb-5 font-medium leading-relaxed">
                      Este participante precisa regularizar o pagamento antes do check-in.
                    </p>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => handleFullConfirmCheckIn(scannedRegistration.id)}
                        className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
                      >
                        <CheckCircle2 size={20} />
                        <span>Confirmar Pagto + Check-in</span>
                      </button>
                      <button 
                        onClick={() => {
                          const scannerCongress = congresses.find(c => c.id === scannedRegistration.congress_id);
                          const text = `Prezado ${scannedRegistration.personal_data?.full_name}, notamos que sua inscrição no ${scannerCongress?.title || 'congresso'} ainda consta como pendente. Por favor, procure a recepção para regularizar seu acesso.`;
                          const phone = (scannedRegistration.personal_data?.whatsapp || '').replace(/\D/g, '');
                          if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                      >
                        <MessageCircle size={20} />
                        <span>Chamar no WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setScannedRegistration(null)}
                className="w-full py-4 text-stone-400 font-bold uppercase tracking-widest hover:text-stone-600 transition-all border border-stone-100 rounded-2xl mt-2"
              >
                Fechar / Sair
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const PastorArea = ({ 
  onBack, 
  onGoToLogin,
  mediaContents, 
  setMediaContents,
  announcements,
  setAnnouncements,
  fetchHomeContent,
  liveStream,
  setLiveStream,
  carouselEvents,
  userUnavailabilities,
  ministryUnavailabilities,
  fetchUserData,
  profiles: initialProfiles,
  congresses,
  ministries: initialMinistries,
  userMinistries,
  cellGroups: initialCellGroups,
  bibleReading,
  setBibleReading,
  kids,
  setKids,
  userRole,
  setUserRole,
  formData,
  setFormData,
  ministryNotices,
  setMinistryNotices,
  ministryScales,
  setMinistryScales,
  ministryReports,
  setMinistryReports,
  userDevotionals,
  setUserDevotionals,
  ministryMembers,
  setMinistryMembers,
  confirmModal,
  setConfirmModal,
  isAddingUnavailability,
  setIsAddingUnavailability,
  newUnavailability,
  setNewUnavailability,
  setUserMinistries,
  mercadoRegistrations,
  setMercadoRegistrations,
  isMercadoOpen,
  setIsMercadoOpen,
  toggleMercadoStatus,
  handleDeleteMercadoRegistration,
  handleShareMercadoRegistration,
  setSelectedMercadoRegistration,
  setIsMercadoDetailOpen,
  loading,
  isCantinaOpen = false,
  setIsCantinaOpen,
  cantinaPixCode = '',
  setCantinaPixCode,
  cantinaEventDate = '',
  setCantinaEventDate,
  weeklyRepositoryData = null,
  setWeeklyRepositoryData,
  churchServices = [],
  setChurchServices
}: { 
  onBack: () => void;
  mediaContents: MediaContent[];
  setMediaContents: React.Dispatch<React.SetStateAction<MediaContent[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  fetchHomeContent: () => Promise<void>;
  liveStream: { id?: string, url: string, is_active: boolean } | null;
  setLiveStream: React.Dispatch<React.SetStateAction<{ id?: string, url: string, is_active: boolean } | null>>;
  carouselEvents: any[];
  userUnavailabilities: any[];
  ministryUnavailabilities: any[];
  fetchUserData: (user: any) => Promise<void>;
  profiles: Profile[];
  congresses: Congress[];
  ministries: Ministry[];
  userMinistries: UserMinistry[];
  setUserMinistries: React.Dispatch<React.SetStateAction<UserMinistry[]>>;
  cellGroups: CellGroup[];
  bibleReading: number[];
  setBibleReading: React.Dispatch<React.SetStateAction<number[]>>;
  kids: any[];
  setKids: React.Dispatch<React.SetStateAction<any[]>>;
  userRole: string;
  setUserRole: React.Dispatch<React.SetStateAction<string>>;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  ministryNotices: MinistryNotice[];
  setMinistryNotices: React.Dispatch<React.SetStateAction<MinistryNotice[]>>;
  ministryScales: MinistryScale[];
  setMinistryScales: React.Dispatch<React.SetStateAction<MinistryScale[]>>;
  ministryReports: MinistryReport[];
  setMinistryReports: React.Dispatch<React.SetStateAction<MinistryReport[]>>;
  userDevotionals: MediaContent[];
  setUserDevotionals: React.Dispatch<React.SetStateAction<MediaContent[]>>;
  ministryMembers: any[];
  setMinistryMembers: React.Dispatch<React.SetStateAction<any[]>>;
  confirmModal: any;
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  isAddingUnavailability: boolean;
  setIsAddingUnavailability: React.Dispatch<React.SetStateAction<boolean>>;
  newUnavailability: any;
  setNewUnavailability: React.Dispatch<React.SetStateAction<any>>;
  mercadoRegistrations: any[];
  setMercadoRegistrations: React.Dispatch<React.SetStateAction<any[]>>;
  isMercadoOpen: boolean;
  setIsMercadoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMercadoStatus: any;
  handleDeleteMercadoRegistration: (id: string) => void;
  handleShareMercadoRegistration: (reg: any) => void;
  setSelectedMercadoRegistration: (reg: any) => void;
  setIsMercadoDetailOpen: (val: boolean) => void;
  loading: boolean;
  onGoToLogin?: () => void;
  isCantinaOpen?: boolean;
  setIsCantinaOpen?: (open: boolean) => void;
  cantinaPixCode?: string;
  setCantinaPixCode?: (code: string) => void;
  cantinaEventDate?: string;
  setCantinaEventDate?: (date: string) => void;
  weeklyRepositoryData?: WeeklyRepositoryData | null;
  setWeeklyRepositoryData?: React.Dispatch<React.SetStateAction<WeeklyRepositoryData | null>>;
  churchServices?: ChurchService[];
  setChurchServices?: React.Dispatch<React.SetStateAction<ChurchService[]>>;
}) => {
  const [activeTab, setActiveTab] = useState('pastores');
  const [ministries, setMinistries] = useState<Ministry[]>(initialMinistries);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [leadership, setLeadership] = useState<UserMinistry[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pageVisits, setPageVisits] = useState<{ page_name: string, count: number }[]>([]);

  const fetchPageVisits = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase.from('page_visits').select('page_name, count');
      if (data) {
        const aggregated = data.reduce((acc: any, curr) => {
          acc[curr.page_name] = (acc[curr.page_name] || 0) + curr.count;
          return acc;
        }, {});
        setPageVisits(Object.entries(aggregated).map(([page_name, count]) => ({ page_name, count: count as number })));
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'pastores') {
      fetchPageVisits();
    }
  }, [activeTab]);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!userId || !newRole) return;
    
    // Proteção extra para o super usuário no código
    const targetProfile = profiles.find(p => p.id === userId);
    if (targetProfile?.email === 'anderlevita@gmail.com') {
      setConfirmModal({
        isOpen: true,
        title: 'Acesso Negado',
        message: 'Este é um super-usuário do sistema e seu papel não pode ser alterado para garantir a segurança do acesso.',
        type: 'danger',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Alterar Papel do Usuário',
      message: `Deseja realmente alterar o papel deste membro para "${newRole}"? Isso mudará suas permissões de acesso.`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsDashboardLoading(true);
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
          
          if (error) throw error;
          
          await fetchData();
          // Usando o confirmModal como um alert de sucesso
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: 'Papel do usuário atualizado com sucesso!',
            type: 'success',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error: any) {
          console.error('Error updating user role:', error);
          setConfirmModal({
            isOpen: true,
            title: 'Erro',
            message: 'Erro ao atualizar papel: ' + error.message,
            type: 'danger',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setIsDashboardLoading(false);
        }
      }
    });
  };

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleToggleArchiveUser = async (userId: string, currentArchived: boolean) => {
    if (!userId) return;

    // Proteção extra para o super usuário no código
    const targetProfile = profiles.find(p => p.id === userId);
    if (targetProfile?.email === 'anderlevita@gmail.com') {
      setConfirmModal({
        isOpen: true,
        title: 'Acesso Negado',
        message: 'Este é um super-usuário do sistema e não pode ser arquivado.',
        type: 'danger',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const actionText = currentArchived ? 'desarquivar' : 'arquivar';
    const actionSuccessText = currentArchived ? 'desarquivado' : 'arquivado';

    setConfirmModal({
      isOpen: true,
      title: `${currentArchived ? 'Desarquivar' : 'Arquivar'} Membro`,
      message: `Deseja realmente ${actionText} o cadastro de "${targetProfile?.full_name}"?`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsDashboardLoading(true);
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ is_archived: !currentArchived })
            .eq('id', userId);

          if (error) {
            if (error.message && (
              error.message.includes('column "is_archived" of relation "profiles" does not exist') ||
              error.message.includes("Could not find the 'is_archived' column") ||
              error.message.includes("is_archived")
            )) {
              throw new Error("is_archived_missing");
            }
            throw error;
          }

          await fetchData();
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: `O membro foi ${actionSuccessText} com sucesso!`,
            type: 'success',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } catch (err: any) {
          console.error(err);
          if (err.message === "is_archived_missing") {
            setConfirmModal({
              isOpen: true,
              title: 'Campo ausente no Supabase',
              message: 'O campo "is_archived" ainda não existe na sua tabela de perfis do Supabase. Para utilizar este recurso, execute o seguinte comando SQL no seu editor do Supabase:\n\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;',
              type: 'danger',
              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            setConfirmModal({
              isOpen: true,
              title: 'Erro',
              message: `Erro ao ${actionText} membro: ` + (err.message || err),
              type: 'danger',
              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
          }
        } finally {
          setIsDashboardLoading(false);
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) return;

    const targetProfile = profiles.find(p => p.id === userId);
    if (targetProfile?.email === 'anderlevita@gmail.com') {
      setConfirmModal({
        isOpen: true,
        title: 'Acesso Negado',
        message: 'Este é o super-usuário administrador principal do sistema e não pode ser excluído.',
        type: 'danger',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '⚠️ Excluir Cadastro de Membro',
      message: `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE o registro do membro "${targetProfile?.full_name}"? Esta ação removerá sua conta e perfil permanentemente e não poderá ser desfeita. Para maior segurança, prefira apenas arquivar o registro.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsDashboardLoading(true);
        try {
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

          if (error) throw error;

          await fetchData();
          setConfirmModal({
            isOpen: true,
            title: 'Registro Excluído',
            message: 'O cadastro do membro foi excluído permanentemente do banco de dados.',
            type: 'success',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } catch (err: any) {
          console.error(err);
          setConfirmModal({
            isOpen: true,
            title: 'Erro ao Excluir',
            message: 'Erro ao excluir o registro de membro: ' + (err.message || err),
            type: 'danger',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setIsDashboardLoading(false);
        }
      }
    });
  };

  const [isAddingMinistry, setIsAddingMinistry] = useState(false);
  const [newMinistryName, setNewMinistryName] = useState('');
  const [isMinistryLoading, setIsMinistryLoading] = useState(false);
  const [isAddingCell, setIsAddingCell] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [newCell, setNewCell] = useState({
    name: '',
    leader: '',
    day: 'Terça-feira',
    time: '20:00',
    location: '',
    type: 'Misto'
  });
  const [selectedMinistryForLeadership, setSelectedMinistryForLeadership] = useState<string | null>(null);
  const [isManagingLeadership, setIsManagingLeadership] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Somente pastores (ou admin) possuem permissão para excluir avisos no painel administrativo
  const isPastor = Boolean(userRole === 'pastor' || userRole === 'admin' || currentUser?.email === 'anderlevita@gmail.com');

  const [selectedMinistryForManagement, setSelectedMinistryForManagement] = useState<Ministry | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [ministryDescriptionInput, setMinistryDescriptionInput] = useState('');

  const [lideresSubTab, setLideresSubTab] = useState<'dashboard' | 'escalas' | 'relatorios' | 'equipe' | 'avisos'>('dashboard');
  const [isAddingScaleSec, setIsAddingScaleSec] = useState(false);
  const [newScaleSec, setNewScaleSec] = useState({ date: '', role: '', description: '', user_id: '' });
  const [isAddingNoticeSec, setIsAddingNoticeSec] = useState(false);
  const [newNoticeSec, setNewNoticeSec] = useState({ title: '', content: '' });
  const [isAddingReportSec, setIsAddingReportSec] = useState(false);
  const [newReportSec, setNewReportSec] = useState({ month: '', events_held: '', avg_participants: '', notes: '' });

  useEffect(() => {
    setLideresSubTab('dashboard');
  }, [selectedMinistryForManagement]);

  const handleAddNewScaleSec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForManagement || !newScaleSec.date || !newScaleSec.user_id || !newScaleSec.role) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_scales').insert({
        ministry_id: selectedMinistryForManagement.id,
        date: newScaleSec.date,
        role: newScaleSec.role,
        description: newScaleSec.description,
        user_id: newScaleSec.user_id
      });
      if (error) throw error;
      setNewScaleSec({ date: '', role: '', description: '', user_id: '' });
      setIsAddingScaleSec(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar escala: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddNewNoticeSec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForManagement || !newNoticeSec.title || !newNoticeSec.content) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_notices').insert({
        ministry_id: selectedMinistryForManagement.id,
        title: newNoticeSec.title,
        content: newNoticeSec.content,
        date: new Date().toISOString().split('T')[0]
      });
      if (error) throw error;
      setNewNoticeSec({ title: '', content: '' });
      setIsAddingNoticeSec(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar aviso: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddNewReportSec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForManagement || !newReportSec.month) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_reports').insert({
        ministry_id: selectedMinistryForManagement.id,
        month: newReportSec.month,
        events_held: Number(newReportSec.events_held) || 0,
        avg_participants: Number(newReportSec.avg_participants) || 0,
        resources_used: '',
        integration: '',
        positive_points: newReportSec.notes,
        improvements: '',
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      setNewReportSec({ month: '', events_held: '', avg_participants: '', notes: '' });
      setIsAddingReportSec(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar relatório: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteScaleSec = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta escala?')) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_scales').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir escala: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteNoticeSec = async (id: string) => {
    if (!confirm('Deseja realmente excluir este aviso?')) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_notices').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir aviso: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteReportSec = async (id: string) => {
    if (!confirm('Deseja realmente excluir este relatório?')) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase.from('ministry_reports').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir relatório: ' + err.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [billsPayable, setBillsPayable] = useState<BillPayable[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>(
    initialCellGroups && initialCellGroups.length > 0 ? initialCellGroups : DEFAULT_CELL_GROUPS
  );
  const [kidsCount, setKidsCount] = useState(0);
  const [activeSecretariaTab, setActiveSecretariaTab] = useState<'dashboard' | 'members' | 'visitors' | 'financial'>('dashboard');

  const [allReports, setAllReports] = useState<MinistryReport[]>([]);
  const [allScales, setAllScales] = useState<MinistryScale[]>([]);
  const [allNotices, setAllNotices] = useState<MinistryNotice[]>([]);
  const [allMinistryMembers, setAllMinistryMembers] = useState<any[]>([]);
  const [isAddingNoticeForPastors, setIsAddingNoticeForPastors] = useState(false);
  const [showSqlNoticeModal, setShowSqlNoticeModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [selectedMinistryForNotice, setSelectedMinistryForNotice] = useState('');
  const [newNoticeForPastors, setNewNoticeForPastors] = useState({ title: '', content: '' });
  const [pastorViewTab, setPastorViewTab] = useState<'reports' | 'scales' | 'team' | 'notices' | 'ministries' | 'cells' | 'prayer' | 'media' | 'carousel' | 'cultos'>('reports');
  const [isAddingCulto, setIsAddingCulto] = useState(false);
  const [isEditingCulto, setIsEditingCulto] = useState(false);
  const [cultoToEdit, setCultoToEdit] = useState<ChurchService | null>(null);
  const [cultoToDelete, setCultoToDelete] = useState<ChurchService | null>(null);
  const [isDeletingCulto, setIsDeletingCulto] = useState(false);
  const [showSqlCultosModal, setShowSqlCultosModal] = useState(false);
  const [sqlCultosCopied, setSqlCultosCopied] = useState(false);
  const [cultoForm, setCultoForm] = useState({
    title: '',
    day_of_week: 'Domingo',
    day_short: 'DOM',
    time: '19h00',
    description: '',
    badge_text: '',
    color: 'amber',
    order_index: 1,
    is_active: true
  });
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [mediaToEdit, setMediaToEdit] = useState<MediaContent | null>(null);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', description: '', date: new Date().toLocaleDateString('pt-BR') });
  const [homeFilter, setHomeFilter] = useState<'all' | 'announcements' | 'media'>('all');
  const [newMedia, setNewMedia] = useState<Partial<MediaContent>>({
    type: 'video',
    category: 'Mensagem'
  });
  const [prayerFilter, setPrayerFilter] = useState<'pending' | 'intercession' | 'completed' | 'all'>('pending');

  const [searchVisitor, setSearchVisitor] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [membersFilter, setMembersFilter] = useState<'ativos' | 'arquivados'>('ativos');
  const [searchCell, setSearchCell] = useState('');
  const [filterCellType, setFilterCellType] = useState('Todos');
  const [plannedVisits, setPlannedVisits] = useState<PlannedVisit[]>([]);

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<FinancialTransaction | null>(null);
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().split('-').slice(0, 2).join('-')); // YYYY-MM
  const [isWritingDevotional, setIsWritingDevotional] = useState(false);
  const [selectedMinistryForDevotional, setSelectedMinistryForDevotional] = useState<string | null>(null);
  const [newDevotional, setNewDevotional] = useState<Partial<MediaContent>>({
    type: 'text',
    category: 'Devocional',
    status: 'pending'
  });
  const [newTransaction, setNewTransaction] = useState<Partial<FinancialTransaction>>({
    type: 'income',
    category: 'Dízimo',
    date: new Date().toISOString().split('T')[0]
  });
  const [newBill, setNewBill] = useState<Partial<BillPayable>>({
    status: 'pending',
    due_date: new Date().toISOString().split('T')[0]
  });

  const filteredProfiles = profiles.filter(p => {
    // Check if the current profile fits the archival filter status
    const matchesArchive = membersFilter === 'arquivados' ? p.is_archived === true : !p.is_archived;
    
    // Check if it matches search
    const matchesSearch = (p.full_name || '').toLowerCase().includes(searchMember.toLowerCase()) ||
                          (p.role || '').toLowerCase().includes(searchMember.toLowerCase());
                          
    return matchesArchive && matchesSearch;
  });

  const handleMarkAsPaid = (billId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Marcar como Pago',
      message: 'Deseja marcar esta conta como paga? Isso registrará uma saída no fluxo de caixa.',
      type: 'primary',
      onConfirm: async () => {
        setIsMinistryLoading(true);
        try {
          // 1. Get bill details
          const { data: bill, error: fetchError } = await supabase
            .from('bills_payable')
            .select('*')
            .eq('id', billId)
            .single();
          
          if (fetchError) throw fetchError;

          // 2. Update bill status
          const { error: updateError } = await supabase
            .from('bills_payable')
            .update({ status: 'paid' })
            .eq('id', billId);

          if (updateError) throw updateError;

          // 3. Create financial transaction (expense)
          const { error: transError } = await supabase
            .from('financial_transactions')
            .insert([{
              description: `Pagamento: ${bill.description}`,
              amount: bill.amount,
              type: 'expense',
              category: 'Pagamento de Conta',
              date: new Date().toISOString().split('T')[0]
            }]);
          
          if (transError) throw transError;
          
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error marking bill as paid:', error);
          alert('Erro ao marcar conta como paga.');
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert([newTransaction]);
      if (error) throw error;
      await fetchData();
      setIsAddingTransaction(false);
      setNewTransaction({
        type: 'income',
        category: 'Dízimo',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Erro ao adicionar transação.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionToEdit) return;
    
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          description: transactionToEdit.description,
          amount: transactionToEdit.amount,
          type: transactionToEdit.type,
          category: transactionToEdit.category,
          date: transactionToEdit.date
        })
        .eq('id', transactionToEdit.id);
      
      if (error) throw error;
      await fetchData();
      setIsEditingTransaction(false);
      setTransactionToEdit(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Erro ao atualizar transação.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('bills_payable')
        .insert([newBill]);
      if (error) throw error;
      fetchData();
      setIsAddingBill(false);
      setNewBill({
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding bill:', error);
      alert('Erro ao adicionar conta.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleForwardToIntercession = (requestId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Encaminhar para Intercessão',
      message: 'Deseja encaminhar este pedido para a equipe de intercessão?',
      type: 'primary',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('prayer_requests')
            .update({ status: 'intercession' })
            .eq('id', requestId);

          if (error) throw error;
          fetchData();
        } catch (error) {
          console.error('Error forwarding prayer request:', error);
        }
      }
    });
  };

  const handleCompletePrayerRequest = (requestId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Concluir Pedido',
      message: 'Deseja marcar este pedido de oração como concluído?',
      type: 'primary',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('prayer_requests')
            .update({ status: 'completed' })
            .eq('id', requestId);

          if (error) throw error;
          fetchData();
        } catch (error) {
          console.error('Error completing prayer request:', error);
        }
      }
    });
  };

  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleDeleteTransaction = (transactionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Transação',
      message: 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: async () => {
        setIsMinistryLoading(true);
        try {
          const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);
          
          if (error) throw error;
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting transaction:', error);
          alert('Erro ao excluir transação.');
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  const handleOpenAddCulto = () => {
    const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
    const currentList = isServicesInit 
      ? (churchServices || []) 
      : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);
    setCultoForm({
      title: '',
      day_of_week: 'Domingo',
      day_short: 'DOM',
      time: '19h00',
      description: '',
      badge_text: '',
      color: 'amber',
      order_index: currentList.length + 1,
      is_active: true
    });
    setIsEditingCulto(false);
    setCultoToEdit(null);
    setIsAddingCulto(true);
  };

  const handleOpenEditCulto = (culto: ChurchService) => {
    setCultoForm({
      title: culto.title,
      day_of_week: culto.day_of_week,
      day_short: culto.day_short || 'DOM',
      time: culto.time,
      description: culto.description,
      badge_text: culto.badge_text || '',
      color: culto.color || 'amber',
      order_index: culto.order_index ?? 1,
      is_active: culto.is_active !== false
    });
    setCultoToEdit(culto);
    setIsEditingCulto(true);
    setIsAddingCulto(true);
  };

  const handleSaveCulto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cultoForm.title.trim() || !cultoForm.time.trim()) {
      alert('Por favor, informe ao menos o título e o horário do culto.');
      return;
    }

    const payload: Partial<ChurchService> = {
      title: cultoForm.title.trim(),
      day_of_week: cultoForm.day_of_week.trim(),
      day_short: (cultoForm.day_short || cultoForm.day_of_week.substring(0, 3)).toUpperCase().trim(),
      time: cultoForm.time.trim(),
      description: cultoForm.description.trim(),
      badge_text: cultoForm.badge_text.trim(),
      color: cultoForm.color || 'amber',
      order_index: Number(cultoForm.order_index) || 1,
      is_active: Boolean(cultoForm.is_active)
    };

    const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
    const currentList = isServicesInit 
      ? (churchServices || []) 
      : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);

    try {
      let updatedList: ChurchService[] = [];
      if (isEditingCulto && cultoToEdit) {
        updatedList = currentList.map(s => s.id === cultoToEdit.id ? { ...s, ...payload } : s);
        setChurchServices?.(updatedList);
        try {
          localStorage.setItem('mevam_cached_church_services', JSON.stringify(updatedList));
          localStorage.setItem('mevam_church_services_initialized', 'true');
        } catch (e) {}

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('church_services')
            .update(payload)
            .eq('id', cultoToEdit.id);
          if (error) console.warn('Aviso ao atualizar culto no Supabase:', error.message);
        }
      } else {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'culto-' + Date.now();
        const newService: ChurchService = {
          id: newId,
          created_at: new Date().toISOString(),
          ...payload as any
        };
        updatedList = [...currentList, newService];
        setChurchServices?.(updatedList);
        try {
          localStorage.setItem('mevam_cached_church_services', JSON.stringify(updatedList));
          localStorage.setItem('mevam_church_services_initialized', 'true');
        } catch (e) {}

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('church_services')
            .insert({ id: newId, ...payload });
          if (error) console.warn('Aviso ao inserir culto no Supabase:', error.message);
        }
      }

      setIsAddingCulto(false);
      setIsEditingCulto(false);
      setCultoToEdit(null);

      // Transmissão em tempo real via Supabase Broadcast para atualizar todos os navegadores/dispositivos
      try {
        supabase.channel('mevam-public-realtime').send({
          type: 'broadcast',
          event: 'content_sync',
          payload: { table: 'church_services', action: isEditingCulto ? 'update' : 'create', services: updatedList }
        });
      } catch (broadcastErr) {}

      // Disparo de evento local para sincronização instantânea
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { 
          detail: { table: 'church_services', action: isEditingCulto ? 'update' : 'create', services: updatedList } 
        }));
      } catch (e) {}

      if (fetchHomeContent) fetchHomeContent();
    } catch (err: any) {
      console.error('Erro ao salvar culto:', err);
      alert('Erro ao salvar culto: ' + (err.message || err));
    }
  };

  const handleDeleteCulto = (id: string, title?: string) => {
    const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
    const currentList = isServicesInit 
      ? (churchServices || []) 
      : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);
    const target = currentList.find(s => s.id === id || (title && s.title === title));
    if (target) {
      setCultoToDelete(target);
    } else {
      setCultoToDelete({
        id,
        title: title || 'Culto / Programação',
        day_of_week: 'Programação',
        time: '',
        description: ''
      } as ChurchService);
    }
  };

  const handleConfirmDeleteCulto = async () => {
    if (!cultoToDelete) return;
    setIsDeletingCulto(true);
    const targetId = cultoToDelete.id;
    const targetTitle = cultoToDelete.title;

    try {
      const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
      const currentList = isServicesInit 
        ? (churchServices || []) 
        : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);

      const updatedList = currentList.filter(s => s.id !== targetId && s.title !== targetTitle);

      setChurchServices?.(updatedList);
      try {
        localStorage.setItem('mevam_cached_church_services', JSON.stringify(updatedList));
        localStorage.setItem('mevam_church_services_initialized', 'true');
      } catch (e) {}

      if (isSupabaseConfigured) {
        try {
          if (targetId && !targetId.startsWith('default-')) {
            await supabase.from('church_services').delete().eq('id', targetId);
          }
          if (targetTitle) {
            await supabase.from('church_services').delete().eq('title', targetTitle);
          }
        } catch (supaErr) {
          console.warn('Aviso ao excluir culto no Supabase:', supaErr);
        }
      }

      // Transmissão em tempo real via Supabase Broadcast para sincronizar todos os clientes conectados
      try {
        supabase.channel('mevam-public-realtime').send({
          type: 'broadcast',
          event: 'content_sync',
          payload: { table: 'church_services', action: 'delete', services: updatedList }
        });
      } catch (broadcastErr) {}

      // Disparo de sincronização local imediata
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { 
          detail: { table: 'church_services', action: 'delete', services: updatedList } 
        }));
      } catch (e) {}

      setCultoToDelete(null);
      if (fetchHomeContent) fetchHomeContent();
    } catch (err: any) {
      console.error('Erro ao excluir culto:', err);
      alert('Erro ao excluir culto: ' + (err.message || err));
    } finally {
      setIsDeletingCulto(false);
    }
  };

  const handleToggleCultoActive = async (culto: ChurchService) => {
    const newActive = !culto.is_active;
    const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
    const currentList = isServicesInit 
      ? (churchServices || []) 
      : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);
    const updatedList = currentList.map(s => s.id === culto.id ? { ...s, is_active: newActive } : s);
    setChurchServices?.(updatedList);
    try {
      localStorage.setItem('mevam_cached_church_services', JSON.stringify(updatedList));
      localStorage.setItem('mevam_church_services_initialized', 'true');
    } catch (e) {}

    try {
      if (isSupabaseConfigured) {
        await supabase.from('church_services').update({ is_active: newActive }).eq('id', culto.id);
      }

      // Transmissão em tempo real
      try {
        supabase.channel('mevam-public-realtime').send({
          type: 'broadcast',
          event: 'content_sync',
          payload: { table: 'church_services', action: 'toggle', services: updatedList }
        });
      } catch (broadcastErr) {}

      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { 
          detail: { table: 'church_services', action: 'toggle', services: updatedList } 
        }));
      } catch (e) {}

      if (fetchHomeContent) fetchHomeContent();
    } catch (err) {
      console.error('Erro ao alternar status do culto:', err);
    }
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setIsDashboardLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && (error.message.toLowerCase().includes('refresh token not found') || error.message.toLowerCase().includes('invalid refresh token'))) {
        await supabase.auth.signOut();
        return;
      }
      const user = data?.user;
      
      if (!user) {
        setFetchError('Usuário não autenticado. Por favor, faça login novamente.');
        return;
      }
      setCurrentUser(user);

      console.info('Iniciando busca de dados para Área do Pastor...');

      // 1. Buscar o perfil para garantir que temos o papel (role) atualizado
      let myProfile = null;
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileFetchError) {
        console.warn('Aviso: Erro ao buscar papel do perfil (RLS pode estar instável):', profileFetchError.message);
      } else {
        myProfile = profileData;
      }

      // Verificação de papel via metadados do JWT ou tabela de perfis
      let fetchedRole = myProfile?.role || user?.app_metadata?.role || user?.user_metadata?.role;
      
      // Caso especial para o administrador principal (Garante acesso mesmo se o banco estiver vazio)
      if (user.email === 'anderlevita@gmail.com') {
        fetchedRole = 'admin';
      }

      const allowedRoles = ['admin', 'pastor', 'secretaria'];
      
      if (!allowedRoles.includes(fetchedRole)) {
        console.warn('Usuário sem permissão tentou acessar Área do Pastor:', user.email);
        setFetchError(`Acesso Restrito: O e-mail "${user.email}" não possui permissão de gestão (seu papel atual: ${fetchedRole || 'member'}). Para resolver, peça a um administrador para alterar seu papel na tabela de perfis.`);
        setIsDashboardLoading(false);
        return;
      }

      if (fetchedRole && fetchedRole !== userRole) {
        setUserRole(fetchedRole);
      }

      const safeFetch = async (queryPromise: PromiseLike<any>) => {
        try {
          const res = await queryPromise;
          return res;
        } catch (err: any) {
          console.warn('Aviso na consulta da Área do Pastor:', err?.message || err);
          return { data: null, error: err };
        }
      };

      const [ministriesRes, profilesRes, leadershipRes, visitorsRes, kidsRes, financialRes, billsRes, prayerRes, cellsRes, reportsRes, scalesRes, noticesRes, membersRes, mediaRes, plannedVisitsRes, mercadoRes, settingsRes] = await Promise.all([
        safeFetch(supabase.from('ministries').select('*').order('name')),
        safeFetch(supabase.from('profiles').select('*').order('full_name')),
        safeFetch(supabase.from('user_ministries').select('*')),
        safeFetch(supabase.from('visitors').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('kids_registrations').select('id', { count: 'exact' })),
        safeFetch(supabase.from('financial_transactions').select('*').order('date', { ascending: false })),
        safeFetch(supabase.from('bills_payable').select('*').order('due_date', { ascending: true })),
        safeFetch(supabase.from('prayer_requests').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('cell_groups').select('*').order('name')),
        safeFetch(supabase.from('ministry_reports').select('*, ministries(name)').order('created_at', { ascending: false })),
        safeFetch(supabase.from('ministry_scales').select('*, ministries(name), profiles(full_name)').order('date', { ascending: true })),
        safeFetch(supabase.from('ministry_notices').select('*, ministries(name)').order('date', { ascending: false })),
        safeFetch(supabase.from('user_ministries').select('*, profiles(full_name, whatsapp), ministries(name)')),
        safeFetch(supabase.from('media_contents').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('planned_visits').select('*').order('visit_date', { ascending: true })),
        safeFetch(supabase.from('mercado_solidario_registrations').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('app_settings').select('*'))
      ]);

      // Log errors but don't necessarily crash if they are non-critical
      const errors = [];
      if (ministriesRes.error) errors.push(`Ministérios: ${ministriesRes.error.message}`);
      if (profilesRes.error) {
        console.warn('Erro ao carregar lista de perfis:', profilesRes.error.message);
        // Se for erro de recursão e o usuário for admin mestre, ignoramos o erro crítico para permitir o acesso
        if (!profilesRes.error.message.includes('infinite recursion') || user.email !== 'anderlevita@gmail.com') {
          errors.push(`Perfis: ${profilesRes.error.message}`);
        }
      }
      if (leadershipRes.error) {
        if (!leadershipRes.error.message.includes('infinite recursion') || user.email !== 'anderlevita@gmail.com') {
          errors.push(`Liderança: ${leadershipRes.error.message}`);
        }
      }
      
      if (errors.length > 0) {
        console.error('Erros críticos detectados:', errors);
        setFetchError(`Erro ao carregar dados básicos: ${errors.join(', ')}. Verifique se você executou o SQL no Supabase.`);
        return;
      }

      setMinistries(ministriesRes.data || []);
      setProfiles(profilesRes.data || []);
      setLeadership(leadershipRes.data || []);
      setVisitors(visitorsRes.data || []);
      setKidsCount(kidsRes.count || 0);
      setFinancialTransactions(financialRes.data || []);
      setBillsPayable(billsRes.data || []);
      setPrayerRequests(prayerRes.data || []);
      setCellGroups(cellsRes.data || []);
      setAllReports(reportsRes.data?.map(r => ({ ...r, ministry_name: r.ministries?.name })) || []);
      setAllScales(scalesRes.data?.map(s => ({ ...s, ministry_name: s.ministries?.name, user_name: s.profiles?.full_name })) || []);
      setAllNotices(noticesRes.data?.map(n => ({ ...n, ministry_name: n.ministries?.name })) || []);
      setAllMinistryMembers(membersRes.data?.map(m => ({ ...m, full_name: m.profiles?.full_name, whatsapp: m.profiles?.whatsapp, ministry_name: m.ministries?.name })) || []);
      setMediaContents(mediaRes.data || []);
      setPlannedVisits(plannedVisitsRes.data || []);
      setMercadoRegistrations(mercadoRes.data || []);
      
      if (settingsRes.data) {
        const d = settingsRes.data as any[];
        const weekly = d.find(s => s.key === 'weekly_repository_data');
        if (weekly && weekly.value) setWeeklyRepositoryData(weekly.value);
        const mercado = d.find(s => s.key === 'mercado_solidario_open');
        if (mercado) setIsMercadoOpen(mercado.value === true);
        const cantina = d.find(s => s.key === 'cantina_enabled');
        if (cantina) setIsCantinaOpen(cantina.value === true);
        const pix = d.find(s => s.key === 'cantina_pix_code');
        if (pix) setCantinaPixCode(pix.value || '');
        const date = d.find(s => s.key === 'cantina_event_date');
        if (date) setCantinaEventDate(date.value || '');
      }

      const servicesRes = await safeFetch(supabase.from('church_services').select('*').order('order_index', { ascending: true }));
      if (servicesRes.data && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
        setChurchServices?.(servicesRes.data);
        try {
          localStorage.setItem('mevam_cached_church_services', JSON.stringify(servicesRes.data));
        } catch (e) {}
      }
    } catch (error: any) {
      console.error('Error fetching data for PastorArea:', error);
      setFetchError(error.message || 'Ocorreu um erro inesperado ao carregar os dados.');
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDevotional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistryForDevotional) return;
    
    // Validate Content
    const titleVal = validateTextInput(newDevotional.title, 200);
    const contentVal = validateTextInput(newDevotional.content || '', 5000);
    
    if (!titleVal.isValid || !contentVal.isValid) {
      alert(titleVal.error || contentVal.error);
      return;
    }

    setIsMinistryLoading(true);
    try {
      const sanitized = sanitizeInputObject(newDevotional);
      const { error } = await supabase
        .from('media_contents')
        .insert([{ 
          ...sanitized, 
          status: 'pending', 
          created_at: new Date().toISOString(),
          author: currentUser?.id
        }]);
      if (error) throw error;
      alert('Devocional enviada para aprovação dos pastores!');
      setIsWritingDevotional(false);
      setNewDevotional({ type: 'text', category: 'Devocional', status: 'pending' });
      fetchData();
    } catch (error: any) {
      console.error('Error saving devotional:', error);
      alert('Erro ao salvar devocional: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleApproveMedia = async (id: string) => {
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('media_contents')
        .update({ status: 'published' })
        .eq('id', id);

      if (error) throw error;
      
      setMediaContents(prev => prev.map(m => m.id === id ? { ...m, status: 'published' } : m));
    } catch (error) {
      console.error('Error approving media:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('media_contents')
        .insert([{ ...newMedia, status: 'published', created_at: new Date().toISOString() }]);
      if (error) throw error;
      fetchData();
      fetchHomeContent();
      setIsAddingMedia(false);
      setNewMedia({ type: 'video', category: 'Mensagem' });
    } catch (error) {
      console.error('Error adding media:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleUpdateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaToEdit) return;

    // Validation
    const titleVal = validateTextInput(mediaToEdit.title, 200);
    if (!titleVal.isValid) {
      alert(titleVal.error);
      return;
    }

    setIsMinistryLoading(true);
    try {
      const sanitized = sanitizeInputObject({
        title: mediaToEdit.title,
        category: mediaToEdit.category,
        type: mediaToEdit.type,
        url: mediaToEdit.url,
        thumbnail_url: mediaToEdit.thumbnail_url,
        content_text: mediaToEdit.content_text,
        status: mediaToEdit.status
      });

      const { error } = await supabase
        .from('media_contents')
        .update(sanitized)
        .eq('id', mediaToEdit.id);

      if (error) throw error;
      fetchData();
      fetchHomeContent();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'media_contents' } }));
      } catch (e) {}
      setIsEditingMedia(false);
      setMediaToEdit(null);
    } catch (error) {
      console.error('Error updating media:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('media_contents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
      fetchHomeContent();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'media_contents' } }));
      } catch (e) {}
    } catch (error) {
      console.error('Error deleting media:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const titleVal = validateTextInput(newAnnouncement.title, 150);
    if (!titleVal.isValid) {
      alert(titleVal.error);
      return;
    }

    setIsMinistryLoading(true);
    try {
      const sanitized = sanitizeInputObject(newAnnouncement);
      const { error } = await supabase
        .from('announcements')
        .insert([sanitized]);
      if (error) throw error;
      playNotificationSound();
      try {
        localStorage.setItem('mevam_has_unread_notice', 'true');
      } catch (e) {}
      fetchData();
      fetchHomeContent();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'announcements' } }));
      } catch (e) {}
      setIsAddingAnnouncement(false);
      setNewAnnouncement({ title: '', description: '', date: new Date().toLocaleDateString('pt-BR') });
    } catch (error) {
      console.error('Error adding announcement:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementToEdit) return;

    // Validation
    const titleVal = validateTextInput(announcementToEdit.title, 150);
    if (!titleVal.isValid) {
      alert(titleVal.error);
      return;
    }

    setIsMinistryLoading(true);
    try {
      const sanitized = sanitizeInputObject({
        title: announcementToEdit.title,
        description: announcementToEdit.description,
        date: announcementToEdit.date
      });

      const { error } = await supabase
        .from('announcements')
        .update(sanitized)
        .eq('id', announcementToEdit.id);
      if (error) throw error;
      fetchData();
      fetchHomeContent();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'announcements' } }));
      } catch (e) {}
      setIsEditingAnnouncement(false);
      setAnnouncementToEdit(null);
    } catch (error) {
      console.error('Error updating announcement:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este aviso? Ele será removido permanentemente da Central e da Página Inicial.')) {
      return;
    }

    setIsMinistryLoading(true);

    // 1. Remoção imediata no estado local (otimista)
    setAnnouncements(prev => prev.filter(a => a.id !== id));

    // 2. Remoção no cache persistente do navegador
    try {
      const cached = JSON.parse(localStorage.getItem('mevam_cached_announcements') || '[]');
      const updated = cached.filter((a: any) => a.id !== id);
      localStorage.setItem('mevam_cached_announcements', JSON.stringify(updated));
    } catch (e) {}

    // 3. Exclusão no banco de dados Supabase
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) {
        console.warn('Erro ao excluir aviso no Supabase:', error.message);
        if (error.message?.toLowerCase().includes('policy') || (error as any).code === '42501') {
          alert('Aviso excluído localmente. Para sincronizar a exclusão no banco de dados do Supabase, execute o script SQL das permissões de RLS.');
        }
      }
      await Promise.all([fetchData(), fetchHomeContent()]);
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'announcements' } }));
      } catch (e) {}
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleAddMinistry = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMinistryName.trim()) return;
    setIsMinistryLoading(true);

    try {
      const { error } = await supabase
        .from('ministries')
        .insert([{ name: newMinistryName.trim() }]);

      if (error) throw error;
      
      setNewMinistryName('');
      setIsAddingMinistry(false);
      fetchData();
    } catch (error) {
      console.error('Error adding ministry:', error);
      alert('Erro ao adicionar ministério. Verifique se o nome já existe.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleDeleteMinistry = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Ministério',
      message: 'Tem certeza que deseja excluir este ministério? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: async () => {
        setIsMinistryLoading(true);
        try {
          const { error } = await supabase
            .from('ministries')
            .delete()
            .match({ id });

          if (error) throw error;
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting ministry:', error);
          alert('Erro ao excluir ministério.');
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  const handleCreateCellGroup = async (e: FormEvent) => {
    e.preventDefault();
    setIsMinistryLoading(true);
    try {
      if (editingCellId) {
        const { error } = await supabase
          .from('cell_groups')
          .update(newCell)
          .eq('id', editingCellId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cell_groups')
          .insert([newCell]);
        if (error) throw error;
      }
      
      setIsAddingCell(false);
      setEditingCellId(null);
      setNewCell({
        name: '',
        leader: '',
        day: 'Terça-feira',
        time: '20:00',
        location: '',
        type: 'Misto'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving cell group:', error);
      alert('Erro ao salvar célula.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handleEditCell = (cell: CellGroup) => {
    setNewCell({
      name: cell.name,
      leader: cell.leader,
      day: cell.day,
      time: cell.time,
      location: cell.location,
      type: cell.type
    });
    setEditingCellId(cell.id);
    setIsAddingCell(true);
  };

  const handleDeleteCellGroup = async (cellId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Célula',
      message: 'Tem certeza que deseja excluir esta célula? Todos os dados vinculados serão perdidos.',
      type: 'danger',
      onConfirm: async () => {
        setIsMinistryLoading(true);
        try {
          const { error } = await supabase
            .from('cell_groups')
            .delete()
            .match({ id: cellId });

          if (error) throw error;
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting cell group:', error);
          alert('Erro ao excluir célula.');
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  const handleToggleLeadership = async (userId: string, ministryId: string) => {
    const existing = leadership.find(l => l.user_id === userId && l.ministry_id === ministryId);
    const isCurrentlyLeader = existing?.is_leader;

    setIsMinistryLoading(true);
    try {
      if (existing && isCurrentlyLeader) {
        // Se já é líder, removemos a liderança (torna voluntário)
        const { error } = await supabase
          .from('user_ministries')
          .update({ is_leader: false })
          .eq('user_id', userId)
          .eq('ministry_id', ministryId);
        if (error) throw error;
      } else {
        // Se não é líder ou não está no ministério, torna líder
        const { error } = await supabase
          .from('user_ministries')
          .upsert({ 
            user_id: userId, 
            ministry_id: ministryId, 
            is_leader: true 
          }, { onConflict: 'user_id,ministry_id' });
        if (error) throw error;
      }
      await fetchData();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      console.error('Error toggling leadership:', error);
      alert(`Erro ao atualizar liderança: ${error.message || 'Verifique suas permissões no Supabase'}`);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const handlePastorAddNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNoticeForPastors.title.trim() || !newNoticeForPastors.content.trim()) return;
    setIsMinistryLoading(true);
    try {
      const isGeneral = !selectedMinistryForNotice || selectedMinistryForNotice === 'general';
      const ministryObj = ministries.find(m => m.id === selectedMinistryForNotice);
      const categoryLabel = isGeneral ? 'Aviso Geral' : (ministryObj?.name ? `Ministério: ${ministryObj.name}` : 'Aviso');

      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + String(Date.now()).slice(-12).padStart(12, '0');

      // 1. Objeto completo do aviso
      const announcementPayload = {
        id: generatedId,
        title: newNoticeForPastors.title.trim(),
        description: newNoticeForPastors.content.trim(),
        date: new Date().toLocaleDateString('pt-BR'),
        category: categoryLabel,
        created_at: new Date().toISOString()
      };

      // 2. Atualização otimista imediata no estado de anúncios
      setAnnouncements(prev => [announcementPayload as any, ...prev.filter(a => a.id !== generatedId)]);

      // 3. Salvar no cache local para persistir entre recarregamentos até ser explicitamente excluído
      try {
        const cached = JSON.parse(localStorage.getItem('mevam_cached_announcements') || '[]');
        const updated = [announcementPayload, ...cached.filter((a: any) => a.id !== generatedId)];
        localStorage.setItem('mevam_cached_announcements', JSON.stringify(updated));
      } catch (e) {}

      // 4. Salvar no Supabase
      const { error: annError } = await supabase
        .from('announcements')
        .insert([announcementPayload]);
      if (annError) {
        console.warn('Erro ao inserir em announcements no Supabase (verifique RLS):', annError.message);
      }

      // 5. Se um ministério específico foi selecionado, salvar também em ministry_notices
      if (!isGeneral && selectedMinistryForNotice) {
        const { error: minError } = await supabase
          .from('ministry_notices')
          .insert([{
            ministry_id: selectedMinistryForNotice,
            title: newNoticeForPastors.title.trim(),
            content: newNoticeForPastors.content.trim(),
            date: new Date().toISOString().split('T')[0]
          }]);
        if (minError) {
          console.warn('Erro ao inserir em ministry_notices:', minError);
        }
      }

      // 6. Tocar o som oficial de notificação
      playNotificationSound();

      // 7. Salvar estado de notificação não lida para a home page
      try {
        localStorage.setItem('mevam_has_unread_notice', 'true');
        localStorage.setItem('mevam_latest_notice_timestamp', String(Date.now()));
      } catch (err) {}

      // 8. Sincronizar dados
      await Promise.all([fetchData(), fetchHomeContent()]);

      setNewNoticeForPastors({ title: '', content: '' });
      setSelectedMinistryForNotice('');
      setIsAddingNoticeForPastors(false);
      alert('Aviso publicado com sucesso! Ele foi adicionado à sessão Avisos da Página Inicial e Central com notificação sonora, e permanecerá até ser excluído.');
    } catch (error: any) {
      console.error('Error adding notice as pastor:', error);
      alert('Erro ao enviar aviso: ' + (error?.message || 'Falha ao salvar.'));
    } finally {
      setIsMinistryLoading(false);
    }
  };

  const tabs = [
    { id: 'pastores', name: 'Pastores (as)', icon: <ShieldCheck size={18} /> },
    { id: 'congressos', name: 'Congressos', icon: <ClipboardList size={18} /> },
    { id: 'secretaria', name: 'Secretaria', icon: <FileText size={18} /> },
    { id: 'cantina', name: 'Cantina', icon: <Coffee size={18} /> },
  ];

  const getMinistryLeaders = (ministryId: string) => {
    const leaderIds = leadership.filter(l => l.ministry_id === ministryId && l.is_leader).map(l => l.user_id);
    return profiles.filter(p => leaderIds.includes(p.id));
  };

  const userLedMinistries = (userRole === 'admin' || userRole === 'pastor') 
    ? ministries 
    : ministries.filter(m => 
        leadership.some(l => l.user_id === currentUser?.id && l.ministry_id === m.id)
      );

  const currentSelectedMinistry = ministries.find(m => m.id === selectedMinistryForManagement?.id);

  const handleUpdateMinistryDescription = async () => {
    if (!selectedMinistryForManagement) return;
    setIsMinistryLoading(true);
    try {
      const { error } = await supabase
        .from('ministries')
        .update({ description: ministryDescriptionInput.trim() })
        .eq('id', selectedMinistryForManagement.id);

      if (error) throw error;

      setEditingDescription(false);
      await fetchData();
    } catch (err) {
      console.error('Erro ao atualizar descrição do ministério:', err);
      alert('Erro ao atualizar a descrição do ministério.');
    } finally {
      setIsMinistryLoading(false);
    }
  };

  return (
    <div className="py-24 bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <button 
            onClick={onBack}
            className="flex items-center text-stone-500 hover:text-primary transition-colors font-medium group"
          >
            <ChevronRight className="rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Voltar para o Início
          </button>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-stone-900">Pastores (as)</h1>
            <p className="text-stone-500 text-sm">Gestão e administração ministerial</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-stone-100 overflow-hidden min-h-[600px] flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-72 bg-stone-50/50 border-b lg:border-b-0 lg:border-r border-stone-100 p-4 lg:p-6 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
            <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedMinistryForManagement(null);
                  }}
                  className={`flex-shrink-0 lg:w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' 
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 md:p-12 relative">
            {isDashboardLoading && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-stone-200 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-stone-500 text-sm font-medium">Carregando dados...</p>
                </div>
              </div>
            )}

            {fetchError && (
              <div className="absolute inset-0 z-50 bg-white flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center">
                  {fetchError.includes('Acesso Restrito') ? (
                    <>
                      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-stone-900 mb-2">Acesso Restrito</h3>
                      <p className="text-stone-600 mb-8 leading-relaxed">
                        Esta área é exclusiva para pastores, secretaria e administradores da Mevam Itapema Sertão.
                      </p>
                      <div className="space-y-3">
                        <button 
                          onClick={onBack}
                          className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                        >
                          Voltar para Home
                        </button>
                        <button 
                          onClick={async () => {
                            await supabase.auth.signOut();
                            if (onGoToLogin) {
                              onGoToLogin();
                            } else {
                              onBack();
                            }
                          }}
                          className="w-full bg-stone-100 text-stone-600 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut size={20} />
                          Sair da Conta
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-stone-900 mb-2">Erro de Conexão</h3>
                      <p className="text-stone-600 mb-8 leading-relaxed">
                        {fetchError}
                      </p>
                      <div className="space-y-3">
                        <button 
                          onClick={fetchData}
                          className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                        >
                          Tentar Novamente
                        </button>
                        <button 
                          onClick={() => {
                            if (fetchError?.includes('não autenticado') && onGoToLogin) {
                              onGoToLogin();
                            } else {
                              onBack();
                            }
                          }}
                          className="w-full bg-stone-100 text-stone-600 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                        >
                          {fetchError?.includes('não autenticado') ? 'Ir para o Login' : 'Voltar para Home'}
                        </button>
                      </div>
                      <div className="mt-8 p-4 bg-stone-50 rounded-2xl border border-stone-100 text-left">
                        <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-2">Dica Técnica:</p>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Este erro geralmente ocorre se as tabelas não foram criadas no Supabase. 
                          Certifique-se de copiar o conteúdo do arquivo <code className="bg-stone-200 px-1 rounded">supabase_schema.sql</code> e executá-lo no <strong>SQL Editor</strong> do seu painel Supabase.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <AnimatePresence>
              {isManagingLeadership && selectedMinistryForLeadership && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-white p-8 md:p-12 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold">Atribuir Liderança</h3>
                      <p className="text-stone-500">
                        Ministério: <span className="font-bold text-stone-900">{ministries.find(m => m.id === selectedMinistryForLeadership)?.name}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsManagingLeadership(false);
                        setSelectedMinistryForLeadership(null);
                      }}
                      className="bg-stone-100 p-2 rounded-full hover:bg-stone-200 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Buscar membro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {profiles
                        .filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((profile) => {
                        const ministryRecord = leadership.find(l => l.user_id === profile.id && l.ministry_id === selectedMinistryForLeadership);
                        const isInMinistry = !!ministryRecord;
                        const isLeader = ministryRecord?.is_leader;
                        
                        return (
                          <div 
                            key={profile.id}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              isLeader ? 'bg-primary/5 border-primary/20' : 
                              isInMinistry ? 'bg-stone-50 border-stone-200' : 
                              'bg-white border-stone-100 hover:border-stone-200'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                isLeader ? 'bg-primary text-white' : 'bg-stone-100 text-stone-500'
                              }`}>
                                {profile.full_name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-stone-900">{profile.full_name}</p>
                                  {isLeader && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">Líder</span>}
                                  {isInMinistry && !isLeader && <span className="text-[9px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Voluntário</span>}
                                </div>
                                <p className="text-xs text-stone-400 uppercase tracking-widest">{profile.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => {
                                  if (!isLeader) {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Atribuir Liderança',
                                      message: `Deseja tornar ${profile.full_name} líder deste ministério?`,
                                      type: 'primary',
                                      onConfirm: () => handleToggleLeadership(profile.id, selectedMinistryForLeadership!)
                                    });
                                  } else {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Remover Liderança',
                                      message: `Deseja remover a liderança de ${profile.full_name}? Ele continuará como voluntário no ministério.`,
                                      type: 'danger',
                                      onConfirm: () => handleToggleLeadership(profile.id, selectedMinistryForLeadership!)
                                    });
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  isLeader 
                                    ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' 
                                    : 'bg-stone-900 text-white hover:bg-black'
                                }`}
                                title={isLeader ? "Remover Liderança" : "Tornar Líder"}
                              >
                                {isLeader ? 'Remover Liderança' : 'Tornar Líder'}
                              </button>
                              {isInMinistry && (
                                <button 
                                  onClick={() => {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Remover do Ministério',
                                      message: `Deseja remover ${profile.full_name} deste ministério?`,
                                      type: 'danger',
                                      onConfirm: async () => {
                                        try {
                                          const { error } = await supabase
                                            .from('user_ministries')
                                            .delete()
                                            .match({ user_id: profile.id, ministry_id: selectedMinistryForLeadership });
                                          if (error) throw error;
                                          await fetchData();
                                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        } catch (error: any) {
                                          alert('Erro ao remover do ministério: ' + error.message);
                                        }
                                      }
                                    });
                                  }}
                                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title="Remover do Ministério"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              key={activeTab + (selectedMinistryForManagement?.id || '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'pastores' && (
                <div className="space-y-12">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Pastores (as)</h2>
                        <p className="text-stone-500">Visão geral e gestão ministerial</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPastorViewTab('cultos')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                      title="Atalho direto para alterar nossos cultos e programação"
                    >
                      <Clock size={16} />
                      <span>Alterar Cultos & Programação</span>
                    </button>
                  </div>

                  {/* Privacy & Stats Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    <div className="bg-stone-900 text-white p-6 rounded-[32px] flex items-center justify-between overflow-hidden relative">
                      <div className="relative z-10">
                        <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Impacto da Plataforma</p>
                        <h4 className="text-3xl font-black italic tracking-tight">
                          {pageVisits.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()} <span className="text-sm font-normal text-stone-500 not-italic">Acessos Totais</span>
                        </h4>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl">
                        <TrendingUp size={24} className="text-primary" />
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 rounded-full" />
                    </div>

                    <div className="bg-white border border-stone-100 p-6 rounded-[32px] flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-sm">Privacidade Ativa</p>
                        <p className="text-xs text-stone-500 leading-tight">IPs anonimizados e dados PII saneados antes da persistência.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pastor View Tabs - Responsive Grid/Scroll */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-3 mb-12">
                    {[
                      { id: 'cultos', name: 'Cultos & Programação', icon: <Clock size={20} />, color: 'bg-amber-50 text-amber-700' },
                      { id: 'notices', name: 'Avisos', icon: <MessageCircle size={20} />, color: 'bg-amber-50 text-amber-600' },
                      { id: 'reports', name: 'Relatórios', icon: <FileText size={20} />, color: 'bg-blue-50 text-blue-600' },
                      { id: 'scales', name: 'Escalas', icon: <Calendar size={20} />, color: 'bg-indigo-50 text-indigo-600' },
                      { id: 'team', name: 'Equipes', icon: <Users size={20} />, color: 'bg-purple-50 text-purple-600' },
                      { id: 'ministries', name: 'Ministérios', icon: <Layout size={20} />, color: 'bg-emerald-50 text-emerald-600' },
                      { id: 'cells', name: 'Células', icon: <Home size={20} />, color: 'bg-rose-50 text-rose-600' },
                      { id: 'prayer', name: 'Oração', icon: <Heart size={20} />, color: 'bg-pink-50 text-pink-600' },
                      { id: 'media', name: 'Repositório Semanal', icon: <FolderArchive size={20} />, color: 'bg-cyan-50 text-cyan-600' },
                      { id: 'carousel', name: 'Carrossel Home', icon: <Image size={20} />, color: 'bg-orange-50 text-orange-600' }
                    ].map((tab) => {
                      const isNotices = tab.id === 'notices';
                      const isCultos = tab.id === 'cultos';
                      const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
                      const cultosCount = isCultos ? (isServicesInit ? (churchServices?.length || 0) : (churchServices && churchServices.length > 0 ? churchServices.length : DEFAULT_CHURCH_SERVICES.length)) : 0;
                      const noticeCount = isNotices ? (announcements.length + allNotices.length) : 0;
                      const isCurrentActive = pastorViewTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPastorViewTab(tab.id as any)}
                          className={`relative flex flex-col items-center justify-center p-4 rounded-[24px] transition-all border-2 ${
                            isCurrentActive 
                              ? ((isNotices || isCultos)
                                  ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-lg shadow-amber-500/10 scale-[1.02]' 
                                  : 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10 scale-[1.02]')
                              : 'border-transparent bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                          } lg:flex-row lg:px-6 lg:py-3 lg:gap-3 lg:justify-start lg:min-w-[160px] cursor-pointer`}
                        >
                          <div className={`p-2 rounded-xl mb-2 lg:mb-0 transition-colors ${
                            isCurrentActive 
                              ? ((isNotices || isCultos) ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-primary text-white') 
                              : tab.color
                          }`}>
                            {tab.icon}
                          </div>
                          <span className="text-xs lg:text-sm font-bold whitespace-nowrap">{tab.name}</span>
                          {isNotices && noticeCount > 0 && (
                            <span className="lg:ml-auto inline-flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white min-w-[18px] shadow-sm">
                              {noticeCount}
                            </span>
                          )}
                          {isCultos && cultosCount > 0 && (
                            <span className="lg:ml-auto inline-flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 min-w-[18px] shadow-sm">
                              {cultosCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-8">
                    {pastorViewTab === 'reports' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold">Relatórios de Ministérios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {allReports.length > 0 ? allReports.map(report => (
                            <div key={report.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-stone-900">{report.ministry_name}</h4>
                                  <p className="text-sm text-primary font-medium">Relatório de {report.month}</p>
                                </div>
                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest mb-1">Eventos Realizados</p>
                                  <p className="text-stone-700">{report.events_held}</p>
                                </div>
                                <div>
                                  <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest mb-1">Média de Participantes</p>
                                  <p className="text-stone-700">{report.avg_participants}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest mb-1">Pontos Positivos</p>
                                  <p className="text-stone-700">{report.positive_points}</p>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                              <p className="text-stone-400 italic">Nenhum relatório enviado pelos ministérios.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'scales' && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-bold mb-6">Escalas de Ministérios</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allScales.length > 0 ? allScales.map(scale => (
                              <div key={scale.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-primary">
                                    <Calendar size={20} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-stone-800">{scale.ministry_name}</p>
                                    <p className="text-xs text-stone-500">{new Date(scale.date).toLocaleDateString('pt-BR')} - {scale.role}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-stone-700">{scale.user_name}</p>
                                  <p className="text-[10px] text-stone-400">{scale.description}</p>
                                </div>
                              </div>
                            )) : (
                              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                <p className="text-stone-400 italic">Nenhuma escala definida.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {ministryUnavailabilities.length > 0 && (
                          <div className="pt-8 border-t border-stone-100">
                            <div className="flex items-center space-x-2 mb-6">
                              <AlertCircle className="text-amber-500" size={20} />
                              <h3 className="text-xl font-bold">Indisponibilidades de Membros</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {ministryUnavailabilities.map((unavail, idx) => (
                                <div key={idx} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-bold text-stone-900">{profiles.find(p => p.id === unavail.user_id)?.full_name || 'Membro'}</p>
                                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{ministries.find(m => m.id === unavail.ministry_id)?.name}</p>
                                    </div>
                                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-amber-100">
                                      {new Date(unavail.date).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-600 italic">"{unavail.reason}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {pastorViewTab === 'team' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold">Equipes de Voluntários</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ministries.map(ministry => {
                            const members = allMinistryMembers.filter(m => m.ministry_id === ministry.id);
                            if (members.length === 0) return null;
                            return (
                              <div key={ministry.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                                <h4 className="font-bold text-stone-900 mb-4 border-b border-stone-50 pb-2">{ministry.name}</h4>
                                <div className="space-y-3">
                                  {members.map(member => (
                                    <div key={member.user_id} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center text-xs font-bold text-stone-500">
                                          {member.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-stone-800">{member.full_name}</p>
                                          <p className="text-[10px] text-stone-400">{member.whatsapp}</p>
                                        </div>
                                      </div>
                                      {member.is_leader && (
                                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">Líder</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'cultos' && (
                      <div className="space-y-6">
                        {/* Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-5 rounded-3xl border border-amber-200/80 shadow-xs">
                          <div>
                            <div className="flex items-center gap-2.5 mb-1.5">
                              <span className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 font-black shadow-sm">
                                <Clock size={22} />
                              </span>
                              <div>
                                <h3 className="text-xl font-bold text-stone-900 leading-tight">Nossos Cultos & Programação</h3>
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                                  Exibido no modal da Página Inicial
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed mt-1">
                              Gerencie os cultos e encontros semanais da MEVAM Itapema Sertão. Altere horários, dias da semana, descrições e categorias. As alterações são sincronizadas com a tabela <code className="bg-amber-100/60 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">church_services</code> no Supabase.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setShowSqlCultosModal(true)}
                              className="px-3.5 py-2.5 rounded-xl border border-amber-300 hover:bg-amber-100/70 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer bg-white/80 shadow-2xs"
                              title="Ver código SQL para criar a tabela church_services"
                            >
                              <Database size={15} className="text-amber-600" />
                              <span>SQL Supabase</span>
                            </button>
                            <button 
                              type="button"
                              onClick={handleOpenAddCulto}
                              className="bg-amber-500 text-stone-950 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                            >
                              <Plus size={16} />
                              <span>Novo Culto / Programação</span>
                            </button>
                          </div>
                        </div>

                        {/* SQL Supabase Modal */}
                        {showSqlCultosModal && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-800">
                                    <Database size={20} />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-stone-900 text-base">Script SQL - Tabela church_services</h4>
                                    <p className="text-xs text-stone-500">Crie a tabela e as políticas de segurança (RLS) no Supabase</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSqlCultosModal(false)}
                                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition cursor-pointer"
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                  <span>ℹ️</span> Como implantar no seu banco Supabase:
                                </p>
                                <ol className="list-decimal list-inside space-y-0.5 text-stone-700 pl-1">
                                  <li>Abra o painel do seu projeto no Supabase (<strong className="text-stone-900">supabase.com/dashboard</strong>).</li>
                                  <li>Acesse a aba <strong className="text-stone-900">SQL Editor</strong> no menu lateral esquerdo.</li>
                                  <li>Clique no botão abaixo para copiar o script, cole no editor e clique em <strong className="text-emerald-700">Run</strong>.</li>
                                </ol>
                              </div>

                              <div className="relative flex-1 bg-stone-900 rounded-2xl p-4 overflow-x-auto text-xs font-mono text-emerald-400 max-h-[320px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sql = `-- ====================================================================
-- MEVAM ITAPEMA: TABELA DE CULTOS & PROGRAMAÇÃO (SUPABASE / POSTGRESQL)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Criação da tabela de cultos e programação
CREATE TABLE IF NOT EXISTS public.church_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  day_short VARCHAR(10) NOT NULL DEFAULT 'DOM',
  time TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_text TEXT DEFAULT '',
  color TEXT DEFAULT 'amber',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita Segurança por Nível de Linha (Row Level Security)
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de políticas prévias
DROP POLICY IF EXISTS "Public can view church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable insert for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable update for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable delete for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can insert church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can update church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can delete church_services" ON public.church_services;

-- 4. Criação das políticas de acesso (leitura pública, escrita só admin/pastor)
CREATE POLICY "Public can view church_services"
  ON public.church_services FOR SELECT USING (true);

CREATE POLICY "Staff can insert church_services"
  ON public.church_services FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can update church_services"
  ON public.church_services FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

CREATE POLICY "Staff can delete church_services"
  ON public.church_services FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

-- 5. Inserção dos cultos oficiais iniciais da MEVAM Itapema Sertão
INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT 
  'Culto da Família', 
  'Domingo', 
  'DOM', 
  '19h00', 
  'Celebração com toda a igreja, louvor congregacional, mensagem inspiradora e salinhas para crianças no MEVAM Kids.', 
  'Presencial + MEVAM Kids', 
  'amber', 
  1, 
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Culto da Família');

INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT 
  'Células nos Lares', 
  'Terça-feira', 
  'TER', 
  '20h00', 
  'Encontros de comunhão, amizade e estudo da Palavra de Deus em diversos bairros e residências.', 
  'Pequenos Grupos', 
  'stone', 
  2, 
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Células nos Lares');

INSERT INTO public.church_services (title, day_of_week, day_short, time, description, badge_text, color, order_index, is_active)
SELECT 
  'Culto de Oração & Ensino', 
  'Quinta-feira', 
  'QUI', 
  '20h00', 
  'Momento precioso de intercessão coletiva, clamor pelas famílias e edificação doutrinária.', 
  'Doutrina & Clamor', 
  'stone', 
  3, 
  true
WHERE NOT EXISTS (SELECT 1 FROM public.church_services WHERE title = 'Culto de Oração & Ensino');

-- 6. Habilitar Realtime para sincronização em tempo real com o frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_services;`;
                                    navigator.clipboard.writeText(sql);
                                    setSqlCultosCopied(true);
                                    setTimeout(() => setSqlCultosCopied(false), 2500);
                                  }}
                                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-sans text-xs font-bold flex items-center gap-1.5 shadow border border-stone-700 transition cursor-pointer"
                                >
                                  {sqlCultosCopied ? (
                                    <>
                                      <Check size={14} className="text-emerald-400" />
                                      <span>Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} />
                                      <span>Copiar SQL</span>
                                    </>
                                  )}
                                </button>
                                <pre className="whitespace-pre">{`-- MEVAM ITAPEMA: TABELA DE CULTOS & PROGRAMAÇÃO (SUPABASE)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.church_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  day_short VARCHAR(10) NOT NULL DEFAULT 'DOM',
  time TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_text TEXT DEFAULT '',
  color TEXT DEFAULT 'amber',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable insert for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable update for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Enable delete for church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can insert church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can update church_services" ON public.church_services;
DROP POLICY IF EXISTS "Staff can delete church_services" ON public.church_services;

CREATE POLICY "Public can view church_services" ON public.church_services FOR SELECT USING (true);
CREATE POLICY "Staff can insert church_services" ON public.church_services FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can update church_services" ON public.church_services FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can delete church_services" ON public.church_services FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));`}</pre>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowSqlCultosModal(false)}
                                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer"
                                >
                                  Entendido / Fechar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Add / Edit Culto Modal */}
                        {isAddingCulto && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-800">
                                    <Clock size={20} />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-stone-900 text-base">
                                      {isEditingCulto ? 'Editar Culto / Programação' : 'Novo Culto / Programação'}
                                    </h4>
                                    <p className="text-xs text-stone-500">Configure as informações que serão exibidas aos visitantes e membros</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingCulto(false);
                                    setIsEditingCulto(false);
                                    setCultoToEdit(null);
                                  }}
                                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition cursor-pointer"
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              <form onSubmit={handleSaveCulto} className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Título do Culto / Encontro *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={cultoForm.title}
                                    onChange={(e) => setCultoForm({ ...cultoForm, title: e.target.value })}
                                    placeholder="Ex: Culto da Família, Células nos Lares, Conexão Jovem"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Dia da Semana *
                                    </label>
                                    <select
                                      value={cultoForm.day_of_week}
                                      onChange={(e) => {
                                        const dow = e.target.value;
                                        const shortMap: Record<string, string> = {
                                          'Domingo': 'DOM',
                                          'Segunda-feira': 'SEG',
                                          'Terça-feira': 'TER',
                                          'Quarta-feira': 'QUA',
                                          'Quinta-feira': 'QUI',
                                          'Sexta-feira': 'SEX',
                                          'Sábado': 'SÁB'
                                        };
                                        setCultoForm({ 
                                          ...cultoForm, 
                                          day_of_week: dow,
                                          day_short: shortMap[dow] || dow.substring(0, 3).toUpperCase()
                                        });
                                      }}
                                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                                    >
                                      <option value="Domingo">Domingo</option>
                                      <option value="Segunda-feira">Segunda-feira</option>
                                      <option value="Terça-feira">Terça-feira</option>
                                      <option value="Quarta-feira">Quarta-feira</option>
                                      <option value="Quinta-feira">Quinta-feira</option>
                                      <option value="Sexta-feira">Sexta-feira</option>
                                      <option value="Sábado">Sábado</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Sigla do Dia (3 letras)
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={5}
                                      value={cultoForm.day_short}
                                      onChange={(e) => setCultoForm({ ...cultoForm, day_short: e.target.value.toUpperCase() })}
                                      placeholder="DOM"
                                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Horário *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={cultoForm.time}
                                      onChange={(e) => setCultoForm({ ...cultoForm, time: e.target.value })}
                                      placeholder="19h00 ou 20h00"
                                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Selo / Destaque (Badge)
                                    </label>
                                    <input
                                      type="text"
                                      value={cultoForm.badge_text}
                                      onChange={(e) => setCultoForm({ ...cultoForm, badge_text: e.target.value })}
                                      placeholder="Ex: Presencial + Kids, Pequenos Grupos"
                                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Estilo Visual
                                    </label>
                                    <select
                                      value={cultoForm.color}
                                      onChange={(e) => setCultoForm({ ...cultoForm, color: e.target.value })}
                                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                                    >
                                      <option value="amber">Dourado / Âmbar (Destaque Principal)</option>
                                      <option value="stone">Neutro / Grafite Elegante</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Descrição Detalhada
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={cultoForm.description}
                                    onChange={(e) => setCultoForm({ ...cultoForm, description: e.target.value })}
                                    placeholder="Descreva a dinâmica do culto, ministração, recepção e atividades..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                                  <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">
                                      Ordem de Exibição
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={cultoForm.order_index}
                                      onChange={(e) => setCultoForm({ ...cultoForm, order_index: Number(e.target.value) || 1 })}
                                      className="w-24 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2 pt-4">
                                    <input
                                      type="checkbox"
                                      id="culto_is_active"
                                      checked={cultoForm.is_active}
                                      onChange={(e) => setCultoForm({ ...cultoForm, is_active: e.target.checked })}
                                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                                    />
                                    <label htmlFor="culto_is_active" className="text-xs font-bold text-stone-800 cursor-pointer">
                                      Ativo na Página Inicial
                                    </label>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingCulto(false);
                                      setIsEditingCulto(false);
                                      setCultoToEdit(null);
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                                  >
                                    {isEditingCulto ? 'Salvar Alterações' : 'Criar Culto'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}

                        {/* List of Cultos */}
                        {(() => {
                          const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
                          const displayedCultos = isServicesInit 
                            ? (churchServices || []) 
                            : (Array.isArray(churchServices) && churchServices.length > 0 ? churchServices : DEFAULT_CHURCH_SERVICES);

                          if (displayedCultos.length === 0) {
                            return (
                              <div className="py-16 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200 p-8 space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                                  <Clock size={28} />
                                </div>
                                <h4 className="font-bold text-stone-900 text-base">Nenhum culto ou programação cadastrado</h4>
                                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                                  Todos os itens foram excluídos ou a programação está vazia. Clique no botão abaixo para adicionar os cultos da igreja.
                                </p>
                                <button
                                  type="button"
                                  onClick={handleOpenAddCulto}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 transition shadow-sm cursor-pointer"
                                >
                                  <Plus size={15} />
                                  <span>Novo Culto / Programação</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {displayedCultos.map((culto, idx) => {
                                const isAmber = culto.color === 'amber' || idx === 0;
                                const isActive = culto.is_active !== false;

                                return (
                                  <div
                                    key={culto.id || idx}
                                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                                      isActive
                                        ? (isAmber 
                                            ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300/80 shadow-xs' 
                                            : 'bg-white border-stone-200 shadow-xs')
                                        : 'bg-stone-100/60 border-stone-200 opacity-60'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 tracking-wider shadow-xs ${
                                            isAmber 
                                              ? 'bg-amber-500 text-stone-950' 
                                              : 'bg-stone-800 text-white'
                                          }`}>
                                            {culto.day_short || culto.day_of_week?.substring(0, 3).toUpperCase() || 'CUL'}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                                                {culto.day_of_week}
                                              </span>
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                isAmber ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-800'
                                              }`}>
                                                {culto.time}
                                              </span>
                                            </div>
                                            <h4 className="font-bold text-stone-900 text-base leading-snug mt-0.5">
                                              {culto.title}
                                            </h4>
                                          </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isActive 
                                            ? 'bg-emerald-100 text-emerald-800' 
                                            : 'bg-stone-200 text-stone-600'
                                        }`}>
                                          {isActive ? 'Ativo' : 'Oculto'}
                                        </span>
                                      </div>

                                      {culto.badge_text && (
                                        <div className="mb-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200 shadow-2xs">
                                            {culto.badge_text}
                                          </span>
                                        </div>
                                      )}

                                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 whitespace-pre-line mt-2">
                                        {culto.description}
                                      </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-stone-400">
                                        Posição: #{culto.order_index ?? idx + 1}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCultoActive(culto)}
                                          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                                          title={isActive ? 'Ocultar da Página Inicial' : 'Ativar na Página Inicial'}
                                        >
                                          {isActive ? <Eye size={15} /> : <EyeOff size={15} className="text-stone-400" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditCulto(culto)}
                                          className="p-2 rounded-xl text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 transition cursor-pointer"
                                          title="Editar culto"
                                        >
                                          <Edit2 size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCultoToDelete(culto)}
                                          className="p-2.5 rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/60 hover:border-rose-300 transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center group"
                                          title="Excluir culto e programação"
                                          aria-label="Excluir culto e programação"
                                        >
                                          <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Modal de Confirmação para Evitar Exclusão Acidental de Culto */}
                        {cultoToDelete && (
                          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm">
                            <div className="relative w-full max-w-md bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 text-stone-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
                              
                              <div className="flex items-start gap-3.5 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                                  <AlertTriangle size={26} />
                                </div>
                                <div className="flex-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-0.5">
                                    Confirmação de Exclusão
                                  </span>
                                  <h3 className="text-lg font-bold text-stone-900 leading-tight">
                                    Excluir Culto / Programação?
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  disabled={isDeletingCulto}
                                  onClick={() => setCultoToDelete(null)}
                                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer disabled:opacity-50"
                                  title="Fechar"
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Item a ser excluído:</span>
                                <h4 className="text-base font-bold text-stone-900 mb-1.5">{cultoToDelete.title}</h4>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                    {cultoToDelete.day_of_week} às {cultoToDelete.time}
                                  </span>
                                  {cultoToDelete.badge_text && (
                                    <span className="text-stone-600 bg-stone-200/70 px-2.5 py-0.5 rounded-full">
                                      {cultoToDelete.badge_text}
                                    </span>
                                  )}
                                </div>
                                {cultoToDelete.description && (
                                  <p className="text-xs text-stone-500 line-clamp-2 mt-2 italic">
                                    "{cultoToDelete.description}"
                                  </p>
                                )}
                              </div>

                              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 leading-relaxed mb-6">
                                <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
                                  <ShieldAlert size={14} className="shrink-0" />
                                  <span>Ação Irreversível</span>
                                </div>
                                Para evitar cliques acidentais, confirme sua decisão. O item será excluído e removido imediatamente da programação da igreja no aplicativo em tempo real.
                              </div>

                              <div className="flex items-center justify-end gap-3">
                                <button
                                  type="button"
                                  disabled={isDeletingCulto}
                                  onClick={() => setCultoToDelete(null)}
                                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingCulto}
                                  onClick={handleConfirmDeleteCulto}
                                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-rose-600/20 disabled:opacity-50"
                                >
                                  {isDeletingCulto ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>Excluindo...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 size={16} />
                                      <span>Sim, Excluir</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {pastorViewTab === 'notices' && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-200/60">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                                <BellRing size={20} />
                              </span>
                              <h3 className="text-xl font-bold text-stone-900">Avisos & Notificações</h3>
                            </div>
                            <p className="text-xs text-stone-600">
                              Os avisos criados aqui aparecem no ícone de Avisos da Página Inicial com notificação sonora. A exclusão de avisos é restrita exclusivamente a pastores.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setShowSqlNoticeModal(true)}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                              title="Visualizar script SQL para liberar exclusão e criação no Supabase"
                            >
                              <Database size={15} className="text-stone-600" />
                              <span>SQL Supabase</span>
                            </button>
                            <button
                              type="button"
                              onClick={playNotificationSound}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                              title="Ouvir som oficial de notificação"
                            >
                              <Volume2 size={16} className="text-amber-600" />
                              <span>Ouvir Som</span>
                            </button>
                            <button 
                              onClick={() => setIsAddingNoticeForPastors(true)}
                              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 cursor-pointer active:scale-95"
                            >
                              <Plus size={18} className="mr-1.5" />
                              Novo Aviso
                            </button>
                          </div>
                        </div>

                        {showSqlNoticeModal && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] overflow-hidden flex flex-col">
                              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Database size={20} />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-stone-900 text-base">Script SQL de Permissões (Supabase)</h4>
                                    <p className="text-xs text-stone-500">Libera exclusão, inserção e consulta para Avisos e Comunicados</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSqlNoticeModal(false)}
                                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition"
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              <p className="text-xs text-stone-600 leading-relaxed">
                                Se você observar que a exclusão não persiste no Supabase após atualizar a página, execute o script SQL abaixo no <strong className="text-stone-800">SQL Editor</strong> do painel do Supabase. Ele configura as políticas de RLS (<span className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">Row Level Security</span>) para permitir exclusão e criação sem bloqueios:
                              </p>

                              <div className="relative flex-1 bg-stone-900 rounded-2xl p-4 overflow-x-auto text-xs font-mono text-emerald-400 max-h-[300px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sql = `-- MEVAM ITAPEMA: LIBERAÇÃO COMPLETA DE AVISOS & RLS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable insert for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable update for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable delete for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete announcements" ON public.announcements;

CREATE POLICY "Public can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Staff can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can update announcements" ON public.announcements FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can delete announcements" ON public.announcements FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

ALTER TABLE public.ministry_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable insert for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable delete for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON public.ministry_notices;

CREATE POLICY "Public can view ministry notices" ON public.ministry_notices FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry notices" ON public.ministry_notices FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR EXISTS (SELECT 1 FROM public.user_ministries um WHERE um.ministry_id = ministry_notices.ministry_id AND um.user_id = auth.uid() AND um.is_leader = true)) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR EXISTS (SELECT 1 FROM public.user_ministries um WHERE um.ministry_id = ministry_notices.ministry_id AND um.user_id = auth.uid() AND um.is_leader = true));

-- Habilitar Realtime para avisos e comunicados
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ministry_notices;`;
                                    navigator.clipboard.writeText(sql);
                                    setSqlCopied(true);
                                    setTimeout(() => setSqlCopied(false), 2500);
                                  }}
                                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-sans text-xs font-bold flex items-center gap-1.5 shadow border border-stone-700 transition cursor-pointer"
                                >
                                  {sqlCopied ? (
                                    <>
                                      <Check size={14} className="text-emerald-400" />
                                      <span>Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} />
                                      <span>Copiar SQL</span>
                                    </>
                                  )}
                                </button>
                                <pre className="whitespace-pre">{`-- MEVAM ITAPEMA: LIBERAÇÃO COMPLETA DE AVISOS & RLS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable insert for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable update for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable delete for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete announcements" ON public.announcements;

CREATE POLICY "Public can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Staff can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can update announcements" ON public.announcements FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor')) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));
CREATE POLICY "Staff can delete announcements" ON public.announcements FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor'));

ALTER TABLE public.ministry_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable insert for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Enable delete for ministry notices" ON public.ministry_notices;
DROP POLICY IF EXISTS "Leaders can manage ministry notices" ON public.ministry_notices;

CREATE POLICY "Public can view ministry notices" ON public.ministry_notices FOR SELECT USING (true);
CREATE POLICY "Leaders can manage ministry notices" ON public.ministry_notices FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR EXISTS (SELECT 1 FROM public.user_ministries um WHERE um.ministry_id = ministry_notices.ministry_id AND um.user_id = auth.uid() AND um.is_leader = true)) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'pastor') OR EXISTS (SELECT 1 FROM public.user_ministries um WHERE um.ministry_id = ministry_notices.ministry_id AND um.user_id = auth.uid() AND um.is_leader = true));`}</pre>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowSqlNoticeModal(false)}
                                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-black transition cursor-pointer"
                                >
                                  Fechar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isAddingNoticeForPastors && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 bg-white rounded-2xl border-2 border-amber-500/30 shadow-xl space-y-4"
                          >
                            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                              <h4 className="font-bold text-base text-stone-900 flex items-center gap-2">
                                <Bell size={18} className="text-amber-500" />
                                <span>Publicar Novo Aviso com Notificação</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() => setIsAddingNoticeForPastors(false)}
                                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
                              >
                                <X size={18} />
                              </button>
                            </div>

                            <form onSubmit={handlePastorAddNotice} className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                  Destino do Aviso
                                </label>
                                <select 
                                  value={selectedMinistryForNotice}
                                  onChange={(e) => setSelectedMinistryForNotice(e.target.value)}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium"
                                >
                                  <option value="general">📢 Notificação Geral na Página Inicial (Todos os Membros e Visitantes)</option>
                                  <optgroup label="Ministérios (também replica no ícone da Página Inicial)">
                                    {ministries.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                  Título do Comunicado
                                </label>
                                <input 
                                  type="text" 
                                  value={newNoticeForPastors.title}
                                  onChange={(e) => setNewNoticeForPastors({...newNoticeForPastors, title: e.target.value})}
                                  placeholder="Ex: Culto de Celebração Especial, Ensaio Geral, Reunião de Líderes..."
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                  Mensagem do Aviso
                                </label>
                                <textarea 
                                  value={newNoticeForPastors.content}
                                  onChange={(e) => setNewNoticeForPastors({...newNoticeForPastors, content: e.target.value})}
                                  placeholder="Escreva os detalhes, orientações, horários ou informações do aviso..."
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/30 min-h-[110px] text-sm"
                                  required
                                />
                              </div>

                              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                                    <Volume2 size={16} />
                                  </span>
                                  <div>
                                    <p className="text-xs font-bold text-amber-950">Som de Notificação Ativado</p>
                                    <p className="text-[11px] text-amber-800">"É pra glorificar de pé, igreja!" tocará na publicação e para os membros.</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={playNotificationSound}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <Play size={12} /> Testar
                                </button>
                              </div>

                              <div className="flex gap-3 justify-end pt-2">
                                <button 
                                  type="button"
                                  onClick={() => setIsAddingNoticeForPastors(false)}
                                  className="bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit"
                                  disabled={isMinistryLoading}
                                  className="bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all disabled:opacity-50 flex items-center shadow-md cursor-pointer"
                                >
                                  {isMinistryLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <BellRing size={16} className="mr-2 text-amber-400" />}
                                  Publicar e Notificar Home
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                            Avisos Ativos na Central & Página Inicial ({announcements.length + allNotices.length})
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {announcements.map((ann) => (
                              <div key={ann.id} className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm hover:border-amber-400/60 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center gap-1">
                                    <Bell size={10} /> Página Inicial • {ann.category || 'Geral'}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                    className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1.5 px-2 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                    title="Excluir este aviso definitivamente"
                                  >
                                    <Trash2 size={15} />
                                    <span className="text-[11px] font-bold text-red-600">Excluir</span>
                                  </button>
                                </div>
                                <h5 className="font-bold text-stone-900 text-base mb-1">{ann.title}</h5>
                                <p className="text-sm text-stone-600 line-clamp-3 whitespace-pre-line">{ann.description}</p>
                                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                                  <span>{ann.date || 'Recente'}</span>
                                  <button
                                    onClick={playNotificationSound}
                                    className="text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Volume2 size={13} /> Testar Som
                                  </button>
                                </div>
                              </div>
                            ))}

                            {allNotices.map((notice) => (
                              <div key={notice.id} className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm hover:border-primary/40 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                                    Ministério: {notice.ministry_name || 'Equipe'}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteNoticeSec(notice.id)}
                                    className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1.5 px-2 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                    title="Excluir aviso do ministério"
                                  >
                                    <Trash2 size={15} />
                                    <span className="text-[11px] font-bold text-red-600">Excluir</span>
                                  </button>
                                </div>
                                <h5 className="font-bold text-stone-900 text-base mb-1">{notice.title}</h5>
                                <p className="text-sm text-stone-600 line-clamp-3 whitespace-pre-line">{notice.content}</p>
                                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                                  <span>{new Date(notice.date).toLocaleDateString('pt-BR')}</span>
                                  <span className="text-[11px] text-stone-500">Notificação Interna</span>
                                </div>
                              </div>
                            ))}

                            {announcements.length === 0 && allNotices.length === 0 && (
                              <div className="col-span-full text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                <BellRing className="mx-auto text-stone-300 mb-2" size={32} />
                                <p className="text-stone-500 font-medium">Nenhum aviso publicado ainda.</p>
                                <p className="text-xs text-stone-400 mt-1">Clique em "Novo Aviso" acima para enviar uma notificação para a Página Inicial com som.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'ministries' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Gestão de Ministérios</h3>
                          <button 
                            onClick={() => setIsAddingMinistry(true)}
                            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-primary-dark transition-colors"
                          >
                            <Plus size={18} className="mr-2" />
                            Novo Ministério
                          </button>
                        </div>

                        {isAddingMinistry && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 p-6 bg-stone-50 rounded-2xl border border-primary/20"
                          >
                            <form onSubmit={handleAddMinistry} className="flex flex-col sm:flex-row gap-4">
                              <input 
                                type="text" 
                                value={newMinistryName}
                                onChange={(e) => setNewMinistryName(e.target.value)}
                                placeholder="Nome do ministério (ex: Louvor, Kids...)"
                                className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                required
                              />
                                <div className="flex gap-2">
                                  <button 
                                    type="submit"
                                    disabled={isMinistryLoading}
                                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center shadow-lg shadow-primary/20"
                                  >
                                    {isMinistryLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : null}
                                    Adicionar
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setIsAddingMinistry(false)}
                                    className="bg-white border border-stone-200 text-stone-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-stone-50 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                            </form>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {ministries.map((ministry) => (
                            <div key={ministry.id} className="bg-white border border-stone-100 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-bold truncate pr-2">{ministry.name}</h4>
                                <button 
                                  onClick={() => handleDeleteMinistry(ministry.id)}
                                  className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              
                              <div className="mb-6">
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block">Liderança</span>
                                <div className="flex flex-wrap gap-2">
                                  {getMinistryLeaders(ministry.id).length > 0 ? (
                                    getMinistryLeaders(ministry.id).map(leader => (
                                      <div key={leader.id} className="bg-stone-100 pl-3 pr-1 py-1 rounded-full text-xs font-medium text-stone-700 flex items-center gap-1 group/leader">
                                        <span>{leader.full_name}</span>
                                        <button 
                                          onClick={() => {
                                            setConfirmModal({
                                              isOpen: true,
                                              title: 'Remover Liderança',
                                              message: `Deseja remover a liderança de ${leader.full_name}? Ele continuará como voluntário no ministério.`,
                                              type: 'danger',
                                              onConfirm: () => handleToggleLeadership(leader.id, ministry.id)
                                            });
                                          }}
                                          className="p-1 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover/leader:opacity-100"
                                          title="Remover Liderança"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-sm text-stone-400 italic">Nenhum líder atribuído</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => {
                                    setSelectedMinistryForLeadership(ministry.id);
                                    setIsManagingLeadership(true);
                                  }}
                                  className="w-full py-3 bg-stone-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-stone-900/10 active:scale-95"
                                >
                                  <UserPlus size={16} className="mr-2" />
                                  Atribuir Liderança
                                </button>
                                
                                {leadership.some(l => l.user_id === currentUser?.id && l.ministry_id === ministry.id && l.is_leader) && (
                                  <button 
                                    onClick={() => {
                                      setSelectedMinistryForDevotional(ministry.id);
                                      setNewDevotional({
                                        title: '',
                                        content: '',
                                        type: 'text',
                                        category: 'Devocional',
                                        status: 'pending'
                                      });
                                      setIsWritingDevotional(true);
                                    }}
                                    className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center shadow-lg shadow-primary/10 active:scale-95"
                                  >
                                    <Edit3 size={16} className="mr-2" />
                                    Redigir Devocional
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'cells' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                          <div>
                            <h3 className="text-2xl font-bold text-stone-900">Gestão de Células</h3>
                            <p className="text-sm text-stone-500">{cellGroups.length} grupos de discipulado cadastrados</p>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingCellId(null);
                              setNewCell({
                                name: '',
                                leader: '',
                                day: 'Terça-feira',
                                time: '20:00',
                                location: '',
                                type: 'Misto'
                              });
                              setIsAddingCell(true);
                            }}
                            className="bg-primary text-white px-8 py-4 rounded-2xl text-sm font-bold flex items-center justify-center hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-95"
                          >
                            <Plus size={20} className="mr-2" />
                            Nova Célula
                          </button>
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-10">
                          <div className="relative flex-1">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar por nome ou líder..."
                              value={searchCell}
                              onChange={(e) => setSearchCell(e.target.value)}
                              className="w-full bg-stone-100 border-none rounded-2xl pl-12 pr-6 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select 
                              value={filterCellType}
                              onChange={(e) => setFilterCellType(e.target.value)}
                              className="flex-1 md:flex-none bg-stone-100 border-none rounded-2xl px-6 py-4 text-sm font-bold text-stone-600 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                            >
                              {['Todos', 'Misto', 'Jovens', 'Mulheres', 'Homens', 'Casais', 'Kids'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isAddingCell && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-12 p-8 bg-stone-50 rounded-[40px] border border-stone-200 shadow-sm relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                            <div className="flex items-center justify-between mb-8">
                              <div>
                                <h4 className="text-xl font-bold text-stone-900">
                                  {editingCellId ? 'Editar Célula' : 'Cadastrar Nova Célula'}
                                </h4>
                                <p className="text-sm text-stone-500">Preencha as informações abaixo para {editingCellId ? 'atualizar' : 'criar'} o grupo.</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setIsAddingCell(false);
                                  setEditingCellId(null);
                                }}
                                className="p-3 hover:bg-stone-200 rounded-full transition-colors"
                              >
                                <X size={24} className="text-stone-400" />
                              </button>
                            </div>

                            <form onSubmit={handleCreateCellGroup} className="space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Nome da Célula</label>
                                  <input 
                                    type="text" 
                                    value={newCell.name}
                                    onChange={(e) => setNewCell({...newCell, name: e.target.value})}
                                    placeholder="Ex: Célula Esperança"
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Líder(es)</label>
                                  <input 
                                    type="text" 
                                    value={newCell.leader}
                                    onChange={(e) => setNewCell({...newCell, leader: e.target.value})}
                                    placeholder="Nome do líder"
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Dia da Semana</label>
                                  <select 
                                    value={newCell.day}
                                    onChange={(e) => setNewCell({...newCell, day: e.target.value})}
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                                    required
                                  >
                                    {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Horário</label>
                                  <input 
                                    type="text" 
                                    value={newCell.time}
                                    onChange={(e) => setNewCell({...newCell, time: e.target.value})}
                                    placeholder="Ex: 20:00"
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Localização/Bairro</label>
                                  <input 
                                    type="text" 
                                    value={newCell.location}
                                    onChange={(e) => setNewCell({...newCell, location: e.target.value})}
                                    placeholder="Ex: Centro, Itapema"
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Público-alvo</label>
                                  <select 
                                    value={newCell.type}
                                    onChange={(e) => setNewCell({...newCell, type: e.target.value})}
                                    className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                                    required
                                  >
                                    {['Misto', 'Jovens', 'Mulheres', 'Homens', 'Casais', 'Kids'].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setIsAddingCell(false);
                                    setEditingCellId(null);
                                  }}
                                  className="px-10 py-4 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit"
                                  disabled={isMinistryLoading}
                                  className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center shadow-2xl shadow-stone-900/20 active:scale-95"
                                >
                                  {isMinistryLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" /> : null}
                                  {editingCellId ? 'Salvar Alterações' : 'Criar Célula'}
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {cellGroups
                            .filter(c => (c.name.toLowerCase().includes(searchCell.toLowerCase()) || c.leader.toLowerCase().includes(searchCell.toLowerCase())) && (filterCellType === 'Todos' || c.type === filterCellType))
                            .map((cell) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              key={cell.id} 
                              className="bg-white border border-stone-100 p-8 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col"
                            >
                              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -mr-20 -mt-20 transition-all group-hover:scale-110" />
                              
                              <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="flex-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-2xl mb-4 inline-block shadow-sm ${
                                    cell.type === 'Jovens' ? 'bg-blue-100 text-blue-600' :
                                    cell.type === 'Kids' ? 'bg-yellow-100 text-yellow-600' :
                                    cell.type === 'Mulheres' ? 'bg-pink-100 text-pink-600' :
                                    cell.type === 'Homens' ? 'bg-indigo-100 text-indigo-600' :
                                    cell.type === 'Casais' ? 'bg-red-100 text-red-600' :
                                    'bg-stone-100 text-stone-600'
                                  }`}>
                                    {cell.type}
                                  </span>
                                  <h4 className="text-2xl font-bold text-stone-900 group-hover:text-primary transition-colors leading-tight">{cell.name}</h4>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleEditCell(cell)}
                                    className="p-3 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                                    title="Editar"
                                  >
                                    <Edit2 size={20} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCellGroup(cell.id)}
                                    className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-4 relative z-10 flex-1">
                                <div className="flex items-center p-5 bg-stone-50 rounded-3xl group-hover:bg-white transition-colors border border-transparent group-hover:border-stone-100 shadow-sm group-hover:shadow-md">
                                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mr-5 flex-shrink-0">
                                    <Users size={22} className="text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2">Líder(es)</p>
                                    <p className="text-base font-bold text-stone-700 truncate">{cell.leader}</p>
                                  </div>
                                </div>

                                <div className="flex items-center p-5 bg-stone-50 rounded-3xl group-hover:bg-white transition-colors border border-transparent group-hover:border-stone-100 shadow-sm group-hover:shadow-md">
                                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mr-5 flex-shrink-0">
                                    <Clock size={22} className="text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2">Horário</p>
                                    <p className="text-base font-bold text-stone-700 truncate">{cell.day} às {cell.time}</p>
                                  </div>
                                </div>

                                <div className="flex items-center p-5 bg-stone-50 rounded-3xl group-hover:bg-white transition-colors border border-transparent group-hover:border-stone-100 shadow-sm group-hover:shadow-md">
                                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mr-5 flex-shrink-0">
                                    <MapPin size={22} className="text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2">Localização</p>
                                    <p className="text-base font-bold text-stone-700 truncate">{cell.location}</p>
                                  </div>
                                </div>
                              </div>

                              <button 
                                onClick={() => {
                                  const text = `Célula: ${cell.name}\nLíder: ${cell.leader}\nQuando: ${cell.day} às ${cell.time}\nOnde: ${cell.location}\nTipo: ${cell.type}`;
                                  navigator.clipboard.writeText(text);
                                  alert('Informações copiadas!');
                                }}
                                className="mt-10 w-full py-5 bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-600 rounded-[24px] text-xs font-bold transition-all flex items-center justify-center group/btn active:scale-95 shadow-sm"
                              >
                                <Copy size={18} className="mr-3 group-hover/btn:scale-110 transition-transform" />
                                Copiar Informações
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'prayer' && (
                      <div className="space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                          <h3 className="text-xl font-bold">Pedidos de Oração</h3>
                          <div className="flex bg-stone-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                            <button 
                              onClick={() => setPrayerFilter('pending')}
                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${prayerFilter === 'pending' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                              Pendentes
                            </button>
                            <button 
                              onClick={() => setPrayerFilter('intercession')}
                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${prayerFilter === 'intercession' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                              Intercessão
                            </button>
                            <button 
                              onClick={() => setPrayerFilter('completed')}
                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${prayerFilter === 'completed' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                              Concluídos
                            </button>
                            <button 
                              onClick={() => setPrayerFilter('all')}
                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${prayerFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                              Todos
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {prayerRequests
                            .filter(r => prayerFilter === 'all' ? true : r.status === prayerFilter)
                            .map(request => (
                            <div key={request.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-stone-900">{request.name}</h4>
                                  <p className="text-xs text-stone-500">{request.whatsapp}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded-full font-bold uppercase">
                                    {new Date(request.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    request.status === 'intercession' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {request.status === 'pending' ? 'Pendente' :
                                     request.status === 'intercession' ? 'Em Intercessão' :
                                     'Concluído'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-stone-600 text-sm mb-6 leading-relaxed italic">"{request.request}"</p>
                              
                              {request.status !== 'completed' && (
                                <div className="flex gap-3">
                                  {request.status === 'pending' && (
                                    <button 
                                      onClick={() => handleForwardToIntercession(request.id)}
                                      className="flex-1 bg-stone-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center"
                                    >
                                      <HandHeart size={14} className="mr-2" /> Encaminhar para Intercessão
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleCompletePrayerRequest(request.id)}
                                    className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all"
                                  >
                                    Concluir
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {prayerRequests.filter(r => prayerFilter === 'all' ? true : r.status === prayerFilter).length === 0 && (
                            <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                              <p className="text-stone-400 text-sm italic">Nenhum pedido de oração encontrado para este filtro.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {pastorViewTab === 'media' && (
                      <div className="space-y-8">
                        {/* Live Stream Management */}
                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                              <Video size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-stone-900">Transmissão Ao Vivo</h4>
                              <p className="text-xs text-stone-500">Gerencie o link da live na home page</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Link da Transmissão (YouTube/Facebook)</label>
                              <div className="flex gap-2">
                                <input 
                                  type="url" 
                                  value={liveStream?.url || ''}
                                  onChange={(e) => setLiveStream(prev => prev ? { ...prev, url: e.target.value } : { url: e.target.value, is_active: false })}
                                  placeholder="https://youtube.com/live/..."
                                  className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <button 
                                  disabled={isMinistryLoading}
                                  onClick={async () => {
                                    if (!liveStream?.url) {
                                      alert('Por favor, insira um link válido.');
                                      return;
                                    }
                                    setIsMinistryLoading(true);
                                    try {
                                      const { error } = await supabase
                                        .from('live_stream')
                                        .upsert({ 
                                          id: liveStream?.id || undefined,
                                          url: liveStream.url, 
                                          is_active: !liveStream.is_active,
                                          updated_at: new Date().toISOString()
                                        });
                                      if (error) throw error;
                                      fetchHomeContent();
                                      try {
                                        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'live_stream' } }));
                                      } catch (e) {}
                                    } catch (err) {
                                      console.error('Error updating live stream:', err);
                                      alert('Erro ao atualizar transmissão.');
                                    } finally {
                                      setIsMinistryLoading(false);
                                    }
                                  }}
                                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center ${
                                    liveStream?.is_active 
                                      ? 'bg-red-600 text-white hover:bg-red-700' 
                                      : 'bg-stone-900 text-white hover:bg-black'
                                  } disabled:opacity-50`}
                                >
                                  {isMinistryLoading ? 'Processando...' : (liveStream?.is_active ? 'Encerrar Live' : 'Iniciar Live')}
                                </button>
                              </div>
                              <p className="text-[10px] text-stone-400 mt-2">
                                Ao clicar em "Iniciar Live", o indicador vermelho aparecerá na home page para todos os usuários.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Weekly Repository Admin Panel */}
                        <WeeklyRepositoryAdmin 
                          initialData={weeklyRepositoryData}
                          onSaveSuccess={(newData) => {
                            if (setWeeklyRepositoryData) setWeeklyRepositoryData(newData);
                            fetchHomeContent();
                          }}
                          isMinistryLoading={isMinistryLoading}
                          setIsMinistryLoading={setIsMinistryLoading}
                          announcements={announcements}
                          mediaContents={mediaContents}
                          onAddAnnouncement={() => {
                            setIsAddingAnnouncement(true);
                            setIsEditingAnnouncement(false);
                            setIsAddingMedia(false);
                            setIsEditingMedia(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onAddMedia={() => {
                            setIsAddingMedia(true);
                            setIsEditingMedia(false);
                            setIsAddingAnnouncement(false);
                            setIsEditingAnnouncement(false);
                            setMediaToEdit(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onEditMedia={(media) => {
                            setMediaToEdit(media);
                            setIsEditingMedia(true);
                            setIsAddingMedia(false);
                            setIsAddingAnnouncement(false);
                            setIsEditingAnnouncement(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onDeleteMedia={handleDeleteMedia}
                        />

                        {isAddingAnnouncement && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm"
                          >
                            <h4 className="font-bold mb-6">Adicionar Novo Aviso Geral</h4>
                            <form onSubmit={handleAddAnnouncement} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Título</label>
                                <input 
                                  type="text" 
                                  value={newAnnouncement.title}
                                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Título do Aviso"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data (Texto)</label>
                                <input 
                                  type="text" 
                                  value={newAnnouncement.date}
                                  onChange={(e) => setNewAnnouncement({...newAnnouncement, date: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Ex: 28 Mar, 2026"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
                                <textarea 
                                  value={newAnnouncement.description}
                                  onChange={(e) => setNewAnnouncement({...newAnnouncement, description: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                                  placeholder="Detalhes do aviso..."
                                  required
                                />
                              </div>
                              <div className="md:col-span-2 flex justify-end gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => setIsAddingAnnouncement(false)}
                                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isMinistryLoading}
                                  className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center"
                                >
                                  {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                  Salvar Aviso
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        {isEditingAnnouncement && announcementToEdit && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm"
                          >
                            <h4 className="font-bold mb-6">Editar Aviso Geral</h4>
                            <form onSubmit={handleUpdateAnnouncement} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Título</label>
                                <input 
                                  type="text" 
                                  value={announcementToEdit.title}
                                  onChange={(e) => setAnnouncementToEdit({...announcementToEdit, title: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Título do Aviso"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data (Texto)</label>
                                <input 
                                  type="text" 
                                  value={announcementToEdit.date}
                                  onChange={(e) => setAnnouncementToEdit({...announcementToEdit, date: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Ex: 28 Mar, 2026"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
                                <textarea 
                                  value={announcementToEdit.description}
                                  onChange={(e) => setAnnouncementToEdit({...announcementToEdit, description: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                                  placeholder="Detalhes do aviso..."
                                  required
                                />
                              </div>
                              <div className="md:col-span-2 flex justify-end gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsEditingAnnouncement(false);
                                    setAnnouncementToEdit(null);
                                  }}
                                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isMinistryLoading}
                                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all flex items-center"
                                >
                                  {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                  Atualizar Aviso
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        {isEditingMedia && mediaToEdit && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm"
                          >
                            <h4 className="font-bold mb-6">Editar Conteúdo</h4>
                            <form onSubmit={handleUpdateMedia} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Título</label>
                                <input 
                                  type="text" 
                                  value={mediaToEdit.title || ''}
                                  onChange={(e) => setMediaToEdit({...mediaToEdit, title: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Título da Mensagem/Vídeo"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
                                <select 
                                  value={mediaToEdit.category || ''}
                                  onChange={(e) => setMediaToEdit({...mediaToEdit, category: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  required
                                >
                                  <option value="">Selecione uma categoria</option>
                                  <option value="Mensagem">Mensagem</option>
                                  <option value="Devocional">Devocional</option>
                                  <option value="Blog">Blog</option>
                                  <option value="Reflexão">Reflexão</option>
                                  <option value="Podcast">Podcast</option>
                                  <option value="Louvor">Louvor</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tipo</label>
                                <select 
                                  value={mediaToEdit.type}
                                  onChange={(e) => setMediaToEdit({...mediaToEdit, type: e.target.value as any})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                  <option value="video">Vídeo (Link)</option>
                                  <option value="photo">Foto (Link)</option>
                                  <option value="audio">Áudio/Podcast (Link)</option>
                                  <option value="file">Arquivo/PDF (Link)</option>
                                  <option value="text">Texto/Mensagem</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">URL / Link</label>
                                <input 
                                  type="url" 
                                  value={mediaToEdit.url || ''}
                                  onChange={(e) => setMediaToEdit({...mediaToEdit, url: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="https://..."
                                  required={mediaToEdit.type !== 'text'}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Thumbnail (Link)</label>
                                <input 
                                  type="url" 
                                  value={mediaToEdit.thumbnail_url || ''}
                                  onChange={(e) => setMediaToEdit({...mediaToEdit, thumbnail_url: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="https://images.unsplash.com/..."
                                />
                              </div>
                              {mediaToEdit.type === 'text' && (
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Conteúdo do Texto</label>
                                  <textarea 
                                    value={mediaToEdit.content_text || ''}
                                    onChange={(e) => setMediaToEdit({...mediaToEdit, content_text: e.target.value})}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px]"
                                    placeholder="Escreva sua mensagem aqui..."
                                    required
                                  />
                                </div>
                              )}
                              <div className="md:col-span-2 flex justify-end gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsEditingMedia(false);
                                    setMediaToEdit(null);
                                  }}
                                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isMinistryLoading}
                                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center"
                                >
                                  {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                  Atualizar Conteúdo
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        {isAddingMedia && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm"
                          >
                            <h4 className="font-bold mb-6">Adicionar Novo Conteúdo Avulso</h4>
                            <form onSubmit={handleAddMedia} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Título</label>
                                <input 
                                  type="text" 
                                  value={newMedia.title || ''}
                                  onChange={(e) => setNewMedia({...newMedia, title: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="Título da Mensagem/Vídeo"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
                                <select 
                                  value={newMedia.category || ''}
                                  onChange={(e) => setNewMedia({...newMedia, category: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  required
                                >
                                  <option value="">Selecione uma categoria</option>
                                  <option value="Mensagem">Mensagem</option>
                                  <option value="Devocional">Devocional</option>
                                  <option value="Blog">Blog</option>
                                  <option value="Reflexão">Reflexão</option>
                                  <option value="Podcast">Podcast</option>
                                  <option value="Louvor">Louvor</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tipo</label>
                                <select 
                                  value={newMedia.type}
                                  onChange={(e) => setNewMedia({...newMedia, type: e.target.value as any})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                  <option value="video">Vídeo (Link)</option>
                                  <option value="photo">Foto (Link)</option>
                                  <option value="audio">Áudio/Podcast (Link)</option>
                                  <option value="file">Arquivo/PDF (Link)</option>
                                  <option value="text">Texto/Mensagem</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">URL / Link</label>
                                <input 
                                  type="url" 
                                  value={newMedia.url || ''}
                                  onChange={(e) => setNewMedia({...newMedia, url: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="https://..."
                                  required={newMedia.type !== 'text'}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Thumbnail (Link)</label>
                                <input 
                                  type="url" 
                                  value={newMedia.thumbnail_url || ''}
                                  onChange={(e) => setNewMedia({...newMedia, thumbnail_url: e.target.value})}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                  placeholder="https://images.unsplash.com/..."
                                />
                              </div>
                              {newMedia.type === 'text' && (
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Conteúdo do Texto</label>
                                  <textarea 
                                    value={newMedia.content_text || ''}
                                    onChange={(e) => setNewMedia({...newMedia, content_text: e.target.value})}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px]"
                                    placeholder="Escreva sua mensagem aqui..."
                                    required
                                  />
                                </div>
                              )}
                              <div className="md:col-span-2 flex justify-end gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => setIsAddingMedia(false)}
                                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isMinistryLoading}
                                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center"
                                >
                                  {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                  Salvar Conteúdo
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}
                      </div>
                    )}
                    {pastorViewTab === 'carousel' && (
                      <CarouselManagement 
                        events={carouselEvents} 
                        onRefresh={fetchHomeContent} 
                        setConfirmModal={setConfirmModal}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'lideres' && (
                <div className="space-y-6">
                  {!selectedMinistryForManagement ? (
                    <>
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center">
                          <Users size={24} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">Líderes de Ministério</h2>
                          <p className="text-stone-500">Gestão de equipes e escalas</p>
                        </div>
                      </div>

                      {userLedMinistries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {userLedMinistries.map((ministry) => (
                            <div 
                              key={ministry.id} 
                              className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:border-primary/30 transition-all cursor-pointer group"
                              onClick={() => setSelectedMinistryForManagement(ministry)}
                            >
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-xl">{ministry.name}</h3>
                                <ChevronRight className="text-stone-300 group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-sm text-stone-600 mb-3">Acesse as funções de gestão do ministério {ministry.name}.</p>
                              {ministry.description ? (
                                <div className="mt-3 bg-white p-3 rounded-xl border border-stone-150 relative">
                                  <span className="absolute -top-2.5 left-3 bg-stone-50 px-1.5 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Descrição do Líder</span>
                                  <p className="text-xs text-stone-500 italic mt-1 line-clamp-2">
                                    "{ministry.description}"
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-3 bg-stone-100/40 p-2.5 rounded-xl border border-dashed border-stone-200">
                                  <p className="text-[11px] text-stone-400 italic">Nenhuma descrição cadastrada. Acesse para definir uma.</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                          <Users size={48} className="mx-auto text-stone-300 mb-4" />
                          <h3 className="text-lg font-bold text-stone-900">Nenhum ministério atribuído</h3>
                          <p className="text-stone-500 max-w-xs mx-auto">Você ainda não foi atribuído como líder de nenhum ministério pela pastoral.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => setSelectedMinistryForManagement(null)}
                          className="flex items-center text-stone-500 hover:text-primary transition-colors font-medium"
                        >
                          <ChevronRight className="rotate-180 mr-2" size={20} />
                          Voltar para Lista
                        </button>
                        <div className="text-right">
                          <h2 className="text-2xl font-bold">{selectedMinistryForManagement.name}</h2>
                          <p className="text-stone-500 text-sm">Painel de Gestão Ministerial</p>
                        </div>
                      </div>

                      {/* Descritivo do Ministério */}
                      <div className="bg-gradient-to-r from-stone-50 to-stone-100/50 rounded-3xl p-6 border border-stone-200/50 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="p-2 bg-stone-900 text-white rounded-xl">
                              <FileText size={18} />
                            </span>
                            <div>
                              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base uppercase tracking-wide">Descritivo do Ministério</h3>
                              <p className="text-stone-500 text-xs">Propósito, objetivos e visão geral gerenciados pela liderança</p>
                            </div>
                          </div>
                          {!editingDescription && (
                            <button
                              onClick={() => {
                                setMinistryDescriptionInput(currentSelectedMinistry?.description || '');
                                setEditingDescription(true);
                              }}
                              className="px-4 py-2 bg-stone-900 text-white hover:bg-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-stone-900/10 active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Edit3 size={12} />
                              {currentSelectedMinistry?.description ? 'Editar Descrição' : 'Gerar Descrição'}
                            </button>
                          )}
                        </div>

                        {editingDescription ? (
                          <div className="space-y-4">
                            <textarea
                              value={ministryDescriptionInput}
                              onChange={(e) => setMinistryDescriptionInput(e.target.value)}
                              rows={4}
                              placeholder="Digite aqui a descrição detalhada do ministério (ex: propósitos, dias de ensaio/reunião, etc)..."
                              className="w-full text-sm bg-white border border-stone-300 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary/20 shadow-inner text-stone-700 font-medium placeholder-stone-400"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingDescription(false)}
                                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleUpdateMinistryDescription}
                                disabled={isMinistryLoading}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 flex items-center gap-2"
                              >
                                {isMinistryLoading ? (
                                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Check size={14} />
                                    Salvar Descrição
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl p-4 border border-stone-100">
                            {currentSelectedMinistry?.description ? (
                              <p className="text-sm text-stone-600 whitespace-pre-line leading-relaxed font-medium">
                                {currentSelectedMinistry.description}
                              </p>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-stone-400 text-xs italic">
                                  Nenhuma descrição cadastrada para este ministério. Adicione uma descrição para formalizar a visão do ministério!
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedMinistryForManagement.name === 'Intercessão' && (
                          <div className="p-6 bg-stone-50 rounded-2xl border border-primary/20 col-span-1 md:col-span-2 space-y-6">
                            <div>
                              <h3 className="font-bold mb-4 flex items-center">
                                <HandHeart size={20} className="mr-2 text-primary" />
                                Pedidos em Intercessão
                              </h3>
                              <div className="space-y-4">
                                {prayerRequests.filter(r => r.status === 'intercession' || !r.status || r.status === 'pending').map(request => (
                                  <div key={request.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-sm">{request.name}</p>
                                      <p className="text-xs text-stone-500 italic">"{request.request}"</p>
                                    </div>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from('prayer_requests')
                                            .update({ status: 'completed' })
                                            .eq('id', request.id);
                                          if (error) throw error;
                                          fetchData();
                                        } catch (e) {
                                          alert('Erro ao concluir intercessão.');
                                        }
                                      }}
                                      className="text-xs font-bold text-primary hover:underline"
                                    >
                                      Concluir
                                    </button>
                                  </div>
                                ))}
                                {prayerRequests.filter(r => r.status === 'intercession' || !r.status || r.status === 'pending').length === 0 && (
                                  <p className="text-stone-400 text-xs italic">Nenhum pedido pendente no momento.</p>
                                )}
                              </div>
                            </div>

                            <div className="pt-6 border-t border-stone-200">
                              <h3 className="font-bold mb-4 flex items-center text-stone-500">
                                <Check size={18} className="mr-2" />
                                Pedidos Concluídos
                              </h3>
                              <div className="space-y-3">
                                {prayerRequests.filter(r => r.status === 'completed').map(request => (
                                  <div key={request.id} className="bg-stone-100/50 p-3 rounded-xl flex justify-between items-center">
                                    <div className="opacity-60">
                                      <p className="font-bold text-xs">{request.name}</p>
                                      <p className="text-[10px] text-stone-500 truncate max-w-[200px]">"{request.request}"</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setConfirmModal({
                                          isOpen: true,
                                          title: 'Excluir Pedido',
                                          message: 'Tem certeza que deseja excluir este pedido concluído?',
                                          type: 'danger',
                                          onConfirm: async () => {
                                            try {
                                              const { error } = await supabase
                                                .from('prayer_requests')
                                                .delete()
                                                .eq('id', request.id);
                                              if (error) throw error;
                                              fetchData();
                                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            } catch (e) {
                                              alert('Erro ao excluir pedido.');
                                            }
                                          }
                                        });
                                      }}
                                      className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                                      title="Excluir pedido"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                                {prayerRequests.filter(r => r.status === 'completed').length === 0 && (
                                  <p className="text-stone-400 text-[10px] italic">Nenhum pedido concluído.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}


                        {lideresSubTab === 'dashboard' ? (
                          <>
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:border-primary/20 hover:bg-stone-50/70 transition-all">
                              <h3 className="font-bold mb-2">Escalas de Serviço</h3>
                              <p className="text-sm text-stone-600 mb-4">Gerencie os voluntários e as escalas do ministério {selectedMinistryForManagement.name}.</p>
                              <button onClick={() => setLideresSubTab('escalas')} className="text-primary text-sm font-bold hover:underline">Gerenciar Escalas</button>
                            </div>
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:border-primary/20 hover:bg-stone-50/70 transition-all">
                              <h3 className="font-bold mb-2">Relatórios Mensais</h3>
                              <p className="text-sm text-stone-600 mb-4">Envie o relatório de atividades e crescimento do ministério.</p>
                              <button onClick={() => setLideresSubTab('relatorios')} className="text-primary text-sm font-bold hover:underline">Enviar Relatório</button>
                            </div>
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:border-primary/20 hover:bg-stone-50/70 transition-all">
                              <h3 className="font-bold mb-2">Equipe e Voluntários</h3>
                              <p className="text-sm text-stone-600 mb-4">Visualize a lista de membros que servem neste ministério.</p>
                              <button onClick={() => setLideresSubTab('equipe')} className="text-primary text-sm font-bold hover:underline">Ver Equipe</button>
                            </div>
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:border-primary/20 hover:bg-stone-50/70 transition-all">
                              <h3 className="font-bold mb-2">Comunicação Interna</h3>
                              <p className="text-sm text-stone-600 mb-4">Envie mensagens e avisos para sua equipe.</p>
                              <button onClick={() => setLideresSubTab('avisos')} className="text-primary text-sm font-bold hover:underline">Enviar Aviso</button>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-1 md:col-span-2 space-y-6">
                            <button 
                              onClick={() => {
                                setLideresSubTab('dashboard');
                                setIsAddingScaleSec(false);
                                setIsAddingNoticeSec(false);
                                setIsAddingReportSec(false);
                              }} 
                              className="flex items-center space-x-2 text-stone-500 hover:text-stone-800 font-bold text-xs bg-stone-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <ArrowLeft size={14} />
                              <span>Voltar ao Painel Geral</span>
                            </button>

                            {lideresSubTab === 'escalas' && (
                              <div className="space-y-6">
                                <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl">
                                  <h4 className="font-bold text-stone-800 text-sm">Escalas de Serviço</h4>
                                  {!isAddingScaleSec && (
                                    <button 
                                      onClick={() => setIsAddingScaleSec(true)}
                                      className="text-xs font-bold text-primary hover:text-primary-dark flex items-center bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                      <Plus size={14} className="mr-1" /> Nova Escala
                                    </button>
                                  )}
                                </div>

                                {isAddingScaleSec && (
                                  <form onSubmit={handleAddNewScaleSec} className="bg-white p-6 rounded-2xl border border-stone-100 space-y-4">
                                    <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Agendar Nova Escala</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data</label>
                                        <input 
                                          type="date" 
                                          value={newScaleSec.date}
                                          onChange={e => setNewScaleSec({...newScaleSec, date: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                          required
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Função / Cargo na Escala</label>
                                        <input 
                                          type="text" 
                                          value={newScaleSec.role}
                                          onChange={e => setNewScaleSec({...newScaleSec, role: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                          placeholder="Ex: Recepção, Cozinha, Som"
                                          required
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Membro / Voluntário</label>
                                        <select 
                                          value={newScaleSec.user_id}
                                          onChange={e => setNewScaleSec({...newScaleSec, user_id: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                          required
                                        >
                                          <option value="">Selecione um membro...</option>
                                          {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Observação</label>
                                        <input 
                                          type="text" 
                                          value={newScaleSec.description}
                                          onChange={e => setNewScaleSec({...newScaleSec, description: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                          placeholder="Ex: Chegar com antecedência"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <button 
                                        type="button" 
                                        onClick={() => setIsAddingScaleSec(false)}
                                        className="px-4 py-2 text-stone-400 font-bold text-xs"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        type="submit"
                                        className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-primary-dark transition-all shadow-md"
                                      >
                                        Salvar Escala
                                      </button>
                                    </div>
                                  </form>
                                )}

                                <div className="space-y-4">
                                  {allScales.filter(s => s.ministry_id === selectedMinistryForManagement.id).length > 0 ? (
                                    allScales.filter(s => s.ministry_id === selectedMinistryForManagement.id).map(scale => (
                                      <div key={scale.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center space-x-4">
                                          <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-primary shrink-0 border border-stone-100">
                                            <Calendar size={20} />
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-stone-800">{scale.role}</p>
                                            <p className="text-xs text-stone-500">{new Date(scale.date).toLocaleDateString('pt-BR')}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                                          <div className="text-left sm:text-right">
                                            <p className="text-xs font-bold text-stone-700">{scale.user_name || profiles.find(p => p.id === scale.user_id)?.full_name}</p>
                                            <p className="text-[10px] text-stone-400">{scale.description}</p>
                                          </div>
                                          <button 
                                            onClick={() => handleDeleteScaleSec(scale.id)}
                                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0 border border-transparent hover:border-red-100"
                                            title="Excluir Escala"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-200">
                                      <p className="text-stone-400 text-sm italic">Nenhuma escala definida para este ministério.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {lideresSubTab === 'relatorios' && (
                              <div className="space-y-6">
                                <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl">
                                  <h4 className="font-bold text-stone-800 text-sm">Relatórios Mensais</h4>
                                  {!isAddingReportSec && (
                                    <button 
                                      onClick={() => setIsAddingReportSec(true)}
                                      className="text-xs font-bold text-primary hover:text-primary-dark flex items-center bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                      <Plus size={14} className="mr-1" /> Novo Relatório
                                    </button>
                                  )}
                                </div>

                                {isAddingReportSec && (
                                  <form onSubmit={handleAddNewReportSec} className="bg-white p-6 rounded-2xl border border-stone-100 space-y-4">
                                    <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Enviar Novo Relatório</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Mês Referência</label>
                                        <input 
                                          type="text" 
                                          value={newReportSec.month}
                                          onChange={e => setNewReportSec({...newReportSec, month: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none"
                                          placeholder="Ex: Julho/2026"
                                          required
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Eventos Realizados</label>
                                        <input 
                                          type="number" 
                                          value={newReportSec.events_held}
                                          onChange={e => setNewReportSec({...newReportSec, events_held: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none"
                                          placeholder="Ex: 4"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Participantes Médios</label>
                                        <input 
                                          type="number" 
                                          value={newReportSec.avg_participants}
                                          onChange={e => setNewReportSec({...newReportSec, avg_participants: e.target.value})}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none"
                                          placeholder="Ex: 30"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Notas e Atividades Gerais</label>
                                      <textarea 
                                        value={newReportSec.notes}
                                        onChange={e => setNewReportSec({...newReportSec, notes: e.target.value})}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none min-h-[100px]"
                                        placeholder="Crescimento espiritual, testemunhos, etc."
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <button 
                                        type="button" 
                                        onClick={() => setIsAddingReportSec(false)}
                                        className="px-4 py-2 text-stone-400 font-bold text-xs"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        type="submit"
                                        className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-primary-dark transition-all"
                                      >
                                        Enviar Relatório
                                      </button>
                                    </div>
                                  </form>
                                )}

                                <div className="space-y-4">
                                  {allReports.filter(r => r.ministry_id === selectedMinistryForManagement.id).length > 0 ? (
                                    allReports.filter(r => r.ministry_id === selectedMinistryForManagement.id).map(report => (
                                      <div key={report.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center space-x-4">
                                          <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-primary border border-stone-100 shrink-0">
                                            <FileText size={24} />
                                          </div>
                                          <div>
                                            <h5 className="font-bold text-stone-800">Relatório de {report.month}</h5>
                                            <p className="text-xs text-stone-500 line-clamp-1">{report.positive_points}</p>
                                            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Gerado em {new Date(report.created_at).toLocaleDateString('pt-BR')}</p>
                                          </div>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <button 
                                            onClick={() => handleDeleteReportSec(report.id)}
                                            className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                            title="Excluir Relatório"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-200">
                                      <p className="text-stone-400 text-sm italic">Nenhum relatório gerado ainda.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {lideresSubTab === 'equipe' && (
                              <div className="space-y-6">
                                <div className="bg-stone-50 p-4 rounded-xl">
                                  <h4 className="font-bold text-stone-800 text-sm">Equipe do Ministério</h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {allMinistryMembers.filter(m => m.ministry_id === selectedMinistryForManagement.id).map(member => (
                                    <div key={member.id || member.user_id} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-primary font-bold text-sm border border-stone-100">
                                          {member.full_name?.charAt(0) || 'V'}
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-stone-800">{member.full_name || 'Voluntário'}</p>
                                          <p className="text-[10px] text-stone-400 font-medium">{member.whatsapp}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {member.is_leader && (
                                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Líder</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {allMinistryMembers.filter(m => m.ministry_id === selectedMinistryForManagement.id).length === 0 && (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-200 col-span-1 sm:col-span-2">
                                      <p className="text-stone-400 text-sm italic">Nenhum voluntário ou membro encontrado para este ministério.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {lideresSubTab === 'avisos' && (
                              <div className="space-y-6">
                                <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl">
                                  <h4 className="font-bold text-stone-800 text-sm">Avisos do Ministério</h4>
                                  {!isAddingNoticeSec && (
                                    <button 
                                      onClick={() => setIsAddingNoticeSec(true)}
                                      className="text-xs font-bold text-primary hover:text-primary-dark flex items-center bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                      <Plus size={14} className="mr-1" /> Novo Aviso
                                    </button>
                                  )}
                                </div>

                                {isAddingNoticeSec && (
                                  <form onSubmit={handleAddNewNoticeSec} className="bg-white p-6 rounded-2xl border border-stone-100 space-y-4">
                                    <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Publicar Novo Aviso</h4>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Título do Aviso</label>
                                      <input 
                                        type="text" 
                                        value={newNoticeSec.title}
                                        onChange={e => setNewNoticeSec({...newNoticeSec, title: e.target.value})}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none"
                                        placeholder="Ex: Reunião de Liderança"
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Mensagem</label>
                                      <textarea 
                                        value={newNoticeSec.content}
                                        onChange={e => setNewNoticeSec({...newNoticeSec, content: e.target.value})}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none min-h-[100px]"
                                        placeholder="Digite aqui o comunicado para a equipe..."
                                        required
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <button 
                                        type="button" 
                                        onClick={() => setIsAddingNoticeSec(false)}
                                        className="px-4 py-2 text-stone-400 font-bold text-xs"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        type="submit"
                                        className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-primary-dark transition-all"
                                      >
                                        Publicar Aviso
                                      </button>
                                    </div>
                                  </form>
                                )}

                                <div className="space-y-4">
                                  {allNotices.filter(n => n.ministry_id === selectedMinistryForManagement.id).length > 0 ? (
                                    allNotices.filter(n => n.ministry_id === selectedMinistryForManagement.id).map(notice => (
                                      <div key={notice.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                          <h5 className="font-bold text-stone-800 mb-1">{notice.title}</h5>
                                          <p className="text-sm text-stone-500 whitespace-pre-wrap">{notice.content}</p>
                                          <span className="text-[10px] font-bold text-stone-400 mt-3 block uppercase tracking-wider">{new Date(notice.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <button 
                                            onClick={() => handleDeleteNoticeSec(notice.id)}
                                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                            title="Excluir Aviso"
                                          >
                                            <Trash2 size={16} />
                                            <span className="text-[11px] font-bold text-red-600 hidden sm:inline">Excluir</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-200">
                                      <p className="text-stone-400 text-sm italic">Nenhum aviso postado ainda.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'congressos' && (
                <CongressManagement 
                  congresses={congresses} 
                  onRefresh={fetchHomeContent} 
                  setConfirmModal={setConfirmModal} 
                  setIsMinistryLoading={setIsMinistryLoading}
                />
              )}

              {activeTab === 'cantina' && (
                <div className="space-y-8">
                  <CantinaAdmin 
                    setConfirmModal={setConfirmModal} 
                    setIsMinistryLoading={setIsMinistryLoading}
                    isCantinaOpen={isCantinaOpen}
                    setIsCantinaOpen={setIsCantinaOpen}
                    cantinaPixCode={cantinaPixCode}
                    setCantinaPixCode={setCantinaPixCode}
                    cantinaEventDate={cantinaEventDate}
                    setCantinaEventDate={setCantinaEventDate}
                  />

                  {/* Mercado Solidário Console displays right below Cantina admin */}
                  <div className="p-6 bg-stone-50 rounded-2xl border border-primary/20 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg flex items-center text-stone-900">
                          <Shirt size={22} className="mr-2 text-primary" />
                          Mercado Solidário
                        </h3>
                        <p className="text-sm text-stone-500">Gerencie a disponibilidade e os cadastros do programa.</p>
                      </div>
                      <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-stone-100 shadow-sm">
                        <span className={`text-xs font-bold uppercase tracking-widest ${isMercadoOpen ? 'text-emerald-500' : 'text-stone-400'}`}>
                          {isMercadoOpen ? 'Inscrições Abertas' : 'Inscrições Fechadas'}
                        </span>
                        <button 
                          onClick={toggleMercadoStatus}
                          className={`w-12 h-6 rounded-full transition-all relative ${isMercadoOpen ? 'bg-emerald-500' : 'bg-stone-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isMercadoOpen ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-stone-700">Candidatos Cadastrados ({mercadoRegistrations.length})</h4>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => fetchData()} className="p-2 text-stone-400 hover:text-primary transition-all">
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b border-stone-100 italic text-stone-400 text-[10px] uppercase tracking-widest">
                              <th className="pb-3 px-2"># Ref</th>
                              <th className="pb-3 px-2">Nome</th>
                              <th className="pb-3 px-2 text-center">Status</th>
                              <th className="pb-3 px-2 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {mercadoRegistrations.map((reg) => (
                              <tr key={reg.id} className="border-b border-stone-50 group hover:bg-stone-100/50 transition-all">
                                <td className="py-4 px-2 font-mono text-stone-400 text-[10px]">#{reg.registration_number || 'N/A'}</td>
                                <td className="py-4 px-2">
                                  <p className="font-bold text-stone-900">{reg.full_name}</p>
                                  <p className="text-[10px] text-stone-500">{new Date(reg.created_at).toLocaleDateString('pt-BR')}</p>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    reg.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                    reg.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                    'bg-yellow-100 text-yellow-600'
                                  }`}>
                                    {reg.status === 'approved' ? 'Aprovado' : reg.status === 'rejected' ? 'Recusado' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button 
                                      className="p-2 text-stone-400 hover:text-stone-900 transition-all"
                                      title="Ver Ficha Completa"
                                      onClick={() => {
                                        setSelectedMercadoRegistration(reg);
                                        setIsMercadoDetailOpen(true);
                                      }}
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleShareMercadoRegistration(reg)}
                                      className="p-2 text-stone-400 hover:text-emerald-500 transition-all"
                                      title="Compartilhar via WhatsApp"
                                    >
                                      <MessageCircle size={16} />
                                    </button>
                                    {reg.status !== 'approved' && (
                                      <button 
                                        onClick={async () => {
                                          const { error } = await supabase.from('mercado_solidario_registrations').update({ status: 'approved' }).eq('id', reg.id);
                                          if (!error) fetchData();
                                        }}
                                        className="p-2 text-stone-400 hover:text-emerald-500 transition-all"
                                        title="Aprovar"
                                      >
                                        <Check size={16} />
                                      </button>
                                    )}
                                    {reg.status !== 'rejected' && (
                                      <button 
                                        onClick={async () => {
                                          const { error } = await supabase.from('mercado_solidario_registrations').update({ status: 'rejected' }).eq('id', reg.id);
                                          if (!error) fetchData();
                                        }}
                                        className="p-2 text-stone-400 hover:text-red-500 transition-all"
                                        title="Recusar/Pendência"
                                      >
                                        <X size={16} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteMercadoRegistration(reg.id)}
                                      className="p-2 text-stone-400 hover:text-red-600 transition-all"
                                      title="Excluir Cadastro"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {mercadoRegistrations.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-stone-400 italic text-sm">
                                  Nenhum cadastro encontrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'secretaria' && (
                <div className="space-y-8">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="sm:size-6" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold">Secretaria</h2>
                            <p className="text-stone-500 text-sm">Administração, Membros e Finanças</p>
                          </div>
                        </div>
                        
                        <div className="flex bg-stone-100 p-1 rounded-xl self-start overflow-x-auto no-scrollbar max-w-full">
                          <button 
                            onClick={() => setActiveSecretariaTab('dashboard')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeSecretariaTab === 'dashboard' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            Dashboard
                          </button>
                          <button 
                            onClick={() => setActiveSecretariaTab('members')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeSecretariaTab === 'members' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            Membros
                          </button>
                          <button 
                            onClick={() => setActiveSecretariaTab('visitors')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeSecretariaTab === 'visitors' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            Visitantes
                          </button>
                          <button 
                            onClick={() => setActiveSecretariaTab('financial')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeSecretariaTab === 'financial' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            Financeiro
                          </button>
                        </div>
                      </div>

                  {activeSecretariaTab === 'dashboard' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <Users size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Total de Membros</p>
                          <h4 className="text-3xl font-bold text-stone-900">{profiles.length}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                            <Heart size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Crianças (Kids)</p>
                          <h4 className="text-3xl font-bold text-stone-900">{kidsCount}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                            <UserPlus size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Visitantes (Mês)</p>
                          <h4 className="text-3xl font-bold text-stone-900">
                            {visitors.filter(v => v.created_at.startsWith(new Date().toISOString().slice(0, 7))).length}
                          </h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                            <TrendingUp size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Entradas (Mês)</p>
                          <h4 className="text-3xl font-bold text-stone-900">
                            R$ {financialTransactions
                              .filter(t => t.type === 'income' && t.date.startsWith(new Date().toISOString().slice(0, 7)))
                              .reduce((acc, t) => acc + t.amount, 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
                            <TrendingDown size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Saídas (Mês)</p>
                          <h4 className="text-3xl font-bold text-stone-900">
                            R$ {financialTransactions
                              .filter(t => t.type === 'expense' && t.date.startsWith(new Date().toISOString().slice(0, 7)))
                              .reduce((acc, t) => acc + t.amount, 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="w-10 h-10 bg-stone-900 text-white rounded-xl flex items-center justify-center mb-4">
                            <DollarSign size={20} />
                          </div>
                          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Saldo Total</p>
                          <h4 className="text-3xl font-bold text-stone-900">
                            R$ {financialTransactions
                              .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-6">Visitantes Recentes</h3>
                          <div className="space-y-4">
                            {visitors.slice(0, 5).map(visitor => (
                              <div key={visitor.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                                <div>
                                  <p className="font-bold text-stone-900">{visitor.full_name}</p>
                                  <p className="text-xs text-stone-500">{visitor.neighborhood}, {visitor.city}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-stone-400">{new Date(visitor.created_at).toLocaleDateString('pt-BR')}</p>
                                  {visitor.wants_to_join_group && (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Grupo WhatsApp</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {visitors.length === 0 && (
                              <p className="text-center py-8 text-stone-400 italic">Nenhum visitante cadastrado ainda.</p>
                            )}
                          </div>
                          <button 
                            onClick={() => setActiveSecretariaTab('visitors')}
                            className="w-full mt-6 py-3 text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors"
                          >
                            Ver todos os visitantes
                          </button>
                        </div>

                        <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-6">Contas a Pagar Próximas</h3>
                          <div className="space-y-4">
                            {billsPayable.filter(b => b.status === 'pending').slice(0, 5).map(bill => (
                              <div key={bill.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                                <div>
                                  <p className="font-bold text-stone-900">{bill.description}</p>
                                  <p className="text-xs text-stone-500">Vencimento: {new Date(bill.due_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-red-600">R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                            ))}
                            {billsPayable.filter(b => b.status === 'pending').length === 0 && (
                              <p className="text-center py-8 text-stone-400 italic">Nenhuma conta pendente.</p>
                            )}
                          </div>
                          <button 
                            onClick={() => setActiveSecretariaTab('financial')}
                            className="w-full mt-6 py-3 text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors"
                          >
                            Gerenciar financeiro
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSecretariaTab === 'members' && (
                      <div className="space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                          <div>
                            <h3 className="text-xl font-bold">Listagem de Membros</h3>
                            <p className="text-xs text-stone-400 mt-1">Gerencie, arquive ou exclua perfis cadastrados no sistema.</p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Toggle Filtro Ativos/Arquivados */}
                            <div className="flex bg-stone-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setMembersFilter('ativos')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                  membersFilter === 'ativos'
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-800'
                                }`}
                              >
                                Ativos
                              </button>
                              <button
                                type="button"
                                onClick={() => setMembersFilter('arquivados')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                  membersFilter === 'arquivados'
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-800'
                                }`}
                              >
                                Arquivados
                              </button>
                            </div>

                            <div className="relative w-full sm:w-64">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                              <input 
                                type="text" 
                                placeholder="Pesquisar membro..."
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-stone-50 border-b border-stone-100">
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Nome</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Cargo/Função</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                              {filteredProfiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-stone-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-xs font-bold text-stone-500 flex-shrink-0">
                                        {profile.full_name.charAt(0)}
                                      </div>
                                      <span className="font-bold text-stone-900 truncate max-w-[200px]">{profile.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {profile.email === 'anderlevita@gmail.com' ? (
                                      <div className="flex items-center space-x-2 bg-stone-100 text-stone-600 px-3 py-1 rounded-full w-fit">
                                        <Lock size={10} className="text-stone-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Administrador</span>
                                      </div>
                                    ) : userRole === 'admin' ? (
                                      <select 
                                        value={profile.role || 'member'}
                                        onChange={(e) => handleUpdateUserRole(profile.id, e.target.value)}
                                        className="text-[10px] bg-stone-100 text-stone-600 px-2 py-1 rounded-full font-medium uppercase tracking-wider outline-none border-none cursor-pointer hover:bg-stone-200 transition-colors"
                                      >
                                        <option value="member">Membro</option>
                                        <option value="admin">Administrador</option>
                                      </select>
                                    ) : (
                                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-1 rounded-full font-medium uppercase tracking-wider">{profile.role || 'member'}</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-3">
                                      <button 
                                        onClick={() => handleViewProfile(profile)}
                                        className="text-primary text-xs font-bold hover:underline py-1 px-2 hover:bg-primary/5 rounded-lg transition-colors"
                                        title="Ver Perfil"
                                      >
                                        Ver Perfil
                                      </button>
                                      
                                      <button
                                        onClick={() => handleToggleArchiveUser(profile.id, !!profile.is_archived)}
                                        className="text-stone-500 hover:text-amber-600 p-2 hover:bg-stone-100 rounded-lg transition-all"
                                        title={profile.is_archived ? "Desarquivar membro" : "Arquivar membro"}
                                      >
                                        <Archive size={16} className={profile.is_archived ? "text-amber-600 fill-amber-100" : ""} />
                                      </button>

                                      {profile.email !== 'anderlevita@gmail.com' && (
                                        <button
                                          onClick={() => handleDeleteUser(profile.id)}
                                          className="text-stone-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
                                          title="Excluir Permanentemente"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-4">
                          {filteredProfiles.map(profile => (
                            <div key={profile.id} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-sm font-bold text-stone-500">
                                    {profile.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-stone-900">{profile.full_name}</p>
                                    {profile.email === 'anderlevita@gmail.com' ? (
                                      <div className="flex items-center space-x-1 mt-1">
                                        <Lock size={10} className="text-stone-400" />
                                        <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Administrador</span>
                                      </div>
                                    ) : userRole === 'admin' ? (
                                      <select 
                                        value={profile.role || 'member'}
                                        onChange={(e) => handleUpdateUserRole(profile.id, e.target.value)}
                                        className="text-[10px] text-stone-400 uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer mt-1"
                                      >
                                        <option value="member">Membro</option>
                                        <option value="admin">Administrador</option>
                                      </select>
                                    ) : (
                                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">{profile.role || 'member'}</p>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleViewProfile(profile)}
                                  className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                  title="Ver Perfil"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-50">
                                <button
                                  onClick={() => handleToggleArchiveUser(profile.id, !!profile.is_archived)}
                                  className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg transition-colors font-bold ${
                                    profile.is_archived 
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                                  }`}
                                >
                                  <Archive size={14} />
                                  {profile.is_archived ? 'Desarquivar' : 'Arquivar'}
                                </button>
                                {profile.email !== 'anderlevita@gmail.com' && (
                                  <button
                                    onClick={() => handleDeleteUser(profile.id)}
                                    className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold"
                                  >
                                    <Trash2 size={14} />
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                  )}

                  {activeSecretariaTab === 'visitors' && (
                    <div className="space-y-8">
                      {/* Planned Visits Section */}
                      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Visitas Planejadas</h3>
                          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                            {plannedVisits.length} Agendadas
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="bg-stone-50 border-bottom border-stone-100">
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Visitante</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Data da Visita</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">WhatsApp</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plannedVisits.map(visit => (
                                <tr key={visit.id} className="hover:bg-stone-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-stone-900">{visit.full_name}</p>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                                      {visit.companion_status === 'alone' ? 'Sozinho' : 'Acompanhado'} • {visit.church_status === 'seeking_community' ? 'Buscando Comunidade' : 'Outra Igreja'}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 text-stone-600 text-sm">{new Date(visit.visit_date).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-6 py-4 text-stone-600 text-sm">{visit.whatsapp}</td>
                                  <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                      visit.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                      visit.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {visit.status === 'pending' ? 'Pendente' :
                                       visit.status === 'contacted' ? 'Contatado' : 'Concluído'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      {visit.status === 'pending' && (
                                        <button 
                                          onClick={async () => {
                                            const { error } = await supabase.from('planned_visits').update({ status: 'contacted' }).eq('id', visit.id);
                                            if (!error) fetchData();
                                          }}
                                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                          title="Marcar como Contatado"
                                        >
                                          <MessageCircle size={14} />
                                        </button>
                                      )}
                                      {visit.status !== 'completed' && (
                                        <button 
                                          onClick={async () => {
                                            const { error } = await supabase.from('planned_visits').update({ status: 'completed' }).eq('id', visit.id);
                                            if (!error) fetchData();
                                          }}
                                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                          title="Concluir Acolhimento"
                                        >
                                          <Check size={14} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            title: 'Excluir Visita',
                                            message: `Deseja excluir o registro de visita de ${visit.full_name}?`,
                                            type: 'danger',
                                            onConfirm: async () => {
                                              const { error } = await supabase.from('planned_visits').delete().eq('id', visit.id);
                                              if (!error) fetchData();
                                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            }
                                          });
                                        }}
                                        className="p-2 text-stone-300 hover:text-red-500 transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {plannedVisits.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">Nenhuma visita planejada para os próximos dias.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                          <h3 className="text-xl font-bold">Visitantes (Sou Novo Aqui)</h3>
                          <div className="relative w-full sm:w-64">
                            <input 
                              type="text" 
                              placeholder="Pesquisar visitante..."
                              value={searchVisitor}
                              onChange={(e) => setSearchVisitor(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="bg-stone-50 border-bottom border-stone-100">
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Nome</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">WhatsApp</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Localização</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Grupo Whats</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Data</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                            {visitors
                              .filter(v => v.full_name.toLowerCase().includes(searchVisitor.toLowerCase()))
                              .map(visitor => (
                              <tr key={visitor.id} className="hover:bg-stone-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-stone-900 truncate max-w-[200px]">{visitor.full_name}</td>
                                <td className="px-6 py-4 text-stone-600 text-sm">{visitor.whatsapp}</td>
                                <td className="px-6 py-4 text-stone-500 text-xs">{visitor.neighborhood}, {visitor.city}</td>
                                <td className="px-6 py-4">
                                  {visitor.wants_to_join_group ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase">Sim</span>
                                  ) : (
                                    <span className="text-[10px] bg-stone-100 text-stone-400 px-2 py-1 rounded-full font-bold uppercase">Não</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-3">
                                    <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                      {new Date(visitor.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        setConfirmModal({
                                          isOpen: true,
                                          title: 'Excluir Visitante',
                                          message: `Tem certeza que deseja excluir o registro de ${visitor.full_name}?`,
                                          type: 'danger',
                                          onConfirm: async () => {
                                            setIsMinistryLoading(true);
                                            try {
                                              const { error } = await supabase
                                                .from('visitors')
                                                .delete()
                                                .eq('id', visitor.id);
                                              if (error) throw error;
                                              fetchData();
                                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            } catch (error) {
                                              console.error('Error deleting visitor:', error);
                                              alert('Erro ao excluir visitante.');
                                            } finally {
                                              setIsMinistryLoading(false);
                                            }
                                          }
                                        });
                                      }}
                                      className="text-stone-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {visitors.filter(v => v.full_name.toLowerCase().includes(searchVisitor.toLowerCase())).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">Nenhum visitante encontrado.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSecretariaTab === 'financial' && (
                    <div className="space-y-8">
                      {/* Form for New Transaction */}
                      {isAddingTransaction && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm"
                        >
                          <h3 className="text-xl font-bold mb-6">Nova Transação</h3>
                          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
                              <input 
                                type="text" 
                                value={newTransaction.description || ''}
                                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Ex: Oferta Culto Domingo"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Valor (R$)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={newTransaction.amount || ''}
                                onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="0,00"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tipo</label>
                              <select 
                                value={newTransaction.type}
                                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'income' | 'expense'})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="income">Entrada</option>
                                <option value="expense">Saída</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
                              <select 
                                value={newTransaction.category}
                                onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="Dízimo">Dízimo</option>
                                <option value="Oferta">Oferta</option>
                                <option value="Doação">Doação</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Eventos">Eventos</option>
                                <option value="Outros">Outros</option>
                              </select>
                            </div>
                            <div className="lg:col-span-4 flex justify-end gap-3">
                              <button 
                                type="button" 
                                onClick={() => setIsAddingTransaction(false)}
                                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button 
                                type="submit" 
                                disabled={isMinistryLoading}
                                className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center"
                              >
                                {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                Salvar Transação
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}

                      {/* Form for Editing Transaction */}
                      {isEditingTransaction && transactionToEdit && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm ring-2 ring-primary/20"
                        >
                          <h3 className="text-xl font-bold mb-6">Editar Transação</h3>
                          <form onSubmit={handleUpdateTransaction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
                              <input 
                                type="text" 
                                value={transactionToEdit.description}
                                onChange={(e) => setTransactionToEdit({...transactionToEdit, description: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Valor (R$)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={transactionToEdit.amount}
                                onChange={(e) => setTransactionToEdit({...transactionToEdit, amount: parseFloat(e.target.value)})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tipo</label>
                              <select 
                                value={transactionToEdit.type}
                                onChange={(e) => setTransactionToEdit({...transactionToEdit, type: e.target.value as 'income' | 'expense'})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="income">Entrada</option>
                                <option value="expense">Saída</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
                              <select 
                                value={transactionToEdit.category}
                                onChange={(e) => setTransactionToEdit({...transactionToEdit, category: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="Dízimo">Dízimo</option>
                                <option value="Oferta">Oferta</option>
                                <option value="Doação">Doação</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Eventos">Eventos</option>
                                <option value="Outros">Outros</option>
                              </select>
                            </div>
                            <div className="lg:col-span-4 flex justify-end gap-3">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setIsEditingTransaction(false);
                                  setTransactionToEdit(null);
                                }}
                                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button 
                                type="submit" 
                                disabled={isMinistryLoading}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center shadow-lg shadow-primary/20"
                              >
                                {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                Confirmar Alteração
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}

                      {/* Form for New Bill */}
                      {isAddingBill && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm"
                        >
                          <h3 className="text-xl font-bold mb-6">Nova Conta a Pagar</h3>
                          <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
                              <input 
                                type="text" 
                                value={newBill.description || ''}
                                onChange={(e) => setNewBill({...newBill, description: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Ex: Conta de Luz"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Valor (R$)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={newBill.amount || ''}
                                onChange={(e) => setNewBill({...newBill, amount: parseFloat(e.target.value)})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="0,00"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Vencimento</label>
                              <input 
                                type="date" 
                                value={newBill.due_date || ''}
                                onChange={(e) => setNewBill({...newBill, due_date: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                                required
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3">
                              <button 
                                type="button" 
                                onClick={() => setIsAddingBill(false)}
                                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button 
                                type="submit" 
                                disabled={isMinistryLoading}
                                className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center"
                              >
                                {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                Salvar Conta
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Fluxo de Caixa (Entradas e Saídas)</h3>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setIsGeneratingReport(true)}
                                className="bg-stone-100 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center hover:bg-stone-200 transition-all"
                              >
                                <FileText size={14} className="mr-2" /> Gerar Relatório
                              </button>
                              <button 
                                onClick={() => setIsAddingTransaction(true)}
                                className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center hover:bg-black transition-all"
                              >
                                <Plus size={14} className="mr-2" /> Nova Transação
                              </button>
                            </div>
                          </div>
                          <div className="bg-white rounded-3xl border border-stone-100 overflow-x-auto shadow-sm">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                              <thead>
                                <tr className="bg-stone-50 border-bottom border-stone-100">
                                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Data</th>
                                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Descrição</th>
                                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</th>
                                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Valor</th>
                                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-50">
                                {financialTransactions.map(transaction => (
                                  <tr key={transaction.id} className="hover:bg-stone-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs text-stone-400">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 font-medium text-stone-900">{transaction.description}</td>
                                    <td className="px-6 py-4">
                                      <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold uppercase">{transaction.category}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        <button 
                                          onClick={() => {
                                            setTransactionToEdit(transaction);
                                            setIsEditingTransaction(true);
                                          }}
                                          className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                          title="Editar Transação"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteTransaction(transaction.id!)}
                                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                          title="Excluir Transação"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {financialTransactions.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">Nenhuma transação registrada.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Contas a Pagar</h3>
                            <button 
                              onClick={() => setIsAddingBill(true)}
                              className="text-primary text-xs font-bold hover:underline"
                            >
                              Adicionar Conta
                            </button>
                          </div>
                          <div className="space-y-4">
                            {billsPayable.map(bill => (
                              <div key={bill.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden group">
                                {bill.status === 'paid' && (
                                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">PAGO</div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-bold text-stone-900">{bill.description}</h4>
                                    <p className="text-xs text-stone-500 flex items-center mt-1">
                                      <Calendar size={12} className="mr-1" /> Vence em {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                  <p className={`font-bold ${bill.status === 'paid' ? 'text-stone-400' : 'text-red-600'}`}>
                                    R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                {bill.status === 'pending' && (
                                  <button 
                                    onClick={() => handleMarkAsPaid(bill.id)}
                                    className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                                  >
                                    Marcar como Pago
                                  </button>
                                )}
                              </div>
                            ))}
                            {billsPayable.length === 0 && (
                              <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                                <AlertCircle size={32} className="mx-auto text-stone-300 mb-2" />
                                <p className="text-stone-400 text-sm italic">Nenhuma conta registrada.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isWritingDevotional} 
        onClose={() => setIsWritingDevotional(false)}
        title="Redigir Devocional / Reflexão"
      >
        <form onSubmit={handleSaveDevotional} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Título da Devocional</label>
            <input 
              type="text" 
              value={newDevotional.title || ''}
              onChange={(e) => setNewDevotional({...newDevotional, title: e.target.value})}
              placeholder="Ex: O Poder da Oração"
              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Conteúdo</label>
            <textarea 
              value={newDevotional.content_text || ''}
              onChange={(e) => setNewDevotional({...newDevotional, content_text: e.target.value})}
              placeholder="Escreva sua reflexão aqui..."
              rows={12}
              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              type="submit"
              disabled={isMinistryLoading}
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center justify-center disabled:opacity-50"
            >
              {isMinistryLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />}
              Enviar para Aprovação
            </button>
            <button 
              type="button"
              onClick={() => setIsWritingDevotional(false)}
              className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isGeneratingReport} 
        onClose={() => setIsGeneratingReport(false)}
        title="Gerar Relatório Mensal"
      >
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Selecione o Mês</label>
            <input 
              type="month" 
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {(() => {
            const [year, month] = reportMonth.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            const monthTransactions = financialTransactions.filter(t => t.date.startsWith(reportMonth));
            const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            
            const monthVisitors = visitors.filter(v => v.created_at.startsWith(reportMonth)).length;
            const monthPrayers = prayerRequests.filter(p => p.created_at.startsWith(reportMonth)).length;
            const monthVisits = plannedVisits.filter(v => v.visit_date.startsWith(reportMonth)).length;

            const reportText = `RELATÓRIO MENSAL - ${monthName.toUpperCase()}\n\n` +
              `FINANCEIRO:\n` +
              `- Entradas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `- Saídas: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `- Saldo: R$ ${(income - expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
              `DETALHAMENTO DE TRANSAÇÕES:\n` +
              monthTransactions.map(t => `${t.type === 'income' ? '[+]' : '[-]'} ${new Date(t.date).toLocaleDateString('pt-BR')} - ${t.description}: R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n') +
              `\n\nESTATÍSTICAS DO MÊS:\n` +
              `- Novos Visitantes: ${monthVisitors}\n` +
              `- Pedidos de Oração: ${monthPrayers}\n` +
              `- Visitas Agendadas: ${monthVisits}\n\n` +
              `DADOS GERAIS:\n` +
              `- Membros Cadastrados: ${profiles.length}\n` +
              `- Crianças Cadastradas: ${kidsCount}\n\n` +
              `Gerado em: ${new Date().toLocaleString('pt-BR')}`;

            return (
              <div className="space-y-6">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 font-mono text-xs whitespace-pre-wrap leading-relaxed text-stone-600 max-h-[300px] overflow-y-auto">
                  {reportText}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(reportText);
                      alert('Relatório copiado para a área de transferência!');
                    }}
                    className="flex-1 bg-stone-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-stone-900/20"
                  >
                    <Copy size={18} className="mr-2" /> Copiar Relatório
                  </button>
                  <button 
                    onClick={() => shareOnWhatsApp(`Relatório Mensal - ${monthName}`, reportText)}
                    className="flex-1 bg-[#25D366] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#128C7E] transition-all flex items-center justify-center shadow-lg shadow-green-600/20"
                  >
                    <Share2 size={18} className="mr-2" /> Compartilhar
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
      >
        <div className="space-y-6">
          <p className="text-stone-600 leading-relaxed">
            {confirmModal.message}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={confirmModal.onConfirm}
              disabled={isMinistryLoading}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center ${
                confirmModal.type === 'danger' 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20' 
                  : 'bg-stone-900 text-white hover:bg-black shadow-stone-900/20'
              } disabled:opacity-50`}
            >
              {isMinistryLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
              Confirmar
            </button>
            <button 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {selectedProfile && (
        <Modal 
          isOpen={!!selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
          title="Perfil do Membro"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center space-x-4 border-b border-stone-100 pb-6">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-xl font-bold text-stone-500">
                {selectedProfile.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900">{selectedProfile.full_name}</h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-widest">
                  {selectedProfile.role || 'member'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">E-mail</p>
                <p className="text-sm font-medium text-stone-700">{selectedProfile.email || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">WhatsApp</p>
                <p className="text-sm font-medium text-stone-700">{selectedProfile.whatsapp || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">CPF</p>
                <p className="text-sm font-medium text-stone-700">{selectedProfile.cpf || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data de Nascimento</p>
                <p className="text-sm font-medium text-stone-700">
                  {selectedProfile.birth_date ? new Date(selectedProfile.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Endereço</p>
              <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                <p className="text-sm text-stone-700">
                  {selectedProfile.address ? `${selectedProfile.address}, ${selectedProfile.number || 'S/N'}` : 'Endereço não informado'}
                </p>
                <p className="text-sm text-stone-500">
                  {selectedProfile.neighborhood && `${selectedProfile.neighborhood} - `}{selectedProfile.city} {selectedProfile.cep && `(CEP: ${selectedProfile.cep})`}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const PlannedVisitModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    visit_date: '',
    whatsapp: '',
    companion_status: 'alone' as 'alone' | 'accompanied',
    church_status: 'seeking_community' as 'other_church' | 'seeking_community'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('planned_visits')
        .insert([formData]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          full_name: '',
          visit_date: '',
          whatsapp: '',
          companion_status: 'alone',
          church_status: 'seeking_community'
        });
        onClose();
      }, 3000);
    } catch (error: any) {
      alert('Erro ao planejar visita: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-stone-900 mb-2">Planeje sua Visita</h2>
                  <p className="text-stone-500 text-sm">Queremos te receber da melhor forma possível. Conte-nos um pouco sobre sua visita.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={24} className="text-stone-400" />
                </button>
              </div>

              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-2">Visita Planejada!</h3>
                  <p className="text-stone-500">Obrigado por nos avisar. Nossa equipe de recepção estará te esperando!</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Data da Visita</label>
                      <input 
                        type="date" 
                        required
                        value={formData.visit_date}
                        onChange={(e) => setFormData({...formData, visit_date: e.target.value})}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">WhatsApp</label>
                      <input 
                        type="tel" 
                        required
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Como você virá?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, companion_status: 'alone'})}
                        className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all ${
                          formData.companion_status === 'alone' 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        Sozinho
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, companion_status: 'accompanied'})}
                        className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all ${
                          formData.companion_status === 'accompanied' 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        Acompanhado
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Sua relação com a igreja</label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, church_status: 'seeking_community'})}
                        className={`py-3 px-4 rounded-xl text-sm font-bold border text-left transition-all ${
                          formData.church_status === 'seeking_community' 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        Buscando uma comunidade / Fazer parte
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, church_status: 'other_church'})}
                        className={`py-3 px-4 rounded-xl text-sm font-bold border text-left transition-all ${
                          formData.church_status === 'other_church' 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        Pertenço a outra igreja
                      </button>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center mt-4"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Confirmar Planejamento'
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex justify-center space-x-2 sm:space-x-4 md:space-x-8">
      {[
        { label: 'Dias', value: timeLeft.days },
        { label: 'Horas', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Seg', value: timeLeft.seconds }
      ].map((item, idx) => (
        <div key={idx} className="text-center min-w-[60px] sm:min-w-[80px]">
          <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-1">{item.value}</div>
          <div className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-widest">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

const CongressCoupon = ({ registration, congress, onClose }: { registration: CongressRegistration, congress: Congress, onClose: () => void }) => {
  const handleShare = () => {
    const text = `Meu cupom de inscrição para o ${congress.title}!\nSérie: ${registration.coupon_serial}`;
    shareOnWhatsApp(congress.title, text, window.location.href);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center p-2 sm:p-4 bg-white rounded-3xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="text-green-600" size={32} />
        </div>
        
        <h3 className="text-xl font-black text-stone-900 uppercase italic mb-1">{congress.title}</h3>
        <p className="text-stone-500 text-xs mb-6 font-medium uppercase tracking-widest">Inscrição Confirmada</p>
        
        <div className="bg-stone-50 p-6 sm:p-8 rounded-[32px] border-2 border-dashed border-stone-200 mb-6 w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-stone-900 to-primary" />
          
          <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl shadow-sm">
            <QRCodeSVG 
              value={`VERIFY:${registration.coupon_serial}`} 
              size={140}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Participante</p>
              <p className="font-bold text-stone-900 text-sm">{registration.personal_data.full_name}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Número de Série</p>
              <p className="font-mono text-base font-black text-primary">{registration.coupon_serial}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={handleShare}
            className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all text-sm"
          >
            <Share2 size={18} />
            Compartilhar
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-stone-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all text-sm"
          >
            <X size={18} />
            Fechar
          </button>
        </div>
        <p className="mt-6 text-[9px] text-stone-400 leading-relaxed max-w-[200px]">
          Apresente este QR Code na recepção do evento para realizar o seu check-in.
        </p>
      </div>
    </Modal>
  );
};

const CongressSection = ({ 
  congresses, 
  onRegister,
  user
}: { 
  congresses: Congress[], 
  onRegister: (congress: Congress) => void,
  user: any
}) => {
  const [userRegistrations, setUserRegistrations] = useState<CongressRegistration[]>([]);
  const [selectedRegForCoupon, setSelectedRegForCoupon] = useState<CongressRegistration | null>(null);
  const [statusCheckPhone, setStatusCheckPhone] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<any | null>(null);
  const [selectedRegForVoucher, setSelectedRegForVoucher] = useState<any | null>(null);

  const handleCheckStatus = async (congressId: string) => {
    if (!statusCheckPhone) return;
    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const { data, error } = await supabase
        .from('congress_registrations')
        .select('*')
        .eq('congress_id', congressId)
        .filter('personal_data->>whatsapp', 'eq', statusCheckPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setStatusResult(data[0]);
      } else {
        alert('Nenhuma inscrição encontrada para este número de WhatsApp.');
      }
    } catch (error: any) {
      console.error('Error checking status:', error);
      alert('Erro ao consultar status: ' + error.message);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchRegs = async () => {
        try {
          const { data, error } = await supabase
            .from('congress_registrations')
            .select('*')
            .eq('user_id', user.id);
          if (data) setUserRegistrations(data);
          if (error) console.warn('Aviso ao buscar inscrições:', error.message);
        } catch (err: any) {
          console.warn('Erro ao buscar inscrições do usuário:', err?.message || err);
        }
      };
      fetchRegs();
    }
  }, [user]);

  const activeCongresses = congresses.filter(c => c.is_active);
  if (activeCongresses.length === 0) return null;

  return (
    <section id="congressos" className="bg-stone-950">
      {selectedRegForCoupon && (
        <CongressCoupon 
          registration={selectedRegForCoupon} 
          congress={congresses.find(c => c.id === selectedRegForCoupon.congress_id)!} 
          onClose={() => setSelectedRegForCoupon(null)} 
        />
      )}
      {selectedRegForVoucher && (
        <Modal 
          isOpen={!!selectedRegForVoucher} 
          onClose={() => setSelectedRegForVoucher(null)} 
          title=""
          maxWidth="max-w-md"
        >
          <CongressVoucher 
            congress={selectedRegForVoucher.congress} 
            registration={selectedRegForVoucher.reg} 
            onClose={() => setSelectedRegForVoucher(null)}
          />
        </Modal>
      )}
      {activeCongresses.map((congress) => {
        const userReg = userRegistrations.find(r => r.congress_id === congress.id);
        const isPaid = userReg?.payment_status === 'paid';

        return (
          <div key={congress.id} className="relative">
            {/* Hero Section */}
            <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src={congress.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2000"} 
                  alt={congress.title}
                  className="w-full h-full object-cover opacity-40"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/40 to-stone-950" />
              </div>

              <div className="relative z-10 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-6"
                >
                  <span className="inline-block bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                    {isPaid ? 'Inscrição Confirmada' : 'Inscrições Abertas'}
                  </span>
                  <h2 className="text-4xl sm:text-6xl md:text-8xl font-bold text-white tracking-tighter mb-4 uppercase italic">
                    {congress.title}
                  </h2>
                  <p className="text-xl md:text-2xl text-white/80 font-medium mb-12">
                    {new Date(congress.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="mb-16"
                >
                  {isPaid ? (
                    <button 
                      onClick={() => setSelectedRegForCoupon(userReg)}
                      className="bg-green-500 text-white px-12 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-green-600 transition-all shadow-2xl shadow-green-500/20 flex items-center justify-center gap-3"
                    >
                      <Check size={24} />
                      Ver Meu Cupom
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-wrap justify-center gap-4">
                        <button 
                          onClick={() => onRegister(congress)}
                          className="bg-white text-stone-950 px-12 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-2xl shadow-white/10"
                        >
                          {userReg?.payment_status === 'pending' ? 'Aguardando Aprovação' : 'Inscreva-se Já!'}
                        </button>
                        <button 
                          onClick={() => shareOnWhatsApp(congress.title, `Olá! Vem aí o ${congress.title}! Participe conosco e faça sua inscrição.`, `${window.location.origin}/#congressos`)}
                          className="bg-green-600 text-white p-5 rounded-full hover:bg-green-700 transition-all shadow-2xl shadow-green-500/20 flex items-center justify-center"
                          title="Compartilhar Congresso"
                        >
                          <Share2 size={24} />
                        </button>
                      </div>
                      
                      {congress.organizer_phone && (
                        <button 
                          onClick={() => {
                            const text = `Olá! Tenho interesse no ${congress.title} e gostaria de tirar algumas dúvidas.`;
                            window.open(`https://wa.me/${congress.organizer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                        >
                          <MessageCircle size={18} />
                          Falar com o Organizador
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <CountdownTimer targetDate={congress.date} />
                </motion.div>
              </div>
            </div>

          {/* About Section */}
          <div className="bg-red-600 py-16 md:py-24 text-white text-center px-4">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-4xl md:text-6xl font-black uppercase italic mb-8">Sobre</h3>
              <div className="w-24 h-1 bg-white/30 mx-auto mb-12" />
              <p className="text-lg md:text-xl leading-relaxed font-medium whitespace-pre-wrap">
                {congress.about_text || "Seja bem-vindo ao nosso encontro especial. Um tempo de renovo, aprendizado e comunhão profunda."}
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="py-16 md:py-24 bg-stone-950 text-white px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Status Check Section */}
              <div className="lg:col-span-3 mb-8">
                <div className="bg-stone-900/50 p-6 md:p-8 rounded-[32px] border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h4 className="text-xl font-bold uppercase italic mb-2">Já se inscreveu?</h4>
                    <p className="text-stone-400 text-sm">Consulte o status da sua inscrição usando seu WhatsApp.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <input 
                      type="text" 
                      placeholder="Seu WhatsApp (ex: 5511...)"
                      value={statusCheckPhone}
                      onChange={(e) => setStatusCheckPhone(e.target.value)}
                      className="w-full md:w-64 bg-stone-800 border border-stone-700 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button 
                      onClick={() => handleCheckStatus(congress.id)}
                      disabled={checkingStatus}
                      className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {checkingStatus ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                      Consultar
                    </button>
                  </div>
                </div>

                {statusResult && statusResult.congress_id === congress.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <div className="bg-white rounded-3xl p-5 md:p-6 text-stone-900 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          statusResult.payment_status === 'paid' ? 'bg-green-100 text-green-600' :
                          statusResult.payment_status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {statusResult.payment_status === 'paid' ? <CheckCircle size={24} /> :
                           statusResult.payment_status === 'rejected' ? <X size={24} /> :
                           <Clock size={24} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase">Status da Inscrição</p>
                          <p className="text-lg font-bold">
                            {statusResult.payment_status === 'paid' ? 'Confirmada' :
                             statusResult.payment_status === 'rejected' ? 'Pagamento Rejeitado' :
                             'Em Análise'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedRegForVoucher({ reg: statusResult, congress })}
                        className="w-full md:w-auto bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all"
                      >
                        Ver Comprovante Completo
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-8">
                <h4 className="text-2xl font-bold uppercase italic flex items-center">
                  <Clock className="mr-3 text-primary" />
                  Cronograma
                </h4>
                <div className="space-y-4">
                  {congress.schedule.map((item, idx) => (
                    <div key={idx} className="flex items-start border-l-2 border-stone-800 pl-6 py-2">
                      <span className="font-bold text-primary w-16 shrink-0">{item.time}</span>
                      <span className="text-stone-300">{item.activity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-2xl font-bold uppercase italic flex items-center">
                  <MapPin className="mr-3 text-primary" />
                  Localização
                </h4>
                <div className="bg-stone-900/50 p-8 rounded-[32px] border border-stone-800">
                  <p className="text-stone-300 leading-relaxed mb-6">{congress.location_details}</p>
                  <div className="pt-6 border-t border-stone-800">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Como chegar:</p>
                    <p className="text-sm text-stone-400">{congress.how_to_get_there}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-2xl font-bold uppercase italic flex items-center">
                  <CreditCard className="mr-3 text-primary" />
                  Inscrições
                </h4>
                <div className="bg-stone-900 p-8 rounded-[32px] border border-stone-800 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-bold uppercase tracking-widest text-sm">Normal</span>
                    <span className="text-3xl font-black text-white">R$ {congress.price?.toFixed(2) || "50,00"}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium text-stone-500 uppercase tracking-widest">
                      <span>À vista via pix</span>
                      <span>R$ {congress.price?.toFixed(2) || "50,00"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-stone-500 uppercase tracking-widest">
                      <span>Cartão de crédito</span>
                      <span>R$ {congress.price?.toFixed(2) || "50,00"}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRegister(congress)}
                    className="w-full bg-white text-stone-950 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                  >
                    Inscreva-se Já!
                  </button>
                  {congress.organizer_phone && (
                    <button 
                      onClick={() => {
                        const text = `Olá! Tenho interesse no ${congress.title} e gostaria de tirar algumas dúvidas.`;
                        window.open(`https://wa.me/${congress.organizer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="w-full border-2 border-stone-800 text-stone-400 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-stone-800 hover:text-white transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} />
                      Falar com o Organizador
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

const CongressVoucher = ({ 
  congress, 
  registration,
  onClose 
}: { 
  congress: Congress, 
  registration: any,
  onClose?: () => void
}) => {
  const voucherRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isPaid = registration.payment_status === 'paid' || registration.payment_status === 'confirmed';
  const isRejected = registration.payment_status === 'rejected';
  const fullName = registration.personal_data?.full_name || registration.profiles?.full_name || 'Participante';
  const cpf = registration.personal_data?.cpf || '';
  const whatsapp = registration.personal_data?.whatsapp || '';

  const handleShare = () => {
    let statusText = '';
    if (congress.is_free) statusText = 'Entrada Gratuita - Confirmada! ✅';
    else if (isPaid) statusText = 'Inscrição Confirmada! ✅';
    else if (isRejected) statusText = 'Pagamento Rejeitado ❌ - Necessário Regularizar';
    else statusText = 'Pagamento em Análise ⏳';

    const text = `Olá! Aqui está o status da minha inscrição no ${congress.title}! 🎉\n\nParticipante: ${fullName}\nStatus: ${statusText}\n\n${isRejected ? 'Por favor, entre em contato para regularizar o pagamento.' : 'Nos vemos lá!'}`;
    
    const targetPhone = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportImage = async () => {
    if (!voucherRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(voucherRef.current, {
        cacheBust: true,
        backgroundColor: '#f5f5f4', // stone-100
        style: {
          borderRadius: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `comprovante-${fullName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();

      // Se o navegador suportar, tenta compartilhar o arquivo
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const arr = dataUrl.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const file = new File([blob], 'comprovante.png', { type: mime });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Meu Comprovante - ' + congress.title,
              text: 'Aqui está minha inscrição para o ' + congress.title
            });
          }
        } catch (shareErr) {
          console.info('Compartilhamento via arquivo não realizado ou cancelado:', shareErr);
        }
      }
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Erro ao gerar imagem para compartilhamento.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div ref={voucherRef} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xl p-0">
        <div className={`
          ${isPaid 
            ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/60 text-emerald-950 border-b border-emerald-200' 
            : isRejected 
              ? 'bg-gradient-to-b from-rose-50 to-rose-100/60 text-rose-950 border-b border-rose-200' 
              : 'bg-gradient-to-b from-amber-50 to-amber-100/60 text-stone-900 border-b border-amber-200'} 
          p-6 text-center transition-colors duration-500
        `}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPaid 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
              : isRejected 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' 
                : 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
          }`}>
            {isPaid ? <CheckCircle size={32} /> : 
             isRejected ? <X size={32} /> : 
             <Clock size={32} />}
          </div>
          <h4 className="text-xl font-bold mb-1 text-stone-900">
            {isPaid ? 'Inscrição Confirmada!' : isRejected ? 'Pagamento Rejeitado' : 'Inscrição Realizada!'}
          </h4>
          <p className={`text-[10px] uppercase tracking-widest font-bold ${
            isPaid ? 'text-emerald-700' : isRejected ? 'text-rose-700' : 'text-amber-800'
          }`}>Comprovante de Inscrição</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Evento</p>
            <p className="text-lg font-bold text-stone-900">{congress.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Participante</p>
              <p className="font-bold text-stone-800">{fullName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Data</p>
              <p className="font-bold text-stone-800">{new Date(registration.created_at || Date.now()).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isPaid ? 'bg-green-50 border-green-100' : 
            isRejected ? 'bg-red-50 border-red-100' : 
            'bg-yellow-50 border-yellow-100'
          }`}>
            <div className="flex items-center space-x-3">
              {isPaid ? <ShieldCheck size={20} className="text-green-600" /> : 
               isRejected ? <AlertCircle size={20} className="text-red-600" /> : 
               <Clock size={20} className="text-yellow-600" />}
              <div>
                <p className={`text-xs font-bold ${
                  isPaid ? 'text-green-800' : 
                  isRejected ? 'text-red-800' : 
                  'text-yellow-800'
                }`}>
                  {congress.is_free ? 'Entrada Gratuita' : (isPaid ? 'Pagamento Confirmado' : isRejected ? 'Pagamento Recusado' : 'Pagamento em Análise')}
                </p>
                <p className={`text-[10px] ${
                  isPaid ? 'text-green-700' : 
                  isRejected ? 'text-red-700' : 
                  'text-yellow-700'
                }`}>
                  {congress.is_free || isPaid ? 'Sua participação está garantida. Apresente este QR Code na entrada.' : 
                   isRejected ? 'Houve um problema com seu comprovante. Entre em contato com a organização.' : 
                   'Seu comprovante foi enviado e será validado em breve.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 flex flex-col items-center">
            <div className="bg-stone-50 p-4 rounded-2xl mb-4">
              <QRCodeSVG 
                value={`REGISTRATION:${registration.id}`}
                size={120}
                level="H"
              />
            </div>
            <p className="text-[10px] text-stone-400 font-mono uppercase">
              {registration.coupon_serial ? `CUPOM: ${registration.coupon_serial}` : `ID: ${registration.id?.slice(0, 8).toUpperCase() || 'PENDENTE'}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-3">
        <button 
          onClick={handleExportImage}
          disabled={isExporting}
          className="w-full bg-stone-900 text-white py-4 rounded-full font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:bg-black transition-all disabled:opacity-50"
        >
          <Download size={20} />
          <span>{isExporting ? 'Processando...' : 'Salvar/Compartilhar Imagem'}</span>
        </button>
        <button 
          onClick={handleShare}
          className="w-full bg-[#25D366] text-white py-4 rounded-full font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 hover:bg-[#1ebe57] transition-all"
        >
          <Share2 size={20} />
          <span>Enviar p/ WhatsApp</span>
        </button>
        {onClose && (
          <button 
            onClick={onClose} 
            className="w-full bg-stone-100 text-stone-600 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
};

const CongressRegistrationModal = ({ 
  isOpen, 
  onClose, 
  congress,
  user,
  onSuccess
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  congress: Congress | null,
  user: any,
  onSuccess: () => void
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [workshops, setWorkshops] = useState<CongressWorkshop[]>([]);
  const [lastRegistration, setLastRegistration] = useState<any>(null);
  const [formData, setFormData] = useState({
    personal: {
      full_name: '',
      email: '',
      whatsapp: '',
      birth_date: '',
      cpf: ''
    },
    address: {
      cep: '',
      address: '',
      number: '',
      neighborhood: '',
      city: ''
    },
    t_shirt_size: 'M',
    selected_workshops: [] as string[],
    image_use_accepted: false,
    payment_proof_url: ''
  });

  useEffect(() => {
    if (congress && isOpen) {
      const fetchWorkshops = async () => {
        try {
          const { data } = await supabase
            .from('congress_workshops')
            .select('*')
            .eq('congress_id', congress.id);
          if (data) setWorkshops(data);
        } catch (err) {
          console.warn('Erro ao carregar workshops:', err);
        }
      };
      fetchWorkshops();

      if (user) {
        const fetchUserProfile = async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (data) {
              setFormData(prev => ({
                ...prev,
                personal: {
                  full_name: data.full_name || '',
                  email: user.email || '',
                  whatsapp: data.whatsapp || '',
                  birth_date: data.birth_date || '',
                  cpf: data.cpf || ''
                },
                address: {
                  cep: data.cep || '',
                  address: data.address || '',
                  number: data.number || '',
                  neighborhood: data.neighborhood || '',
                  city: data.city || ''
                }
              }));
            }
          } catch (err) {
            console.warn('Erro ao carregar perfil do congressista:', err);
          }
        };
        fetchUserProfile();
      }
    }
  }, [congress, isOpen, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'anon'}-${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      // Tenta fazer upload para o bucket 'congress-proofs'
      const { error: uploadError } = await supabase.storage
        .from('congress-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('congress-proofs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, payment_proof_url: publicUrl }));
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      const errorMsg = error.message === 'Bucket not found' 
        ? 'Erro: O bucket "congress-proofs" não existe. Crie-o no painel de Storage do Supabase.' 
        : 'Erro ao carregar comprovante: ' + error.message;
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!congress) return;
    setLoading(true);
    try {
      // 1. Verificar se este CPF já está inscrito para evitar duplicidade no frontend
      // (Embora agora exista uma constraint no banco, essa checagem dá um feedback melhor)
      const { data: existingReg, error: checkError } = await supabase
        .from('congress_registrations')
        .select('id')
        .eq('congress_id', congress.id)
        .eq('personal_data->>cpf', formData.personal.cpf)
        .maybeSingle();

      if (checkError) console.error('Erro ao verificar inscrição existente:', checkError);
      
      if (existingReg) {
        alert('Este CPF já possui uma inscrição pendente ou confirmada para este congresso.');
        setLoading(false);
        return;
      }

      const regData = {
        user_id: user?.id || null,
        congress_id: congress.id,
        personal_data: formData.personal,
        address: formData.address,
        t_shirt_size: congress.has_t_shirts ? formData.t_shirt_size : null,
        selected_workshops: formData.selected_workshops,
        image_use_accepted: formData.image_use_accepted,
        payment_proof_url: congress.is_free ? null : formData.payment_proof_url,
        payment_status: congress.is_free ? 'confirmed' : 'pending'
      };

      const { data, error } = await supabase
        .from('congress_registrations')
        .insert([regData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          alert('Este CPF já está inscrito neste congresso.');
          return;
        }
        throw error;
      }
      
      setLastRegistration(data);
      onSuccess();
      setStep(4); // Ir para o comprovante
    } catch (error: any) {
      console.error('Error registering for congress:', error);
      alert('Erro ao realizar inscrição: ' + (error.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  if (!congress) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="-m-6 sm:-m-8 relative">
        {/* Banner de fundo personalizado */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden rounded-3xl">
          {congress.banner_url && (
            <img 
              src={congress.banner_url} 
              className="w-full h-full object-cover blur-sm" 
              alt="" 
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Header with Steps */}
        <div className="bg-[#6A1B9A] p-6 text-white rounded-t-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">{congress.title} 2026</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="flex items-center justify-between px-4">
            {[
              { id: 1, label: 'Inscrições' },
              { id: 2, label: 'Participantes' },
              { id: 3, label: 'Pagamento' }
            ].map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center flex-1 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 ${step >= s.id ? 'bg-white text-[#6A1B9A]' : 'bg-[#8E24AA] text-white/60'}`}>
                  {s.id}
                </div>
                <span className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${step >= s.id ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
                {idx < 2 && <div className={`absolute top-4 left-[60%] right-[-40%] h-[2px] ${step > s.id ? 'bg-white' : 'bg-[#8E24AA]'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-stone-50 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900">Normal</h4>
                  <p className="text-stone-500 font-bold">R$ {congress.price?.toFixed(2) || "50,00"}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:bg-stone-50"
                  >
                    -
                  </button>
                  <span className="font-bold text-xl">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-primary hover:bg-stone-50"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="text-stone-500 font-bold uppercase text-xs tracking-widest">Total</span>
                <span className="text-2xl font-black text-[#6A1B9A]">
                  {congress.is_free ? 'GRÁTIS' : `R$ ${(congress.price * quantity).toFixed(2)}`}
                </span>
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-stone-900 text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-black transition-all">Continuar</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 uppercase tracking-widest text-xs text-stone-400">Dados Pessoais</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Nome Completo"
                      value={formData.personal.full_name}
                      onChange={(e) => setFormData({...formData, personal: {...formData.personal, full_name: e.target.value}})}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 ml-1">WhatsApp</label>
                      <input 
                        type="text" 
                        placeholder="(00) 00000-0000"
                        value={formData.personal.whatsapp}
                        onChange={(e) => setFormData({...formData, personal: {...formData.personal, whatsapp: e.target.value}})}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 ml-1">Data de Nascimento</label>
                      <input 
                        type="date" 
                        value={formData.personal.birth_date}
                        onChange={(e) => setFormData({...formData, personal: {...formData.personal, birth_date: e.target.value}})}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 ml-1">CPF</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={formData.personal.cpf}
                      onChange={(e) => setFormData({...formData, personal: {...formData.personal, cpf: e.target.value}})}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-stone-900 uppercase tracking-widest text-xs text-stone-400">
                    {congress.has_t_shirts ? 'Cidade e Tamanho' : 'Cidade'}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input 
                      type="text" 
                      placeholder="Informe sua cidade"
                      value={formData.address.city}
                      onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                    />
                  </div>
                  {congress.has_t_shirts && (
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Tamanho da Camiseta</label>
                      <div className="flex flex-wrap gap-2">
                        {['PP', 'P', 'M', 'G', 'GG', 'XG'].map(size => (
                          <button 
                            key={size}
                            type="button"
                            onClick={() => setFormData({...formData, t_shirt_size: size})}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${formData.t_shirt_size === size ? 'bg-[#6A1B9A] text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {workshops.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-stone-900 uppercase tracking-widest text-xs text-stone-400">Oficinas</h4>
                  <div className="space-y-2">
                    {workshops.map(workshop => (
                      <label key={workshop.id} className="flex items-center p-3 bg-white rounded-xl border border-stone-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData.selected_workshops.includes(workshop.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, selected_workshops: [...formData.selected_workshops, workshop.id]});
                            else setFormData({...formData, selected_workshops: formData.selected_workshops.filter(id => id !== workshop.id)});
                          }}
                          className="w-5 h-5 rounded border-stone-300 text-[#6A1B9A] focus:ring-[#6A1B9A]"
                        />
                        <span className="ml-3 text-sm font-bold text-stone-700">{workshop.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-white rounded-xl border border-stone-200">
                <label className="flex items-start cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.image_use_accepted}
                    onChange={(e) => setFormData({...formData, image_use_accepted: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-stone-300 text-[#6A1B9A] focus:ring-[#6A1B9A]"
                  />
                  <span className="ml-3 text-[10px] text-stone-500 leading-relaxed">
                    Autorizo o uso da minha imagem em fotos e vídeos capturados durante o evento para fins de divulgação e registros da igreja.
                  </span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-stone-200 text-stone-600 py-4 rounded-full font-bold uppercase tracking-widest">Voltar</button>
                <button 
                  onClick={() => {
                    if (congress.is_free) {
                      handleSubmit();
                    } else {
                      setStep(3);
                    }
                  }} 
                  disabled={!formData.image_use_accepted}
                  className="flex-1 bg-stone-900 text-white py-4 rounded-full font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {congress.is_free ? 'Finalizar Inscrição' : 'Próximo'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="p-6 bg-[#6A1B9A] text-white rounded-3xl shadow-xl">
                <h4 className="font-bold mb-4 uppercase tracking-widest text-xs text-white/60">Dados para Pagamento</h4>
                <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                  {congress.payment_info || "Chave PIX: 00.000.000/0001-00\nFavorecido: Mevam Itapema"}
                </p>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total a pagar:</p>
                  <p className="text-2xl font-black">R$ {congress.price?.toFixed(2) || "50,00"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest">Foto do Comprovante</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label 
                    htmlFor="proof-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-stone-200 rounded-3xl cursor-pointer hover:bg-stone-50 transition-all overflow-hidden bg-white"
                  >
                    {formData.payment_proof_url ? (
                      <div className="relative w-full h-full group">
                        <img src={formData.payment_proof_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold uppercase">Trocar Foto</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-stone-300 mb-2" size={32} />
                        <span className="text-xs text-stone-400 font-bold uppercase tracking-widest">Clique para carregar foto</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-stone-200 text-stone-600 py-4 rounded-full font-bold uppercase tracking-widest">Voltar</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !formData.payment_proof_url || !formData.image_use_accepted}
                  className="flex-1 bg-[#6A1B9A] text-white py-4 rounded-full font-bold uppercase tracking-widest shadow-lg shadow-[#6A1B9A]/20 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Finalizar'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && lastRegistration && (
            <CongressVoucher 
              congress={congress} 
              registration={lastRegistration} 
              onClose={() => {
                onClose();
                setStep(1);
                setFormData({
                  personal: { full_name: '', email: '', whatsapp: '', birth_date: '', cpf: '' },
                  address: { cep: '', address: '', number: '', neighborhood: '', city: '' },
                  t_shirt_size: 'M',
                  selected_workshops: [],
                  image_use_accepted: false,
                  payment_proof_url: ''
                });
                setLastRegistration(null);
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

const MercadoSolidarioSection = ({ onOpen }: { onOpen: () => void }) => {
  return (
    <section id="mercado-solidario" className="py-16 bg-emerald-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-stretch border border-emerald-100">
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
            <span className="text-emerald-600 font-bold uppercase tracking-widest text-sm mb-4">Ação Social</span>
            <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight">Mercado <span className="text-emerald-600">Solidário</span></h2>
            <p className="text-stone-600 text-lg mb-8 leading-relaxed">
              Iniciativa para levar alimento e dignidade às famílias em situação de vulnerabilidade em nossa cidade. Através do cadastro, avaliamos as necessidades e promovemos o apoio necessário.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onOpen}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-emerald-200 flex items-center justify-center group"
              >
                Prosseguir com Inscrição
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => shareOnWhatsApp('Mercado Solidário - Mevam Itapema', 'Participe do Mercado Solidário! Uma iniciativa para levar alimento e dignidade às famílias em situação de vulnerabilidade.', `${window.location.origin}/#mercado-solidario`)}
                className="bg-emerald-100 text-emerald-700 px-6 py-4 rounded-full font-bold hover:bg-emerald-200 transition-all flex items-center justify-center"
                title="Compartilhar Mercado Solidário"
              >
                <Share2 size={24} className="mr-2" />
                Compartilhar
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2 relative min-h-[350px]">
            <img 
              src="https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/sign/mercado%20solidario/ChatGPT%20Image%2019%20de%20abr.%20de%202026,%2010_55_12.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV83MTg0NDIzOS05ZGQ3LTQ3NzQtOTA2Ny1mZmE3MjVmM2QzOGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZXJjYWRvIHNvbGlkYXJpby9DaGF0R1BUIEltYWdlIDE5IGRlIGFici4gZGUgMjAyNiwgMTBfNTVfMTIucG5nIiwiaWF0IjoxNzc2NjkzMDE1LCJleHAiOjE5MzQzNzMwMTV9.lbM8ulbcN7VgXRYp-MnVZWv3po6FxPnFYRvARPmLVeo" 
              alt="Mercado Solidário" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-emerald-900/10" />
          </div>
        </div>
      </div>
    </section>
  );
};

const CantinaSection = ({ 
  products, 
  cantinaEventDate,
  onOpenCantina 
}: { 
  products: any[], 
  cantinaEventDate?: string,
  onOpenCantina: () => void 
}) => {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <section id="cantina-secao" className="py-20 bg-stone-50 border-t border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4">
        {cantinaEventDate && (
          <div className="mb-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/25 text-amber-800 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <span>Retirada / Data do Evento: <strong className="text-amber-900 font-black">{cantinaEventDate}</strong></span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-stone-600 font-bold uppercase tracking-widest text-xs mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
              Comunhão & Missões
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-none mb-3">
              Cantina <span className="text-stone-900 underline decoration-stone-400 decoration-wavy underline-offset-8">Ação Social</span>
            </h2>
            <p className="text-stone-500 text-sm max-w-xl">
              Apoie nosso ministério de ação social e desfrute de ótimos momentos de comunhão. Veja nossas delícias fresquinhas disponíveis hoje!
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={onOpenCantina}
              className="bg-stone-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-md shadow-stone-900/15 active:scale-95"
            >
              <Coffee size={14} />
              Comprar Vouchers Online
            </button>
          </div>
        </div>

        {/* Canteen Products Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/60 shadow-sm max-w-md mx-auto">
            <Coffee className="mx-auto text-stone-300 mb-4" size={44} />
            <h4 className="text-stone-800 font-bold text-sm mb-1">Cardápio em Preparação</h4>
            <p className="text-stone-500 text-xs text-center">
              Fique atento! Novas delícias estão sendo preparadas pela nossa equipe de cantinas e estarão em breve no ar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {products.slice(0, 6).map((product) => (
              <div 
                key={product.id}
                className="bg-white rounded-[32px] border border-stone-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group"
              >
                {/* Image panel */}
                <div className="h-56 bg-stone-100 relative overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                      <Coffee size={40} className="mb-2" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Sem foto</span>
                    </div>
                  )}
                  {product.quantity_available <= 5 && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                      {product.quantity_available === 0 ? 'Esgotado' : `Restam apenas ${product.quantity_available}`}
                    </div>
                  )}
                </div>

                {/* Content body */}
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between">
                  <div className="space-y-2">
                    <h3 className="font-black text-stone-900 text-lg sm:text-xl tracking-tight leading-tight uppercase italic duration-300 group-hover:text-stone-700">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description || 'Uma deliciosa pedida preparada com todo amor para abençoar a nossa igreja.'}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-stone-100/80 pt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Valor unitário</p>
                      <p className="text-lg font-black text-stone-900 leading-none mt-0.5">{formatPrice(product.price)}</p>
                    </div>
                    
                    <button 
                      onClick={onOpenCantina}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5"
                    >
                      Comprar <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const MercadoSolidarioModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    full_name: '', cpf: '', rg: '', birth_date: '', civil_status: 'Casado(a)', phone: '', email: '',
    street: '', number: '', neighborhood: '', city: 'Itapema', cep: '', reference_point: '', housing_type: 'Própria', rent_value: '',
    family_members: [],
    total_family_income: '', income_origin: 'Autônomo', income_origin_details: '',
    vulnerability_factors: [], vulnerability_other: '',
    expense_rent: '', expense_water: '', expense_electricity: '', expense_food: '', expense_meds: '', expense_others: '',
    on_cadunico: false, receives_benefit: false, benefit_details: '',
    lacked_food_last_30d: false, meals_per_day: 3,
    signature_url: '', document_photo_url: ''
  });

  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', age: '', relation: '', education: '', works: 'Não', income: '0' });

  const signatureRef = React.useRef<HTMLCanvasElement>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => setIsDrawing(false);

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !signatureRef.current) return;
    const canvas = signatureRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    if (!signatureRef.current) return;
    const ctx = signatureRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, signatureRef.current.width, signatureRef.current.height);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const vulnOptions = [
    'Desemprego recente', 'Baixa renda (até meio salário por pessoa)', 'Família monoparental (ex: mãe ou pai solo)', 
    'Presença de crianças (0-6 anos)', 'Idosos na residência', 'Pessoa com deficiência', 
    'Doença grave', 'Insegurança alimentar', 'Moradia precária', 'Violência doméstica', 'Dependência química'
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalSignatureUrl = '';
      if (signatureRef.current) finalSignatureUrl = signatureRef.current.toDataURL();

      const { error } = await supabase
        .from('mercado_solidario_registrations')
        .insert([{ 
          ...formData, 
          signature_url: finalSignatureUrl,
          total_family_income: parseFloat(formData.total_family_income) || 0,
          rent_value: parseFloat(formData.rent_value) || 0,
          expense_rent: parseFloat(formData.expense_rent) || 0,
          expense_water: parseFloat(formData.expense_water) || 0,
          expense_electricity: parseFloat(formData.expense_electricity) || 0,
          expense_food: parseFloat(formData.expense_food) || 0,
          expense_meds: parseFloat(formData.expense_meds) || 0,
          expense_others: parseFloat(formData.expense_others) || 0,
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      alert('Erro ao enviar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl">
      <div className="-m-6 sm:-m-8">
        <div className="bg-emerald-600 p-6 text-white rounded-t-3xl border-b border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Shirt size={28} />
              <h3 className="font-bold text-xl uppercase tracking-tighter">Ficha de Cadastro Mercado Solidário</h3>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex items-center space-x-2 text-emerald-100 text-xs font-bold uppercase tracking-widest">
            <span className={step === 1 ? 'text-white' : ''}>Identificação</span>
            <ChevronRight size={12} />
            <span className={step === 2 ? 'text-white' : ''}>Família</span>
            <ChevronRight size={12} />
            <span className={step === 3 ? 'text-white' : ''}>Vulnerabilidade</span>
            <ChevronRight size={12} />
            <span className={step === 4 ? 'text-white' : ''}>Situação</span>
            <ChevronRight size={12} />
            <span className={step === 5 ? 'text-white' : ''}>Assinatura</span>
          </div>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {!submitted ? (
            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Nome Completo</label>
                      <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">CPF</label>
                      <input type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">RG</label>
                      <input type="text" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Nascimento</label>
                      <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Estado Civil</label>
                      <select value={formData.civil_status} onChange={e => setFormData({...formData, civil_status: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                        <option>Solteiro(a)</option>
                        <option>Casado(a)</option>
                        <option>Divorciado(a)</option>
                        <option>Viúvo(a)</option>
                        <option>União Estável</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Telefone (WhatsApp)</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="font-bold text-stone-900 mb-4 flex items-center"><MapPin size={18} className="mr-2 text-emerald-500" /> Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Rua / Logradouro</label>
                        <input type="text" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Número</label>
                        <input type="text" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Bairro</label>
                        <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Tipo de Moradia</label>
                        <select value={formData.housing_type} onChange={e => setFormData({...formData, housing_type: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                          <option>Própria</option>
                          <option>Alugada</option>
                          <option>Cedida</option>
                          <option>Ocupação</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-stone-900 mb-4 flex items-center"><Users size={18} className="mr-2 text-emerald-500" /> Composição Familiar</h4>
                    <div className="bg-stone-50 p-4 rounded-2xl space-y-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Nome</label>
                          <input type="text" placeholder="Nome" value={newFamilyMember.name} onChange={e => setNewFamilyMember({...newFamilyMember, name: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Idade</label>
                          <input type="number" placeholder="Idade" value={newFamilyMember.age} onChange={e => setNewFamilyMember({...newFamilyMember, age: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Parentesco</label>
                          <input type="text" placeholder="Parentesco" value={newFamilyMember.relation} onChange={e => setNewFamilyMember({...newFamilyMember, relation: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Escolaridade</label>
                          <input type="text" placeholder="Escolaridade" value={newFamilyMember.education} onChange={e => setNewFamilyMember({...newFamilyMember, education: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Trabalha?</label>
                          <select value={newFamilyMember.works} onChange={e => setNewFamilyMember({...newFamilyMember, works: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full">
                            <option>Sim</option>
                            <option>Não</option>
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Renda</label>
                          <input type="number" placeholder="Renda" value={newFamilyMember.income} onChange={e => setNewFamilyMember({...newFamilyMember, income: e.target.value})} className="p-2 border border-stone-200 rounded-lg text-sm w-full" />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (newFamilyMember.name) {
                            setFormData({...formData, family_members: [...formData.family_members, newFamilyMember]});
                            setNewFamilyMember({ name: '', age: '', relation: '', education: '', works: 'Não', income: '0' });
                          }
                        }}
                        className="w-full bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-600"
                      >
                        Adicionar Membro da Casa
                      </button>
                    </div>
                    <div className="space-y-2">
                       {formData.family_members.map((m: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center p-3 bg-white border border-stone-100 rounded-xl">
                            <span className="text-xs font-bold text-stone-700">{m.name} ({m.age}a) - {m.relation}</span>
                            <button onClick={() => setFormData({...formData, family_members: formData.family_members.filter((_: any, i: number) => i !== idx)})} className="text-red-400 p-1 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                         </div>
                       ))}
                       {formData.family_members.length === 0 && <p className="text-[10px] text-stone-400 italic px-2">Nenhum membro adicionado ainda.</p>}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-stone-100">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Renda Familiar Total</label>
                    <input type="number" value={formData.total_family_income} onChange={e => setFormData({...formData, total_family_income: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3" placeholder="R$ 0,00" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h4 className="font-bold text-stone-900 mb-4 flex items-center"><AlertCircle size={18} className="mr-2 text-emerald-500" /> Situação de Vulnerabilidade</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vulnOptions.map(opt => (
                      <label key={opt} className="flex items-center space-x-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.vulnerability_factors.includes(opt)}
                          onChange={() => {
                            const newFactors = formData.vulnerability_factors.includes(opt)
                              ? formData.vulnerability_factors.filter((f: string) => f !== opt)
                              : [...formData.vulnerability_factors, opt];
                            setFormData({...formData, vulnerability_factors: newFactors});
                          }}
                          className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-stone-600">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-stone-100 grid grid-cols-2 gap-4">
                     <div className="col-span-2 font-bold text-sm mb-2">Despesas Fixas Mensais (Estimativa)</div>
                     <div><label className="text-[10px] uppercase font-bold text-stone-400">Energia Elétrica</label><input type="number" value={formData.expense_electricity} onChange={e => setFormData({...formData, expense_electricity: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" /></div>
                     <div><label className="text-[10px] uppercase font-bold text-stone-400">Água</label><input type="number" value={formData.expense_water} onChange={e => setFormData({...formData, expense_water: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" /></div>
                     <div><label className="text-[10px] uppercase font-bold text-stone-400">Alimentação</label><input type="number" value={formData.expense_food} onChange={e => setFormData({...formData, expense_food: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" /></div>
                     <div><label className="text-[10px] uppercase font-bold text-stone-400">Medicamentos</label><input type="number" value={formData.expense_meds} onChange={e => setFormData({...formData, expense_meds: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" /></div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-stone-900 mb-4">Programas Sociais e Alimentação</h4>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-stone-50 rounded-xl">
                        <span className="text-xs font-bold text-stone-600">Está inscrito no CadÚnico?</span>
                        <div className="flex bg-white rounded-lg p-1 border border-stone-100">
                          <button onClick={() => setFormData({...formData, on_cadunico: true})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase ${formData.on_cadunico ? 'bg-emerald-500 text-white' : 'text-stone-400'}`}>Sim</button>
                          <button onClick={() => setFormData({...formData, on_cadunico: false})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase ${!formData.on_cadunico ? 'bg-emerald-500 text-white' : 'text-stone-400'}`}>Não</button>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-stone-50 rounded-xl">
                        <span className="text-xs font-bold text-stone-600">Recebe algum benefício social?</span>
                        <div className="flex bg-white rounded-lg p-1 border border-stone-100">
                          <button onClick={() => setFormData({...formData, receives_benefit: true})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase ${formData.receives_benefit ? 'bg-emerald-500 text-white' : 'text-stone-400'}`}>Sim</button>
                          <button onClick={() => setFormData({...formData, receives_benefit: false})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase ${!formData.receives_benefit ? 'bg-emerald-500 text-white' : 'text-stone-400'}`}>Não</button>
                        </div>
                      </div>
                      {formData.receives_benefit && (
                        <input type="text" placeholder="Qual benefício?" value={formData.benefit_details} onChange={e => setFormData({...formData, benefit_details: e.target.value})} className="w-full border border-stone-200 rounded-xl p-3 text-sm bg-stone-50" />
                      )}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="font-bold text-stone-900 mb-4">Situação Alimentar</h4>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-stone-50 rounded-xl">
                        <span className="text-xs font-bold text-stone-600">Nos últimos 30 dias faltou comida em casa?</span>
                        <div className="flex bg-white rounded-lg p-1 border border-stone-100">
                          <button onClick={() => setFormData({...formData, lacked_food_last_30d: true})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase ${formData.lacked_food_last_30d ? 'bg-red-500 text-white' : 'text-stone-400'}`}>Sim</button>
                          <button onClick={() => setFormData({...formData, lacked_food_last_30d: false})} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${!formData.lacked_food_last_30d ? 'bg-emerald-500 text-white' : 'text-stone-400'}`}>Não</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-400 mb-2 block">Quantas refeições por dia a família realiza?</label>
                        <div className="flex space-x-2">
                           {[1, 2, 3].map(num => (
                             <button 
                                key={num}
                                onClick={() => setFormData({...formData, meals_per_day: num})}
                                className={`flex-1 py-3 rounded-xl border font-bold transition-all ${formData.meals_per_day === num ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-200 text-stone-900'}`}
                             >
                               {num === 3 ? '3 ou mais' : num}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                    <h4 className="font-bold text-stone-900 mb-4">Declaração e Assinatura</h4>
                    <p className="text-xs text-stone-500 mb-6 italic leading-relaxed">
                      "Declaro que as informações acima são verdadeiras e estou ciente de que poderão ser verificadas pela coordenação do programa Ação Social MEVAM Itapema Sertão. Comprometo-me a informar qualquer mudança na situação financeira da minha família."
                    </p>
                    <div className="border border-stone-200 bg-white rounded-xl overflow-hidden mb-4 shadow-inner">
                      <canvas 
                        ref={signatureRef}
                        width={600}
                        height={180}
                        className="w-full touch-none cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseOut={endDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={endDrawing}
                      />
                      <div className="bg-stone-50 p-2 flex justify-between border-t border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold px-4 flex items-center"><Edit3 size={12} className="mr-2"/> Assinatura Digital</span>
                        <button onClick={clearSignature} className="text-[10px] text-primary font-bold hover:underline px-4">Limpar Campo</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Carregar Foto do Documento (RG ou CPF)</label>
                       <div className="flex items-center justify-center p-10 border-2 border-dashed border-stone-200 rounded-3xl bg-white hover:bg-stone-50 transition-colors cursor-pointer relative group overflow-hidden">
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             alert('Documento anexado com sucesso para análise pastoral.');
                           }
                         }} />
                         <div className="text-center">
                           <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 transition-colors">
                            <Upload className="text-stone-300 group-hover:text-emerald-500" size={32} />
                           </div>
                           <span className="text-stone-400 text-xs font-medium">Clique ou arraste a foto aqui</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-8 pb-4">
                {step > 1 && (
                  <button onClick={handleBack} className="flex-1 border-2 border-stone-100 text-stone-500 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-stone-100 transition-all">Voltar</button>
                )}
                {step < 5 ? (
                  <button onClick={handleNext} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">Próxima Etapa</button>
                ) : (
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-black disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Processando...' : 'Finalizar Cadastro'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-4">Cadastro Realizado!</h3>
              <p className="text-stone-600 text-lg leading-relaxed max-w-md mx-auto">
                Sua ficha foi recebida com sucesso. Nossa equipe entrará em contato via WhatsApp para informar os próximos passos e datas de distribuição.
              </p>
              <button onClick={onClose} className="mt-12 bg-emerald-600 text-white px-12 py-4 rounded-full font-bold text-lg shadow-xl shadow-emerald-200">Entendido</button>
            </div>
          ) }
        </div>
      </div>
    </Modal>
  );
};

const AvisosModal = ({ 
  isOpen, 
  onClose, 
  announcements = [],
  onDeleteAnnouncement
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  announcements?: Announcement[],
  onDeleteAnnouncement?: (id: string) => void
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Avisos & Comunicados">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Sound banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-50 border border-amber-300/70 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
              <BellRing size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-950 truncate">Notificações Oficiais</p>
              <p className="text-[11px] text-amber-800 truncate">MEVAM Itapema Sertão</p>
            </div>
          </div>
          <button
            type="button"
            onClick={playNotificationSound}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Tocar som oficial do aviso"
          >
            <Volume2 size={14} />
            <span>Ouvir Som</span>
          </button>
        </div>

        {announcements.length > 0 ? (
          announcements.map((aviso) => (
            <div 
              key={aviso.id} 
              className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 hover:border-amber-500/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  {(aviso as any).category || 'Comunicado'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">
                    {aviso.date ? (aviso.date.includes('/') ? aviso.date : new Date(aviso.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })) : 'Recente'}
                  </span>
                  {onDeleteAnnouncement && (
                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement(aviso.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 px-2.5 rounded-xl border border-red-200/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                      title="Excluir este aviso definitivamente"
                    >
                      <Trash2 size={14} />
                      <span className="text-[11px] font-bold text-red-600">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
              <h4 className="font-bold text-stone-900 text-base mb-1.5">{aviso.title}</h4>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{aviso.description || (aviso as any).content}</p>
              <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between">
                <button
                  onClick={() => {
                    const text = `*${aviso.title}*\n${aviso.description || (aviso as any).content || ''}\n\nMEVAM Itapema Sertão`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Compartilhar no WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={playNotificationSound}
                  className="text-stone-400 hover:text-amber-600 p-1 rounded-lg transition"
                  title="Tocar som da notificação"
                >
                  <Volume2 size={15} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
              <Bell size={24} />
            </div>
            <h4 className="font-bold text-stone-800 text-base mb-1">Nenhum aviso novo</h4>
            <p className="text-stone-500 text-sm max-w-xs mx-auto">
              Fique atento às nossas redes sociais e próximos cultos para mais comunicados.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

const LocationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const address = "Rua 406, 1750, Morretes, Itapema - SC";
  const mapsUrl = "https://maps.app.goo.gl/7siqLYGHjzZieH8b8";

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nossa Localização">
      <div className="space-y-5 text-center sm:text-left">
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <MapPin size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-stone-900 text-base mb-1">MEVAM Itapema Sertão</h4>
            <p className="text-stone-600 text-sm leading-relaxed mb-1">{address}</p>
            <p className="text-stone-400 text-xs">CEP 88220-000 • Itapema, Santa Catarina</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://maps.app.goo.gl/7siqLYGHjzZieH8b8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white py-3 px-4 rounded-xl font-bold text-sm shadow transition-colors"
          >
            <Map size={16} />
            <span>Abrir no Google Maps</span>
          </a>
          <a
            href="https://waze.com/ul?q=Rua%20406%201750%20Morretes%20Itapema%20SC"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-4 rounded-xl font-bold text-sm shadow transition-colors"
          >
            <Compass size={16} />
            <span>Abrir no Waze</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:bg-stone-100 text-stone-700 py-2.5 px-4 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Endereço Copiado!' : 'Copiar Endereço'}</span>
          </button>
          <button
            onClick={() => {
              const text = `Venha nos visitar na MEVAM Itapema Sertão:\n📍 ${address}\n${mapsUrl}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 border border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 px-4 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            <Share2 size={14} />
            <span>Compartilhar Endereço</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CultosScheduleModal = ({ 
  isOpen, 
  onClose,
  onOpenPlannedVisit,
  onOpenLocation,
  services
}: { 
  isOpen: boolean, 
  onClose: () => void,
  onOpenPlannedVisit: () => void,
  onOpenLocation: () => void,
  services?: ChurchService[]
}) => {
  if (!isOpen) return null;

  const isServicesInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
  const sourceList = isServicesInit 
    ? (services || []) 
    : (Array.isArray(services) && services.length > 0 ? services : DEFAULT_CHURCH_SERVICES);
  const displayServices = sourceList.filter(s => s.is_active !== false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nossos Cultos & Programação">
      <div className="space-y-4">
        {displayServices.length === 0 ? (
          <div className="py-10 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200/80 p-6 space-y-1">
            <p className="font-semibold text-stone-700 text-sm">Nenhum culto ou programação ativa no momento.</p>
            <p className="text-xs text-stone-400">Novos horários serão atualizados em breve pelos líderes pastorais.</p>
          </div>
        ) : (
          displayServices.map((culto, index) => {
            const isAmber = culto.color === 'amber' || index === 0;
            return (
              <div 
                key={culto.id || index} 
                className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all shadow-xs ${
                  isAmber 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shrink-0 tracking-wider shadow-2xs ${
                  isAmber 
                    ? 'bg-amber-500 text-stone-950' 
                    : 'bg-stone-800 text-white'
                }`}>
                  {culto.day_short || culto.day_of_week?.substring(0, 3).toUpperCase() || 'CUL'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900 text-base">{culto.title}</h4>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isAmber 
                          ? 'bg-amber-200/80 text-amber-900' 
                          : 'bg-stone-200 text-stone-700'
                      }`}>
                        {culto.time}
                      </span>
                    </div>
                    {culto.badge_text && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200 shadow-2xs">
                        {culto.badge_text}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-600 text-xs leading-relaxed whitespace-pre-line">
                    {culto.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-400 font-medium">
                    <span>📍 {culto.day_of_week}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          <button
            onClick={() => {
              onClose();
              onOpenPlannedVisit();
            }}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow transition cursor-pointer text-center"
          >
            Planejar Minha Visita
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenLocation();
            }}
            className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-sm transition cursor-pointer text-center"
          >
            Como Chegar
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Hero = ({ 
  onOpenPlannedVisit, 
  onOpenVisitorForm,
  liveStream,
  onOpenCantina,
  announcements = [],
  onOpenMemberArea,
  currentUser,
  onOpenCongress,
  onOpenCells,
  onOpenRepository,
  onOpenPrayer,
  onOpenGiving,
  onOpenLists,
  onDeleteAnnouncement,
  churchServices = []
}: { 
  onOpenPlannedVisit: () => void,
  onOpenVisitorForm?: () => void,
  liveStream: { url: string, is_active: boolean } | null,
  onOpenCantina?: () => void,
  announcements?: Announcement[],
  onOpenMemberArea?: () => void,
  currentUser?: any,
  onOpenCongress?: () => void,
  onOpenCells?: () => void,
  onOpenRepository?: () => void,
  onOpenPrayer?: () => void,
  onOpenGiving?: () => void,
  onOpenLists?: () => void,
  onDeleteAnnouncement?: (id: string) => void,
  churchServices?: ChurchService[]
}) => {
  const [isAvisosOpen, setIsAvisosOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCultosOpen, setIsCultosOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);

  // Monitor unread notices and sound notifications
  useEffect(() => {
    try {
      const storedCount = Number(localStorage.getItem('mevam_read_announcements_count') || '0');
      const flaggedUnread = localStorage.getItem('mevam_has_unread_notice') === 'true';

      if (flaggedUnread || announcements.length > storedCount) {
        setHasUnreadNotice(true);
        if (flaggedUnread) {
          playNotificationSound();
        }
      }
    } catch (e) {}
  }, [announcements.length]);

  const handleOpenAvisos = () => {
    setIsAvisosOpen(true);
    setHasUnreadNotice(false);
    try {
      localStorage.removeItem('mevam_has_unread_notice');
      localStorage.setItem('mevam_read_announcements_count', String(announcements.length));
    } catch (e) {}
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const bannerBgVideoUrl = "https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/sign/banner/PinGrab_1788401357591.mp4?token=eyJraWQiOiI3MTg0NDIzOS05ZGQ3LTQ3NzQtOTA2Ny1mZmE3MjVmM2QzOGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJiYW5uZXIvUGluR3JhYl8xNzg4NDAxMzU3NTkxLm1wNCIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODg0MzM5OTUsImV4cCI6MjEwMzc5Mzk5NX0.zxKH0hMZHLAPNHJR2998zb5NwKiyYPZvUOOkpPIvW0U";
  const bannerBgFallback = "https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/sign/banner/1ca3dbdf26ee4cad6610f2c8208ba9a4.jpg?token=eyJraWQiOiI3MTg0NDIzOS05ZGQ3LTQ3NzQtOTA2Ny1mZmE3MjVmM2QzOGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJiYW5uZXIvMWNhM2RiZGYyNmVlNGNhZDY2MTBmMmM4MjA4YmE5YTQuanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4ODQwOTkzOCwiZXhwIjoyMTAzNzY5OTM4fQ.bT_MnTOV6uy-ulbWv7G0Tq3nAA7WhU2dazy7KebZckk";
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted until user interaction in some browser modes
      });
    }
  }, []);

  // Preferred Icon Sessions:
  // avisos, lista, cantina, congresso, células, repositório semanal, pedido de oração, sou novo aqui, Localização, nossos cultos, doações
  const appIcons = [
    {
      id: 'avisos',
      label: 'Avisos',
      icon: Bell,
      badge: hasUnreadNotice ? 'Novo' : (announcements.length > 0 ? String(announcements.length) : undefined),
      action: handleOpenAvisos
    },
    {
      id: 'lista',
      label: 'Lista',
      icon: ClipboardList,
      action: () => {
        if (onOpenLists) {
          onOpenLists();
        }
      }
    },
    {
      id: 'cantina',
      label: 'Cantina',
      icon: UtensilsCrossed,
      action: () => {
        if (onOpenCantina) {
          onOpenCantina();
        } else {
          scrollTo('cantina-secao');
        }
      }
    },
    {
      id: 'congresso',
      label: 'Congresso',
      icon: Sparkles,
      action: () => {
        if (onOpenCongress) {
          onOpenCongress();
        } else {
          scrollTo('congressos');
        }
      }
    },
    {
      id: 'celulas',
      label: 'Células',
      icon: Users,
      action: () => {
        if (onOpenCells) {
          onOpenCells();
        } else {
          scrollTo('celulas');
        }
      }
    },
    {
      id: 'repositorio',
      label: 'Repositório Semanal',
      icon: FolderArchive,
      action: () => {
        if (onOpenRepository) {
          onOpenRepository();
        } else {
          scrollTo('assista');
        }
      }
    },
    {
      id: 'oracao',
      label: 'Pedido de Oração',
      icon: HeartHandshake,
      action: () => {
        if (onOpenPrayer) {
          onOpenPrayer();
        } else {
          scrollTo('sobre');
        }
      }
    },
    {
      id: 'sou-novo',
      label: 'Sou Novo Aqui',
      icon: Smile,
      action: () => {
        if (onOpenVisitorForm) {
          onOpenVisitorForm();
        } else {
          onOpenPlannedVisit();
        }
      }
    },
    {
      id: 'localizacao',
      label: 'Localização',
      icon: MapPin,
      action: () => setIsLocationOpen(true)
    },
    {
      id: 'cultos',
      label: 'Nossos Cultos',
      icon: Clock,
      action: () => setIsCultosOpen(true)
    },
    {
      id: 'doacoes',
      label: 'Doações',
      icon: Heart,
      action: () => {
        if (onOpenGiving) {
          onOpenGiving();
        } else {
          scrollTo('contribua');
        }
      }
    }
  ];

  return (
    <>
      <section className="relative min-h-[92vh] sm:min-h-screen w-full overflow-hidden flex flex-col justify-between pt-20 sm:pt-24 pb-12 sm:pb-16 bg-stone-950">
        {/* Background Video Looping Infinitely */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={bannerBgFallback}
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.05]"
          >
            <source src="/app-bg-video.mp4" type="video/mp4" />
            <source src={bannerBgVideoUrl} type="video/mp4" />
          </video>
          {/* Subtle dark vignette overlay for legibility of icons and typography */}
          <div className="absolute inset-0 bg-stone-950/45 backdrop-brightness-[0.85] mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-stone-950" />
        </div>

        {/* Top App Bar inside screen (Bell / Share / User) */}
        <div className="relative z-20 max-w-lg sm:max-w-2xl md:max-w-4xl mx-auto w-full px-5 pt-2">
          <div className="flex items-center justify-between text-white/80">
            <button
              onClick={handleOpenAvisos}
              className={`relative w-10 h-10 rounded-full transition backdrop-blur-md flex items-center justify-center text-white cursor-pointer border ${
                hasUnreadNotice
                  ? 'bg-amber-500/40 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                  : 'bg-white/10 hover:bg-white/20 active:scale-95 border-white/10'
              }`}
              title="Avisos e Notificações"
            >
              <Bell size={18} className={hasUnreadNotice ? "text-amber-300 animate-pulse" : ""} />
              {announcements.length > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ${
                  hasUnreadNotice 
                    ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 animate-bounce' 
                    : 'bg-amber-500 text-stone-950 ring-1 ring-stone-900'
                }`}>
                  {hasUnreadNotice ? '!' : announcements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                const text = `Conheça o aplicativo oficial da MEVAM Itapema Sertão! Acesse cultos, programações e conteúdos: ${window.location.origin}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition backdrop-blur-md flex items-center justify-center text-white cursor-pointer border border-white/10"
              title="Compartilhar App"
            >
              <Share2 size={18} />
            </button>

            {onOpenMemberArea && (
              <button
                onClick={onOpenMemberArea}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition backdrop-blur-md flex items-center justify-center text-white cursor-pointer border border-white/10"
                title={currentUser ? "Minha Conta / Membro" : "Entrar / Área de Membros"}
              >
                <User size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Center Branding - Styled matching reference ("Igreja dos filhos" inspired) */}
        <div className="relative z-20 text-center px-4 max-w-xl mx-auto my-auto pt-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/20 p-2.5 shadow-2xl mb-3 flex items-center justify-center">
              <img 
                src="https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/mensagem/IMG-20260111-WA0002.jpg" 
                alt="MEVAM" 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2 drop-shadow-lg">
              <span>MEVAM</span>
              <span className="font-serif italic font-normal text-amber-300">Itapema</span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 font-medium tracking-widest uppercase mt-1 drop-shadow">
              Sertão
            </p>

            {liveStream?.is_active && (
              <motion.button 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.open(liveStream.url, '_blank')}
                className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-2xl cursor-pointer border border-red-400/40"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span>Culto Ao Vivo Agora</span>
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Preferred Icons Grid - Mobile App Icon Matrix */}
        <div className="relative z-20 max-w-sm sm:max-w-xl md:max-w-4xl mx-auto w-full px-3 sm:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-6 sm:gap-y-8 gap-x-2 sm:gap-x-6 justify-items-center">
            {appIcons.map((item, index) => {
              return (
                <motion.button
                  key={item.id}
                  onClick={item.action}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * index, duration: 0.3 }}
                  className="group flex flex-col items-center text-center cursor-pointer transition-all duration-200 focus:outline-none"
                >
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.08] hover:bg-white/[0.18] active:scale-95 border flex items-center justify-center text-white shadow-xl backdrop-blur-md transition-all duration-200 group-hover:border-amber-400/50 group-hover:shadow-amber-500/20 ${
                    item.id === 'avisos' && hasUnreadNotice 
                      ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/30' 
                      : 'border-white/15'
                  }`}>
                    <item.icon 
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        item.id === 'avisos' && hasUnreadNotice 
                          ? 'text-amber-300 animate-pulse' 
                          : 'text-white/95 group-hover:text-amber-300'
                      }`}
                      strokeWidth={1.75} 
                    />
                    {item.badge && (
                      <span className={`absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full text-[10px] font-black shadow-md ${
                        item.id === 'avisos' && hasUnreadNotice
                          ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 animate-bounce'
                          : 'bg-amber-500 text-stone-950'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-semibold text-white/90 text-center leading-tight tracking-wide drop-shadow-md group-hover:text-amber-200 transition-colors max-w-[85px] sm:max-w-[105px]">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive App Modals */}
      <AvisosModal 
        isOpen={isAvisosOpen} 
        onClose={() => setIsAvisosOpen(false)} 
        announcements={announcements} 
        onDeleteAnnouncement={onDeleteAnnouncement}
      />
      <LocationModal 
        isOpen={isLocationOpen} 
        onClose={() => setIsLocationOpen(false)} 
      />
      <CultosScheduleModal 
        isOpen={isCultosOpen} 
        onClose={() => setIsCultosOpen(false)} 
        onOpenPlannedVisit={onOpenPlannedVisit}
        onOpenLocation={() => {
          setIsCultosOpen(false);
          setIsLocationOpen(true);
        }}
        services={churchServices}
      />
    </>
  );
};

const EventsCarousel = ({ events }: { events: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeEvents = events.filter(e => e.is_active);

  useEffect(() => {
    if (currentIndex >= activeEvents.length && activeEvents.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeEvents.length, currentIndex]);

  useEffect(() => {
    if (activeEvents.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeEvents.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeEvents.length, isPaused]);

  if (activeEvents.length === 0) return null;

  const currentEvent = activeEvents[currentIndex] || activeEvents[0];
  if (!currentEvent) return null;

  return (
    <section className="py-8 bg-stone-950 overflow-hidden border-t border-white/5">
      <div className="max-w-6xl mx-auto px-2 sm:px-6">
        <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl aspect-[4/5] md:aspect-video bg-stone-900 border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id || currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <img
                src={currentEvent.image_url}
                alt={currentEvent.title || "Evento"}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Indicators - Discretos sobre a imagem */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-20">
            {activeEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
        
        {/* Controls and Title Below */}
        <div className="flex flex-col items-center mt-6 space-y-3">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="text-white/80 hover:text-amber-400 transition-colors p-3 rounded-full bg-white/10 hover:bg-white/15 shadow-sm active:scale-90 border border-white/10 cursor-pointer"
            title={isPaused ? "Retomar" : "Pausar"}
          >
            {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
          </button>
          
          <AnimatePresence mode="wait">
            {activeEvents[currentIndex]?.title && (
              <motion.div
                key={activeEvents[currentIndex].title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <h3 className="text-white text-lg md:text-2xl font-bold tracking-tight px-4">
                  {activeEvents[currentIndex].title}
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

const CarouselManagement = ({ events, onRefresh, setConfirmModal }: { 
  events: any[], 
  onRefresh: () => void,
  setConfirmModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary';
  }>>
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    display_order: 0,
    is_active: true
  });

  // Helper to convert Google Drive links to direct image links
  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    // Handle Google Drive links
    const driveRegex = /\/file\/d\/([^\/]+)\//;
    const driveMatch = url.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return url;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const processedData = {
      ...formData,
      image_url: getDirectImageUrl(formData.image_url)
    };

    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('events_carousel')
          .update(processedData)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events_carousel')
          .insert([processedData]);
        if (error) throw error;
      }
      setIsAdding(false);
      setEditingEvent(null);
      setFormData({ title: '', image_url: '', link_url: '', display_order: 0, is_active: true });
      onRefresh();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'events_carousel' } }));
      } catch (e) {}
    } catch (error: any) {
      alert('Erro ao salvar evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Slide',
      message: 'Deseja realmente excluir este slide do carrossel?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('events_carousel')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefresh();
          try {
            window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'events_carousel' } }));
          } catch (e) {}
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          alert('Erro ao excluir: ' + error.message);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Carrossel de Eventos</h3>
        <button 
          onClick={() => {
            setEditingEvent(null);
            setFormData({ title: '', image_url: '', link_url: '', display_order: events.length, is_active: true });
            setIsAdding(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-primary-dark transition-all"
        >
          <Plus size={16} className="mr-2" /> Novo Slide
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm group">
            <div className="aspect-video relative">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                <button 
                  onClick={() => {
                    setEditingEvent(event);
                    setFormData({
                      title: event.title || '',
                      image_url: event.image_url,
                      link_url: event.link_url || '',
                      display_order: event.display_order,
                      is_active: event.is_active
                    });
                    setIsAdding(true);
                  }}
                  className="bg-white text-stone-900 p-2 rounded-full hover:bg-primary hover:text-white transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="bg-white text-red-600 p-2 rounded-full hover:bg-red-600 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold truncate">{event.title || 'Sem título'}</h4>
              <p className="text-xs text-stone-400 mt-1">Ordem: {event.display_order}</p>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="col-span-full py-12 text-center text-stone-400 italic bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
            Nenhum slide cadastrado.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title={editingEvent ? "Editar Slide" : "Novo Slide"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Título (Opcional)</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex: Conferência de Mulheres"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">URL da Imagem</label>
            <input 
              type="url" 
              required
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Link de Destino (Opcional)</label>
            <input 
              type="url" 
              value={formData.link_url}
              onChange={(e) => setFormData({...formData, link_url: e.target.value})}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://exemplo.com/inscricao"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Ordem de Exibição</label>
              <input 
                type="number" 
                value={formData.display_order}
                onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-end pb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-stone-700">Ativo</span>
              </label>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Slide'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

const PrayerSection = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const whatsapp = formData.get('whatsapp') as string;
    const request = formData.get('request') as string;
    const is_public = formData.get('privacy') === 'Público';

    try {
      const { error } = await supabase
        .from('prayer_requests')
        .insert([{ name, whatsapp, request, is_public }]);

      if (error) throw error;
      
      setSubmitted(true);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error submitting prayer request:', error);
      alert('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="sobre" className="py-4 md:py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Intercessão</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 leading-tight">Como podemos orar por você hoje?</h2>
          <p className="text-stone-600 text-lg mb-8 leading-relaxed">
            Acreditamos no poder da oração e queremos caminhar com você. 
            Nossa equipe de intercessão ora diariamente por cada pedido recebido.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-stone-700">
              <div className="bg-stone-100 p-2 rounded-full"><Heart size={18} className="text-primary" /></div>
              <span>Pedidos confidenciais ou públicos</span>
            </div>
            <div className="flex items-center space-x-3 text-stone-700">
              <div className="bg-stone-100 p-2 rounded-full"><Users size={18} className="text-primary" /></div>
              <span>Acompanhamento pastoral opcional</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 p-8 md:p-10 rounded-3xl shadow-sm border border-stone-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Nome</label>
                <input name="name" type="text" className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">WhatsApp</label>
                <input name="whatsapp" type="tel" className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Seu Pedido</label>
              <textarea name="request" rows={4} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" placeholder="Escreva aqui seu motivo de oração..." required></textarea>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="privacy" value="Confidencial" className="text-primary focus:ring-primary" defaultChecked />
                <span className="text-sm text-stone-600">Confidencial</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="privacy" value="Público" className="text-primary focus:ring-primary" />
                <span className="text-sm text-stone-600">Público</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading} className="flex-1 bg-stone-900 hover:bg-black text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar Pedido de Oração'}
                {!loading && <MessageCircle className="ml-2" size={20} />}
              </button>
              <button 
                type="button"
                onClick={() => shareOnWhatsApp('Pedido de Oração - MEVAM', 'Precisa de oração? Envie seu pedido para nossa equipe de intercessão.', window.location.origin + '#sobre')}
                className="bg-stone-200 hover:bg-stone-300 text-stone-600 p-4 rounded-xl transition-all"
                title="Compartilhar link de oração"
              >
                <Share2 size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <AnimatePresence>
        {submitted && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubmitted(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 md:p-12 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Pedido Recebido!</h3>
              <p className="text-stone-500 mb-8">
                Recebemos seu pedido de oração. Nossa equipe de intercessão estará orando por você. Deus te abençoe!
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

const CellGroups = ({ initialCells }: { initialCells?: CellGroup[] }) => {
  const [cells, setCells] = useState<CellGroup[]>(
    initialCells && initialCells.length > 0 ? initialCells : DEFAULT_CELL_GROUPS
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCells && initialCells.length > 0) {
      setCells(initialCells);
      setLoading(false);
      return;
    }

    const fetchCells = async () => {
      if (!isSupabaseConfigured) {
        setCells(DEFAULT_CELL_GROUPS);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('cell_groups')
          .select('*')
          .order('name');
        
        if (error) {
          console.warn('Aviso na consulta de células:', error?.message || error);
          setCells(prev => prev.length > 0 ? prev : DEFAULT_CELL_GROUPS);
          return;
        }
        if (data && data.length > 0) {
          setCells(data);
        } else {
          setCells(DEFAULT_CELL_GROUPS);
        }
      } catch (error: any) {
        console.warn('Aviso de conexão ao buscar células:', error?.message || error);
        setCells(prev => prev.length > 0 ? prev : DEFAULT_CELL_GROUPS);
      } finally {
        setLoading(false);
      }
    };

    fetchCells();
  }, [initialCells]);

  return (
    <section id="celulas" className="py-4 md:py-8 bg-stone-50 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Comunhão</span>
          <h2 className="text-4xl font-bold mt-4 mb-4">Encontre uma Célula</h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            A igreja acontece nos lares. Encontre um grupo perto de você para estudar a palavra e criar laços reais.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cells.map((cell) => (
              <motion.div 
                key={cell.id}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 hover:shadow-xl transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    cell.type === 'Jovens' ? 'bg-blue-100 text-blue-600' :
                    cell.type === 'Kids' ? 'bg-yellow-100 text-yellow-600' :
                    cell.type === 'Mulheres' ? 'bg-pink-100 text-pink-600' :
                    cell.type === 'Homens' ? 'bg-indigo-100 text-indigo-600' :
                    cell.type === 'Casais' ? 'bg-red-100 text-red-600' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {cell.type}
                  </div>
                  <div className="w-10 h-10 bg-stone-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Users size={20} className="text-stone-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-stone-900 mb-4 group-hover:text-primary transition-colors">{cell.name}</h3>
                
                <div className="space-y-3 text-sm text-stone-500">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                      <ShieldCheck size={14} className="text-stone-400" />
                    </div>
                    <span className="font-medium">Líder: {cell.leader}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                      <Clock size={14} className="text-stone-400" />
                    </div>
                    <span className="font-medium">{cell.day} às {cell.time}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                      <MapPin size={14} className="text-stone-400" />
                    </div>
                    <span className="font-medium">{cell.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-8">
                  <button 
                    onClick={() => {
                      const text = `Célula: ${cell.name}\nLíder: ${cell.leader}\nQuando: ${cell.day} às ${cell.time}\nOnde: ${cell.location}\nTipo: ${cell.type}`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="flex-1 py-3 bg-stone-50 hover:bg-stone-900 hover:text-white text-stone-600 rounded-2xl text-xs font-bold transition-all flex items-center justify-center"
                  >
                    Copiar Info
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      shareOnWhatsApp(`Célula ${cell.name}`, `Venha participar da nossa célula! Nos reunimos às ${cell.day} às ${cell.time} em ${cell.location}.`, window.location.origin + '#celulas');
                    }}
                    className="bg-stone-50 hover:bg-primary hover:text-white text-stone-400 p-3 rounded-2xl transition-all"
                    title="Compartilhar Célula"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const MediaCenter = ({ mediaContents, weeklyData, onOpenPost }: { mediaContents: MediaContent[], weeklyData?: WeeklyRepositoryData | null, onOpenPost: (post: any) => void }) => {
  return <WeeklyRepository mediaContents={mediaContents} weeklyData={weeklyData} onOpenPost={onOpenPost} />;
};

// PIX CRC-16 Calculation for EMV QR Code / Copia e Cola
function calculatePixCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Base official Mevam church PIX payload provided by leadership (Static, no amount)
const BASE_MEVAM_PIX_STATIC = "00020101021126500014br.gov.bcb.pix0128mevamitapemasertao@gmail.com5204000053039865802BR5925IGREJA EVANGELICA MEVAM S6008BRASILIA62070503***6304EB41";

// Generates compliant BCB PIX EMV code with optional value assignment without breaking the link
export function generateMevamPixCode(amount?: number | null): string {
  if (!amount || isNaN(amount) || amount <= 0) {
    return BASE_MEVAM_PIX_STATIC;
  }

  const valStr = amount.toFixed(2);
  const lenStr = String(valStr.length).padStart(2, '0');
  const part1 = "00020101021126500014br.gov.bcb.pix0128mevamitapemasertao@gmail.com520400005303986";
  const amountTag = `54${lenStr}${valStr}`;
  const part2 = "5802BR5925IGREJA EVANGELICA MEVAM S6008BRASILIA62070503***6304";
  
  const payloadToSign = `${part1}${amountTag}${part2}`;
  const checksum = calculatePixCRC16(payloadToSign);
  return `${payloadToSign}${checksum}`;
}

const GivingSection = () => {
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'free' | number>('free');
  const [customValue, setCustomValue] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Calculate effective amount
  const parsedCustom = parseFloat(customValue.replace(',', '.'));
  const effectiveAmount = !isNaN(parsedCustom) && parsedCustom > 0 
    ? parsedCustom 
    : (typeof selectedPreset === 'number' && selectedPreset > 0 ? selectedPreset : 0);

  const activePixCode = generateMevamPixCode(effectiveAmount);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(activePixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText('mevamitapemasertao@gmail.com');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <section id="contribua" className="py-4 md:py-8 bg-white overflow-hidden relative rounded-2xl">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm">Generosidade</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Dízimos e Ofertas</h2>
            <p className="text-stone-600 text-lg mb-8 leading-relaxed">
              Sua contribuição nos ajuda a manter nossos ministérios e projetos sociais, 
              levando a mensagem de Cristo a mais pessoas.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <h4 className="font-bold mb-2">Transferência Bancária</h4>
                <p className="text-sm text-stone-500 mb-4">Banco 748 - Banco Cooperativo<br />Sicredi S/A - Bansicredi<br />Agencia: 2606<br />Conta: 56053-9</p>
                <div className="pt-4 border-t border-stone-200">
                  <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Informações de Registro</h5>
                  <p className="text-xs text-stone-500">
                    <span className="font-bold">CNPJ:</span> 51.218.163/0001-86<br />
                    <span className="font-bold">Razão Social:</span> Igreja Evangelica Mevam Sertao
                  </p>
                </div>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 flex flex-col items-center text-center gap-4">
                <div className="w-48 h-48 bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex items-center justify-center">
                  <QRCodeSVG 
                    value={BASE_MEVAM_PIX_STATIC}
                    size={168}
                    level="M"
                  />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-sm">Chave PIX (E-mail)</h4>
                  <p className="text-xs text-stone-600 break-all font-mono font-medium">mevamitapemasertao@gmail.com</p>
                  <button
                    type="button"
                    onClick={() => setShowOnlineModal(true)}
                    className="mt-2 text-xs font-bold text-primary hover:text-primary-dark transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>Copiar PIX / Atribuir Valor</span>
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowOnlineModal(true)}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-bold text-base sm:text-lg transition-all shadow-xl flex items-center gap-3 group cursor-pointer"
            >
              <HandHeart className="group-hover:scale-110 transition-transform" size={22} />
              <span>Doação Online (PIX Copia e Cola)</span>
            </button>
          </div>

          <div className="relative">
            <div className="bg-stone-900 rounded-[40px] p-8 md:p-12 text-white shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 italic">"Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria."</h3>
              <p className="text-white/60 text-lg">— 2 Coríntios 9:7</p>
              <div className="mt-12 flex items-center space-x-4">
                <div className="h-1 w-20 bg-primary rounded-full" />
                <span className="text-sm font-bold uppercase tracking-widest text-primary">Nossa Visão</span>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary rounded-3xl -z-10 rotate-12" />
          </div>
        </div>
      </div>

      {/* Modal de Doação Online com PIX Copia e Cola e Atribuição de Valor */}
      <Modal 
        isOpen={showOnlineModal} 
        onClose={() => setShowOnlineModal(false)}
        title="Doação Online • PIX Copia e Cola"
        maxWidth="max-w-2xl"
      >
        <div className="py-2 space-y-6">
          {/* Cabeçalho explicativo */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
              <HandHeart size={20} />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-bold text-stone-900">
                Contribuição via PIX Oficial Mevam
              </p>
              <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                Você pode doar qualquer quantia. Escolha um valor abaixo para já embutir no código PIX ou mantenha "Valor Livre" para informar a quantia diretamente no aplicativo do seu banco.
              </p>
            </div>
          </div>

          {/* Seção 1: Atribuição de Valor (Opcional) */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2.5">
              Atribuir Valor da Doação (Opcional):
            </label>
            
            {/* Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset('free');
                  setCustomValue('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  selectedPreset === 'free' && !customValue
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                Livre
              </button>
              {[10, 20, 50, 100, 200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(val);
                    setCustomValue('');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    selectedPreset === val && !customValue
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            {/* Input para valor customizado */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-200">
              <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                Ou outro valor:
              </span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0,00"
                  value={customValue}
                  onChange={(e) => {
                    setCustomValue(e.target.value);
                    if (e.target.value) {
                      setSelectedPreset('free');
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Indicador de valor ativo */}
            <div className="mt-2.5 flex items-center justify-between text-xs text-stone-500">
              <span>Status do valor no PIX:</span>
              <span className="font-bold text-stone-900 bg-stone-200/60 px-2 py-0.5 rounded">
                {effectiveAmount > 0 
                  ? `R$ ${effectiveAmount.toFixed(2).replace('.', ',')} pré-definido`
                  : 'Valor Livre (definir no seu banco)'}
              </span>
            </div>
          </div>

          {/* Seção 2: QR Code e Código Copia e Cola */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
              {/* QR Code dinâmico */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl shadow-inner">
                  <QRCodeSVG 
                    value={activePixCode}
                    size={155}
                    level="M"
                  />
                </div>
                <span className="text-[11px] text-stone-500 font-medium mt-1.5">
                  Aponte a câmera do seu banco
                </span>
              </div>

              {/* Bloco Copia e Cola */}
              <div className="flex-1 w-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Copy size={13} className="text-primary" />
                      PIX Copia e Cola:
                    </span>
                    {copiedPix && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        Copiado!
                      </span>
                    )}
                  </div>
                  <div 
                    onClick={handleCopyPix}
                    className="bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded-xl p-2.5 text-[11px] font-mono text-stone-700 break-all select-all cursor-pointer transition max-h-24 overflow-y-auto"
                    title="Clique para copiar"
                  >
                    {activePixCode}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      copiedPix
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Código PIX Copiado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        <span>Copiar Código PIX Copia e Cola</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey ? (
                      <span className="text-emerald-700 font-bold">Chave de e-mail copiada!</span>
                    ) : (
                      <>
                        <span>Ou copiar apenas chave (E-mail): <strong>mevamitapemasertao@gmail.com</strong></span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Dados do Recebedor para Conferência */}
            <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-500">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Favorecido:</span>
                <span className="font-semibold text-stone-800">IGREJA EVANGELICA MEVAM S</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">CNPJ:</span>
                <span className="font-semibold text-stone-800">51.218.163/0001-86</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Instituição / Cidade:</span>
                <span className="font-semibold text-stone-800">Sicredi (Ag: 2606 / CC: 56053-9) • Brasília</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Identificador / TxID:</span>
                <span className="font-semibold text-stone-800">*** (Doação / Dízimo)</span>
              </div>
            </div>
          </div>

          {/* 3 Passos Simples */}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600">
            <span className="font-bold text-stone-800 block mb-1">Como pagar:</span>
            <ol className="list-decimal list-inside space-y-1 text-stone-500">
              <li>Copie o código acima ou aponte a câmera para o QR Code.</li>
              <li>Abra o app do seu banco e escolha a opção <strong>PIX &gt; PIX Copia e Cola</strong>.</li>
              <li>Cole o código copiado, confirme o favorecido (Igreja Evangelica Mevam S) e finalize a doação.</li>
            </ol>
          </div>

          <button 
            type="button"
            onClick={() => setShowOnlineModal(false)}
            className="w-full bg-stone-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </section>
  );
};

const CongressModal = ({
  isOpen,
  onClose,
  congresses,
  user,
  onRegister
}: {
  isOpen: boolean;
  onClose: () => void;
  congresses: Congress[];
  user: any;
  onRegister: (congress: Congress) => void;
}) => {
  if (!isOpen) return null;
  const activeCongresses = congresses.filter(c => c.is_active);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Congressos & Conferências" maxWidth="max-w-5xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        {activeCongresses.length > 0 ? (
          <div className="rounded-2xl overflow-hidden">
            <CongressSection 
              congresses={congresses} 
              user={user}
              onRegister={(c) => {
                onClose();
                onRegister(c);
              }}
            />
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={26} />
            </div>
            <h4 className="font-bold text-stone-800 text-base mb-1">Nenhum congresso com inscrições abertas</h4>
            <p className="text-stone-500 text-xs sm:text-sm max-w-xs mx-auto">
              Fique atento aos nossos avisos e cultos para as próximas conferências e encontros da igreja!
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

const PrayerModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pedido de Oração & Intercessão" maxWidth="max-w-5xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        <PrayerSection />
      </div>
    </Modal>
  );
};

const CellsModal = ({
  isOpen,
  onClose,
  initialCells
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCells?: CellGroup[];
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Células nos Lares" maxWidth="max-w-6xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        <CellGroups initialCells={initialCells} />
      </div>
    </Modal>
  );
};

const RepositoryModal = ({
  isOpen,
  onClose,
  mediaContents,
  weeklyData,
  onOpenPost
}: {
  isOpen: boolean;
  onClose: () => void;
  mediaContents: MediaContent[];
  weeklyData?: WeeklyRepositoryData | null;
  onOpenPost: (post: any) => void;
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Repositório Semanal & Mensagens" maxWidth="max-w-6xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        <MediaCenter 
          mediaContents={mediaContents} 
          weeklyData={weeklyData}
          onOpenPost={(post) => {
            onClose();
            onOpenPost(post);
          }}
        />
      </div>
    </Modal>
  );
};

const GivingModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dízimos e Ofertas" maxWidth="max-w-5xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        <GivingSection />
      </div>
    </Modal>
  );
};

const BlogSection = ({ 
  mediaContents,
  onOpenPost
}: { 
  mediaContents: MediaContent[],
  onOpenPost: (post: any) => void
}) => {
  const posts = mediaContents.filter(m => 
    m.status === 'published' && 
    (m.category === 'Devocional' || m.category === 'Blog' || m.category === 'Reflexão' || (m.type === 'text' && !['Mensagem', 'Podcast', 'Louvor'].includes(m.category || '')))
  ).slice(0, 3).map(m => ({
    id: m.id,
    title: m.title,
    category: m.category,
    date: new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    author: m.author_name || 'Pastoral',
    excerpt: m.content_text?.substring(0, 120) + '...',
    content: m.content_text,
    thumbnail: m.thumbnail_url
  }));

  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-16">
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm">Devocionais</span>
            <h2 className="text-4xl font-bold mt-4">Blog & Reflexões</h2>
          </div>
          {posts.length > 0 && (
            <button className="hidden md:flex items-center text-stone-600 font-bold hover:text-primary transition-colors">
              Ver Blog Completo <ChevronRight size={20} />
            </button>
          )}
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-md transition-all flex flex-col">
                <div className="h-48 bg-stone-200 flex items-center justify-center text-stone-400">
                  {post.thumbnail ? (
                    <img src={post.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText size={48} />
                  )}
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center space-x-2 text-xs text-stone-400 font-bold uppercase mb-3">
                    <span className="text-primary">{post.category || 'Devocional'}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 leading-tight">{post.title}</h3>
                  <p className="text-stone-500 text-sm mb-6 flex-1">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <button 
                      onClick={() => onOpenPost(post)}
                      className="text-primary font-bold text-sm flex items-center group"
                    >
                      Ler Mais <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        shareOnWhatsApp(post.title, `Leia esta reflexão: ${post.title}`, window.location.origin + '#blog');
                      }}
                      className="text-stone-400 hover:text-primary p-2 rounded-full hover:bg-stone-50 transition-all"
                      title="Compartilhar Post"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-stone-200">
            <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={32} className="text-stone-300" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Em breve novas reflexões e devocionais</h3>
            <p className="text-stone-500">Estamos preparando conteúdos edificantes para você. Volte em breve!</p>
          </div>
        )}
      </div>
    </section>
  );
};

const PostDetail = ({ post, onBack }: { post: any, onBack: () => void }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        <button 
          onClick={onBack}
          className="flex items-center text-stone-500 hover:text-primary font-bold mb-8 transition-colors group"
        >
          <ChevronRight className="rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          Voltar para o Blog
        </button>

        {post.thumbnail && (
          <div className="w-full aspect-video rounded-[32px] overflow-hidden mb-12 shadow-xl">
            <img src={post.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center space-x-3 text-sm text-stone-400 font-bold uppercase tracking-widest">
            <span>{post.date}</span>
            <span>•</span>
            <span className="text-primary">{post.author}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-tight">{post.title}</h1>
          
          <div className="w-20 h-1.5 bg-primary rounded-full mb-12"></div>

          <div className="prose prose-stone prose-lg max-w-none">
            <div className="text-stone-600 leading-relaxed whitespace-pre-wrap text-lg">
              {post.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = ({ onOpenInstallApp }: { onOpenInstallApp?: () => void }) => {
  return (
    <footer className="bg-stone-950 text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src="https://edjewxtfhsiekxiuhmrd.supabase.co/storage/v1/object/public/mensagem/IMG-20260111-WA0002.jpg" 
                alt="Logo MEVAM" 
                className="h-12 w-12 object-contain rounded-xl shadow-lg shadow-black/20"
                referrerPolicy="no-referrer"
              />
              <span className="text-2xl font-bold tracking-tighter">
                MEVAM<span className="font-light"> ITAPEMA SERTÃO</span>
              </span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed">
              Uma igreja que ama pessoas e serve a cidade com a alegria do Evangelho. 
              Junte-se a nós em nossa jornada de fé.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a 
                href="https://www.instagram.com/mevam_itapema_sertao?igsh=MXNpaGN6N2s4aWQwZg==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"
                title="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://youtube.com/@mevamitapemasertao?si=7Rw2LRIWX3n_ZASk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"
                title="YouTube"
              >
                <Youtube size={18} />
              </a>
              <a 
                href="https://www.tiktok.com/@mevam.itapema.ser?_r=1&_t=ZS-954VbcxSdq4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"
                title="TikTok"
              >
                <Music2 size={18} />
              </a>
              <button 
                onClick={() => {
                  const text = `Conheça o aplicativo oficial da MEVAM Itapema Sertão! Acesse cultos ao vivo, mensagens, escalas, devocionais e a vida da igreja: ${window.location.origin}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                title="Compartilhar Aplicativo no WhatsApp"
                className="w-10 h-10 bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                <Share2 size={18} />
              </button>
            </div>

            {onOpenInstallApp && (
              <div className="pt-2">
                <button
                  onClick={onOpenInstallApp}
                  className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs px-3.5 py-2.5 rounded-xl border border-stone-800 hover:border-amber-500/40 transition cursor-pointer"
                >
                  <Download size={14} className="text-amber-400" />
                  <span>Instalar App no Celular ou Computador</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">Contato</h4>
            <ul className="space-y-4 text-stone-400 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <a 
                  href="https://maps.app.goo.gl/7siqLYGHjzZieH8b8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors"
                  title="Abrir no Google Maps"
                >
                  Rua 406, 1750, Morretes, Itapema - SC
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <MessageCircle size={18} className="text-primary shrink-0" />
                <span>47 999359941</span>
              </li>
              <li className="flex items-center space-x-3">
                <Clock size={18} className="text-primary shrink-0" />
                <span>Secretaria: Seg-Sex, 09h às 18h</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-500 text-xs uppercase tracking-widest">
          <p>© 2026 Mevam Itapema Sertão. Todos os direitos reservados.</p>
          <div className="flex items-center space-x-2">
            <span>Desenvolvido pela</span>
            <a 
              href="https://wa.me/5547997626121" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/10 border border-white/5 py-1 px-2.5 rounded-lg transition-all select-none cursor-pointer"
            >
              <svg className="h-4 w-6 text-stone-400 hover:text-sky-400 transition-colors" viewBox="0 2 120 70" fill="currentColor">
                <defs>
                  <mask id="cross-mask">
                    <rect width="120" height="80" fill="white" />
                    <rect x="52" y="20" width="6" height="28" rx="0.5" fill="black" />
                    <rect x="45" y="27" width="20" height="6" rx="0.5" fill="black" />
                  </mask>
                </defs>
                <path 
                  d="M 25,60 a 20,20 0 0,1 0,-40 a 25,25 0 0,1 50,-5 a 22,22 0 0,1 20,15 a 20,20 0 0,1 -10,30 z" 
                  mask="url(#cross-mask)" 
                />
              </svg>
              <span className="font-extrabold text-white text-[11px] tracking-tight normal-case">Cloud Church</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const MercadoSolidarioDetailModal = ({ isOpen, onClose, registration }: { isOpen: boolean, onClose: () => void, registration: any }) => {
  if (!registration) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ficha Completa - #${registration.registration_number || 'N/A'}`} maxWidth="max-w-4xl">
      <div className="space-y-8 p-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div>
            <h3 className="text-2xl font-bold text-stone-900">{registration.full_name}</h3>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="flex items-center text-xs font-medium text-stone-500 bg-white px-2 py-1 rounded-lg border border-stone-100">
                <FileText size={14} className="mr-1" /> CPF: {registration.cpf}
              </span>
              <span className="flex items-center text-xs font-medium text-stone-500 bg-white px-2 py-1 rounded-lg border border-stone-100">
                <MessageCircle size={14} className="mr-1" /> {registration.phone}
              </span>
              <span className="flex items-center text-xs font-medium text-stone-500 bg-white px-2 py-1 rounded-lg border border-stone-100 uppercase">
                {registration.civil_status}
              </span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm ${
            registration.status === 'approved' ? 'bg-emerald-500 text-white' :
            registration.status === 'rejected' ? 'bg-red-500 text-white' :
            'bg-amber-500 text-white'
          }`}>
            {registration.status === 'approved' ? 'Aprovado' : registration.status === 'rejected' ? 'Pendente/Recusado' : 'Em Análise'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Endereço */}
          <div className="space-y-4">
            <h4 className="font-bold flex items-center text-stone-900"><MapPin size={18} className="mr-2 text-emerald-500" /> Endereço e Moradia</h4>
            <div className="bg-stone-50 p-6 rounded-3xl space-y-3">
              <p className="text-sm text-stone-700"><strong>Rua:</strong> {registration.street}, {registration.number}</p>
              <p className="text-sm text-stone-700"><strong>Bairro:</strong> {registration.neighborhood}</p>
              <p className="text-sm text-stone-700"><strong>Cidade:</strong> {registration.city} - {registration.cep}</p>
              <p className="text-sm text-stone-700"><strong>Ponto de Ref:</strong> {registration.reference_point || 'Não informado'}</p>
              <div className="pt-2 flex items-center space-x-2">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{registration.housing_type}</span>
                {registration.rent_value > 0 && <span className="text-xs text-stone-500">Aluguel: <strong>R$ {registration.rent_value}</strong></span>}
              </div>
            </div>
          </div>

          {/* Renda */}
          <div className="space-y-4">
            <h4 className="font-bold flex items-center text-stone-900"><Banknote size={18} className="mr-2 text-emerald-500" /> Renda e Finanças</h4>
            <div className="bg-stone-50 p-6 rounded-3xl space-y-3">
              <p className="text-xl font-bold text-emerald-600">R$ {registration.total_family_income?.toFixed(2)} <span className="text-[10px] text-stone-400 font-normal uppercase tracking-tighter">Renda Familiar Total</span></p>
              <p className="text-sm text-stone-700 font-medium italic">Origem: {registration.income_origin} {registration.income_origin_details && `(${registration.income_origin_details})`}</p>
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-stone-100">
                <div className="text-[10px] text-stone-400 flex flex-col">
                  <span>CadÚnico</span>
                  <strong className={registration.on_cadunico ? 'text-emerald-600' : 'text-stone-600'}>{registration.on_cadunico ? 'SIM' : 'NÃO'}</strong>
                </div>
                <div className="text-[10px] text-stone-400 flex flex-col">
                  <span>Benefício Social</span>
                  <strong className={registration.receives_benefit ? 'text-emerald-600' : 'text-stone-600'}>{registration.receives_benefit ? 'SIM' : 'NÃO'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Composição Familiar */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="font-bold flex items-center text-stone-900"><Users size={18} className="mr-2 text-emerald-500" /> Composição Familiar ({registration.family_members?.length || 0})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-stone-400 font-bold border-b border-stone-100">
                    <th className="pb-2">Nome</th>
                    <th className="pb-2">Idade</th>
                    <th className="pb-2">Parentesco</th>
                    <th className="pb-2">Trabalha?</th>
                    <th className="pb-2">Renda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {registration.family_members?.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 font-medium">{m.name}</td>
                      <td className="py-3">{m.age}</td>
                      <td className="py-3">{m.relation}</td>
                      <td className="py-3">{m.works}</td>
                      <td className="py-3">R$ {m.income}</td>
                    </tr>
                  ))}
                  {(!registration.family_members || registration.family_members.length === 0) && (
                    <tr><td colSpan={5} className="py-4 text-center text-stone-400 italic">Nenhum membro listado além do responsável.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vulnerabilidades */}
          <div className="space-y-4">
            <h4 className="font-bold flex items-center text-stone-900"><CheckCircle size={18} className="mr-2 text-emerald-500" /> Fatores de Risco</h4>
            <div className="flex flex-wrap gap-2">
              {registration.vulnerability_factors?.map((v: string) => (
                <span key={v} className="bg-white border border-stone-200 px-3 py-1 rounded-xl text-[10px] text-stone-600 font-medium">{v}</span>
              ))}
              {registration.vulnerability_other && (
                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-[10px] font-medium border border-amber-100 italic">Outros: {registration.vulnerability_other}</span>
              )}
            </div>
          </div>

          {/* Fotos e Assinatura */}
          <div className="space-y-4">
            <h4 className="font-bold flex items-center text-stone-900"><Scan size={18} className="mr-2 text-emerald-500" /> Documentação</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400">Foto do Documento</span>
                <div className="aspect-video bg-stone-100 rounded-2xl overflow-hidden flex items-center justify-center border border-dashed border-stone-200">
                  {registration.document_photo_url ? (
                    <img src={registration.document_photo_url} alt="Documento" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs text-stone-400">Não anexado</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400">Assinatura Digital</span>
                <div className="aspect-video bg-white rounded-2xl overflow-hidden flex items-center justify-center border border-stone-200">
                  {registration.signature_url ? (
                    <img src={registration.signature_url} alt="Assinatura" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs text-stone-400">Não assinada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all">Fechar</button>
        </div>
      </div>
    </Modal>
  );
};

const ResetPassword = ({ onComplete }: { onComplete: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Você já pode entrar.' });
      setTimeout(onComplete, 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <Clock className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold">Nova Senha</h2>
        <p className="text-stone-500 text-sm mt-2">Defina sua nova senha de acesso</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Nova Senha</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12" 
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Confirmar Nova Senha</label>
          <input 
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
            placeholder="••••••••"
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Atualizar Senha'
          )}
        </button>
        <button 
          type="button" 
          onClick={onComplete}
          disabled={loading}
          className="w-full mt-3 bg-stone-100 text-stone-600 py-4 rounded-xl font-bold hover:bg-stone-200 transition-all disabled:opacity-50 flex items-center justify-center"
        >
          Voltar para o Login
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'home' | 'member' | 'pastor' | 'reset-password' | 'post-detail' | 'cantina'>('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState(false);
  const fetchingRef = useRef(false);

  // Global Visit Tracking with Privacy Safeguards
  const trackVisit = async (pageName: string) => {
    const consent = localStorage.getItem('cookie_consent');
    if (consent === 'false' || !pageName) return;

    // Use a session-based lock to prevent multiple increments for the same page in the same session
    const sessionKey = `tracked_${pageName}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Rate Limiting: Max 100 increments per user per day for tracking
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_action_key: `track_visit_${pageName}`,
        p_limit: 10, // Max 10 tracked segments per page per window
        p_window_seconds: 3600
      });

      if (!allowed) return;

      // Atomic call to Postgres function - Idempotent pattern
      const { error } = await supabase.rpc('increment_page_visit', {
        p_page_name: pageName,
        p_visit_date: today
      });

      if (!error) {
        sessionStorage.setItem(sessionKey, 'true');
      }
    } catch (err) {
      // Silent fail
    }
  };

  useEffect(() => {
    trackVisit(view);
  }, [view]);

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isPlannedVisitModalOpen, setIsPlannedVisitModalOpen] = useState(false);
  const [mediaContents, setMediaContents] = useState<MediaContent[]>([]);
  const [weeklyRepositoryData, setWeeklyRepositoryData] = useState<WeeklyRepositoryData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const cached = localStorage.getItem('mevam_cached_announcements');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [churchServices, setChurchServices] = useState<ChurchService[]>(() => {
    try {
      const isInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
      const cached = typeof window !== 'undefined' ? localStorage.getItem('mevam_cached_church_services') : null;
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 || isInit) return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_CHURCH_SERVICES;
  });
  const [liveStream, setLiveStream] = useState<{ id?: string, url: string, is_active: boolean } | null>(null);
  const [carouselEvents, setCarouselEvents] = useState<any[]>([]);
  const [congresses, setCongresses] = useState<Congress[]>([]);
  const [selectedCongressForReg, setSelectedCongressForReg] = useState<Congress | null>(null);
  const [isCongressRegModalOpen, setIsCongressRegModalOpen] = useState(false);
  const [isCongressModalOpen, setIsCongressModalOpen] = useState(false);
  const [isCellsModalOpen, setIsCellsModalOpen] = useState(false);
  const [isRepositoryModalOpen, setIsRepositoryModalOpen] = useState(false);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [isGivingModalOpen, setIsGivingModalOpen] = useState(false);
  const [isListsModalOpen, setIsListsModalOpen] = useState(false);
  const [isMercadoModalOpen, setIsMercadoModalOpen] = useState(false);
  const [isMercadoOpen, setIsMercadoOpen] = useState(false);
  const [isCantinaOpen, setIsCantinaOpen] = useState(false);
  const [cantinaPixCode, setCantinaPixCode] = useState('');
  const [cantinaEventDate, setCantinaEventDate] = useState('');
  const [cantinaProducts, setCantinaProducts] = useState<any[]>([]);
  const [mercadoRegistrations, setMercadoRegistrations] = useState<any[]>([]);
  const [selectedMercadoRegistration, setSelectedMercadoRegistration] = useState<any>(null);
  const [isMercadoDetailOpen, setIsMercadoDetailOpen] = useState(false);
  const [userUnavailabilities, setUserUnavailabilities] = useState<any[]>([]);
  const [ministryUnavailabilities, setMinistryUnavailabilities] = useState<any[]>([]);
  const [isAddingUnavailability, setIsAddingUnavailability] = useState(false);
  const [newUnavailability, setNewUnavailability] = useState({ date: '', ministry_id: '', reason: '' });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [userMinistries, setUserMinistries] = useState<UserMinistry[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>(DEFAULT_CELL_GROUPS);
  const [bibleReading, setBibleReading] = useState<number[]>([]);
  const [kids, setKids] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    whatsapp: '',
    dataNascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    cell_id: ''
  });
  const [ministryNotices, setMinistryNotices] = useState<MinistryNotice[]>([]);
  const [ministryScales, setMinistryScales] = useState<MinistryScale[]>([]);
  const [ministryReports, setMinistryReports] = useState<MinistryReport[]>([]);
  const [userDevotionals, setUserDevotionals] = useState<MediaContent[]>([]);
  const [ministryMembers, setMinistryMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'primary'
  });

  const fetchUserData = async (currentUser: any) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    let fetchTimeout: any = null;
    const isDemoUser = currentUser.id?.startsWith('demo-') || currentUser.is_demo;

    if (isDemoUser || !isSupabaseConfigured) {
      setLoading(true);
      const role = currentUser.email === 'anderlevita@gmail.com' ? 'admin' : 'member';
      setUserRole(role);
      setFormData({
        nome: currentUser.user_metadata?.full_name || 'Usuário Demo MeVAN',
        email: currentUser.email || 'membro@mevam.org.br',
        cpf: '123.456.789-00',
        whatsapp: '(11) 98765-4321',
        dataNascimento: '1995-05-15',
        cep: '88301-000',
        endereco: 'Rua Principal',
        numero: '100',
        bairro: 'Centro',
        cidade: 'Itajaí',
        cell_id: 'c1'
      });
      
      // Populate mock data so Demo Mode feels alive
      setUserMinistries([
        { id: '1', user_id: currentUser.id, ministry_id: 'm1', is_leader: role === 'admin' }
      ]);
      setMinistries([
        { id: 'm1', name: 'Ministério de Comunicação', description: 'Comunicação e mídia' },
        { id: 'm2', name: 'Ministério de Louvor', description: 'Louvor e adoração' },
        { id: 'm3', name: 'Mevam Kids', description: 'Crianças' }
      ]);
      setMinistryNotices([
        { id: 'n1', ministry_id: 'm1', title: 'Reunião de Alinhamento', content: 'Próximo sábado às 14h na sala principal.', date: new Date().toISOString(), ministry_name: 'Ministério de Comunicação' }
      ]);
      setMinistryScales([
        { id: 's1', ministry_id: 'm1', user_id: currentUser.id, date: new Date().toISOString().split('T')[0], time: '19:30', role: 'Operador de Câmera', ministry_name: 'Ministério de Comunicação' }
      ]);
      setBibleReading([1, 2, 3]);
      setAnnouncements([
        { id: 'a1', title: 'Conferência de Pastores 2026', content: 'Inscrições abertas para a nossa conferência anual. Participe!', created_at: new Date().toISOString() }
      ]);
      setCellGroups([
        { id: 'c1', name: 'Célula Centro', leader_name: 'Carlos Oliveira', schedule: 'Quartas às 20h', address: 'Rua das Flores, 123' },
        { id: 'c2', name: 'Célula Glória', leader_name: 'Maria Souza', schedule: 'Quintas às 19:30', address: 'Av. Brasil, 456' }
      ]);
      
      if (role === 'admin') {
        setMinistryReports([
          { id: 'r1', ministry_id: 'm1', month: '2026-06', status: 'submitted', members_present: 12, visitors: 3, notes: 'Ótima participação e engajamento da equipe.', created_at: new Date().toISOString(), ministry_name: 'Ministério de Comunicação' }
        ]);
        setMinistryMembers([
          { id: 'tm1', ministry_id: 'm1', user_id: 'u2', is_leader: false, full_name: 'Lucas Souza', whatsapp: '(47) 98888-7777' },
          { id: 'tm2', ministry_id: 'm1', user_id: 'u3', is_leader: false, full_name: 'Mariana Lima', whatsapp: '(47) 99999-4444' }
        ]);
        setMinistryUnavailabilities([
          { id: 'un1', ministry_id: 'm1', user_id: 'u2', date: new Date().toISOString().split('T')[0], reason: 'Viagem de trabalho', profiles: { full_name: 'Lucas Souza' }, ministries: { name: 'Ministério de Comunicação' } }
        ]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTimeout = setTimeout(() => {
      console.warn('Busca de dados do usuário demorou muito. Encerrando carregamento por segurança.');
      setLoading(false);
    }, 4500);

    try {
      let profileRole = 'member';
      let uMinistries: any[] = [];

      // Helper function to run database fetch with strict timeout
      const withTimeout = async (promiseFn: () => Promise<any>, name: string, timeoutMs = 2500) => {
        const start = Date.now();
        return new Promise<any>((resolve) => {
          let isSettled = false;
          const t = setTimeout(() => {
            if (!isSettled) {
              isSettled = true;
              console.warn(`⚠️ [Supabase Timeout] A busca por "${name}" excedeu o limite de ${timeoutMs}ms e foi ignorada.`);
              resolve(null);
            }
          }, timeoutMs);
          
          promiseFn()
            .then((res) => {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(t);
                console.log(`✅ [Supabase OK] "${name}" carregado com sucesso em ${Date.now() - start}ms.`);
                resolve(res);
              }
            })
            .catch((err) => {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(t);
                console.warn(`⚠️ [Supabase Aviso] "${name}" falhou após ${Date.now() - start}ms:`, err?.message || err);
                resolve(null);
              }
            });
        });
      };

      // Define independent, parallelizable queries with individual safety nets and timeouts
      const fetchSettings = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('app_settings')
            .select('*');
          if (error) throw error;
          if (data) {
            const cleanVal = (val: any): string => {
              if (typeof val === 'string') {
                return val.replace(/^"|"$/g, '');
              }
              return val !== undefined && val !== null ? String(val) : '';
            };
            const weekly = data.find(s => s.key === 'weekly_repository_data');
            if (weekly && weekly.value) setWeeklyRepositoryData(weekly.value);
            const mercado = data.find(s => s.key === 'mercado_solidario_open');
            if (mercado) setIsMercadoOpen(mercado.value === true);
            const cantina = data.find(s => s.key === 'cantina_enabled');
            if (cantina) setIsCantinaOpen(cantina.value === true);
            const pix = data.find(s => s.key === 'cantina_pix_code');
            if (pix) setCantinaPixCode(cleanVal(pix.value));
            const date = data.find(s => s.key === 'cantina_event_date');
            if (date) setCantinaEventDate(cleanVal(date.value));
          }
        }, 'App Settings');
      };

      const fetchProfile = async () => {
        await withTimeout(async () => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }
          
          if (profile) {
            profileRole = profile.role || 'member';
            setUserRole(profileRole);
            
            // Sync privacy preferences from DB if found (One-time persistent acceptance)
            if (profile.privacy_policy_accepted) {
              localStorage.setItem('privacy_accepted', 'true');
            }
            if (profile.cookie_consent_accepted) {
              localStorage.setItem('cookie_consent', 'true');
              window.dispatchEvent(new CustomEvent('analytics-allowed'));
            }

            setFormData({
              nome: profile.full_name || '',
              email: currentUser.email || '',
              cpf: profile.cpf || '',
              whatsapp: profile.whatsapp || '',
              dataNascimento: profile.birth_date || '',
              cep: profile.cep || '',
              endereco: profile.address || '',
              numero: profile.number || '',
              bairro: profile.neighborhood || '',
              cidade: profile.city || '',
              cell_id: profile.cell_id || ''
            });
          } else {
            setFormData((prev: any) => ({ ...prev, email: currentUser.email || '' }));
          }
        }, 'Profile');
      };

      const fetchUserMinistries = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('user_ministries')
            .select('*')
            .eq('user_id', currentUser.id);
          if (error) throw error;
          if (data) {
            uMinistries = data;
            setUserMinistries(data);
          }
        }, 'User Ministries');
      };

      const fetchBible = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('bible_reading')
            .select('day_number')
            .eq('user_id', currentUser.id)
            .eq('completed', true);
          if (error) throw error;
          if (data) {
            setBibleReading(data.map(r => r.day_number));
          }
        }, 'Bible Reading Tracker');
      };

      const fetchAnn = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data && Array.isArray(data)) {
            setAnnouncements(data);
            try {
              localStorage.setItem('mevam_cached_announcements', JSON.stringify(data));
            } catch (e) {}
          }
        }, 'Announcements');
      };

      const fetchDevotions = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('media_contents')
            .select('*')
            .eq('author_id', currentUser.id)
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) setUserDevotionals(data);
        }, 'Devotionals');
      };

      const fetchKidsData = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('kids_registrations')
            .select('*')
            .eq('parent_id', currentUser.id)
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) setKids(data);
        }, 'Kids Registrations');
      };

      const fetchUnavail = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('user_unavailability')
            .select('*, ministries(name)')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: true });
          if (error) throw error;
          if (data) {
            setUserUnavailabilities(data.map(u => ({
              ...u,
              ministry_name: (u as any).ministries?.name
            })));
          }
        }, 'User Unavailability');
      };

      const fetchAllMinistries = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('ministries')
            .select('*')
            .order('name');
          if (error) throw error;
          if (data) setMinistries(data);
        }, 'Ministries List');
      };

      const fetchCells = async () => {
        await withTimeout(async () => {
          const { data, error } = await supabase
            .from('cell_groups')
            .select('*')
            .order('name');
          if (error) throw error;
          if (data) setCellGroups(data);
        }, 'Cell Groups List');
      };

      // Fire independent calls concurrently
      await Promise.all([
        fetchSettings(),
        fetchProfile(),
        fetchUserMinistries(),
        fetchBible(),
        fetchAnn(),
        fetchDevotions(),
        fetchKidsData(),
        fetchUnavail(),
        fetchAllMinistries(),
        fetchCells()
      ]);

      // Resolve dependent details based on previous fetches
      const selectedMinistryIds = uMinistries?.map(m => m.ministry_id) || [];
      const isLeader = uMinistries?.some(m => m.is_leader);
      const isPrivilegedUser = profileRole === 'admin' || profileRole === 'pastor' || isLeader;

      const dependentTasks: Promise<void>[] = [];

      if (selectedMinistryIds.length > 0) {
        const fetchNoticesAndScales = async () => {
          await withTimeout(async () => {
            const noticesPromise = supabase
              .from('ministry_notices')
              .select('*, ministries(name)')
              .in('ministry_id', selectedMinistryIds)
              .order('date', { ascending: false });

            const scalesPromise = supabase
              .from('ministry_scales')
              .select('*, ministries(name)')
              .in('ministry_id', selectedMinistryIds)
              .eq('user_id', currentUser.id)
              .order('date', { ascending: true });

            const [noticesRes, scalesRes] = await Promise.all([noticesPromise, scalesPromise]);

            if (noticesRes.data) {
              setMinistryNotices(noticesRes.data.map(n => ({
                ...n,
                ministry_name: (n as any).ministries?.name
              })));
            }
            if (scalesRes.data) {
              setMinistryScales(scalesRes.data.map(s => ({
                ...s,
                ministry_name: (s as any).ministries?.name
              })));
            }
          }, 'Ministry Notices & Scales');
        };
        dependentTasks.push(fetchNoticesAndScales());
      }

      if (isPrivilegedUser) {
        const fetchAllProfiles = async () => {
          await withTimeout(async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .order('full_name');
            if (error) throw error;
            if (data) setProfiles(data);
          }, 'All Profiles (Admin/Pastor/Leader)');
        };
        dependentTasks.push(fetchAllProfiles());
      }

      const leaderMinistries = uMinistries?.filter(m => m.is_leader) || [];
      if (leaderMinistries.length > 0) {
        const leaderMinistryIds = leaderMinistries.map(m => m.ministry_id);

        const fetchLeaderDetails = async () => {
          await withTimeout(async () => {
            const reportsPromise = supabase
              .from('ministry_reports')
              .select('*, ministries(name)')
              .in('ministry_id', leaderMinistryIds)
              .order('month', { ascending: false });

            const unavailPromise = supabase
              .from('user_unavailability')
              .select('*, profiles(full_name), ministries(name)')
              .in('ministry_id', leaderMinistryIds)
              .order('date', { ascending: true });

            const teamPromise = supabase
              .from('user_ministries')
              .select('*, profiles(full_name, whatsapp)')
              .in('ministry_id', leaderMinistryIds);

            const [reportsRes, unavailRes, teamRes] = await Promise.all([
              reportsPromise,
              unavailPromise,
              teamPromise
            ]);

            if (reportsRes.data) {
              setMinistryReports(reportsRes.data.map(r => ({
                ...r,
                ministry_name: (r as any).ministries?.name
              })));
            }
            if (unavailRes.data) {
              setMinistryUnavailabilities(unavailRes.data);
            }
            if (teamRes.data) {
              setMinistryMembers(teamRes.data.map(t => ({
                ...t,
                full_name: (t as any).profiles?.full_name,
                whatsapp: (t as any).profiles?.whatsapp
              })));
            }
          }, 'Leader Dashboard Details');
        };
        dependentTasks.push(fetchLeaderDetails());
      }

      if (dependentTasks.length > 0) {
        await Promise.all(dependentTasks);
      }

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const toggleMercadoStatus = async () => {
    const newValue = !isMercadoOpen;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'mercado_solidario_open', value: newValue, updated_at: new Date().toISOString() });
      if (error) throw error;
      setIsMercadoOpen(newValue);
    } catch (e) {
      console.error('Erro ao atualizar status do mercado:', e);
      alert('Erro ao atualizar status do mercado.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMercadoRegistration = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cadastro',
      message: 'Tem certeza que deseja excluir permanentemente este cadastro?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('mercado_solidario_registrations')
            .delete()
            .eq('id', id);
          if (error) throw error;
          
          setMercadoRegistrations(prev => prev.filter(r => r.id !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          alert('Erro ao excluir cadastro.');
        }
      }
    });
  };

  const handleShareMercadoRegistration = (reg: any) => {
    const status = reg.status === 'approved' ? 'APROVADO ✅' : reg.status === 'rejected' ? 'PENDENTE DE CORREÇÃO ⚠️' : 'EM ANÁLISE ⏳';
    let message = `*Mevam Itapema Sertão - Mercado Solidário*\n\n`;
    message += `Olá, *${reg.full_name}*!\n\n`;
    message += `Seu cadastro número *#${reg.registration_number || reg.id.substring(0, 4)}* está: *${status}*\n\n`;
    
    if (reg.status === 'approved') {
      message += `Temos a alegria de informar que sua inscrição foi aprovada. Entraremos em contato em breve para informar a data de retirada da sua cesta.\n\n`;
    } else if (reg.status === 'rejected') {
      message += `Detectamos que alguns dados do seu cadastro precisam ser revisados para darmos continuidade ao processo.\n\n`;
      message += `*Por favor, verifique:*\n- Foto do documento legível\n- Comprovação de endereço\n- Detalhes da renda familiar\n\n`;
      message += `Você pode entrar em contato conosco para esclarecer dúvidas.\n\n`;
    } else {
      message += `Sua ficha está sendo avaliada por nossa assistência social. Por favor, aguarde nosso retorno.\n\n`;
    }
    
    message += `Que Deus te abençoe!`;
    
    const encodedMessage = encodeURIComponent(message);
    const phone = reg.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const fetchHomeContent = async () => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase não configurado. Pulando busca de conteúdo inicial.');
      return;
    }
    try {
      const safeQuery = async (queryPromise: PromiseLike<any>, timeoutMs = 4000) => {
        try {
          const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
            setTimeout(() => resolve({ data: null, error: new Error('Request timed out') }), timeoutMs);
          });
          const res = await Promise.race([queryPromise, timeoutPromise]);
          return res;
        } catch (err: any) {
          console.warn('Aviso na consulta:', err?.message || err);
          return { data: null, error: err };
        }
      };

      const [mediaRes, annRes, liveRes, eventsRes, congressRes, settingsRes, cantinaProductsRes, cellsRes, servicesRes] = await Promise.all([
        safeQuery(supabase.from('media_contents').select('*').order('created_at', { ascending: false })),
        safeQuery(supabase.from('announcements').select('*').order('created_at', { ascending: false })),
        safeQuery(supabase.from('live_stream').select('*').single()),
        safeQuery(supabase.from('events_carousel').select('*').order('display_order', { ascending: true })),
        safeQuery(supabase.from('congresses').select('*').order('date', { ascending: true })),
        safeQuery(supabase.from('app_settings').select('*')),
        safeQuery(supabase.from('cantina_products').select('*').eq('is_active', true).order('title', { ascending: true })),
        safeQuery(supabase.from('cell_groups').select('*').order('name')),
        safeQuery(supabase.from('church_services').select('*').order('order_index', { ascending: true }))
      ]);

      if (!servicesRes.error && Array.isArray(servicesRes.data)) {
        if (servicesRes.data.length > 0) {
          setChurchServices(servicesRes.data);
          try {
            localStorage.setItem('mevam_cached_church_services', JSON.stringify(servicesRes.data));
            localStorage.setItem('mevam_church_services_initialized', 'true');
          } catch (e) {}
        } else {
          const isInit = typeof window !== 'undefined' && localStorage.getItem('mevam_church_services_initialized') === 'true';
          if (isInit) {
            setChurchServices([]);
            try {
              localStorage.setItem('mevam_cached_church_services', JSON.stringify([]));
            } catch (e) {}
          }
        }
      }

      if (!mediaRes.error && Array.isArray(mediaRes.data)) {
        setMediaContents(mediaRes.data);
      }

      if (!annRes.error && Array.isArray(annRes.data)) {
        setAnnouncements(annRes.data);
        try {
          localStorage.setItem('mevam_cached_announcements', JSON.stringify(annRes.data));
        } catch (e) {}
      }

      if (!liveRes.error) {
        setLiveStream(liveRes.data || null);
      }

      if (!congressRes.error && Array.isArray(congressRes.data)) {
        setCongresses(congressRes.data);
      }

      if (!cellsRes.error && Array.isArray(cellsRes.data)) {
        setCellGroups(cellsRes.data.length > 0 ? cellsRes.data : DEFAULT_CELL_GROUPS);
      }
      
      if (!settingsRes.error && Array.isArray(settingsRes.data)) {
        const d = settingsRes.data as any[];
        const weekly = d.find(s => s.key === 'weekly_repository_data');
        if (weekly && weekly.value) setWeeklyRepositoryData(weekly.value);
        const mercado = d.find(s => s.key === 'mercado_solidario_open');
        if (mercado) setIsMercadoOpen(mercado.value === true);
        const cantina = d.find(s => s.key === 'cantina_enabled');
        if (cantina) setIsCantinaOpen(cantina.value === true);
        const pix = d.find(s => s.key === 'cantina_pix_code');
        if (pix) setCantinaPixCode(pix.value || '');
        const date = d.find(s => s.key === 'cantina_event_date');
        if (date) setCantinaEventDate(date.value || '');
      }

      if (!cantinaProductsRes.error && Array.isArray(cantinaProductsRes.data)) {
        setCantinaProducts(cantinaProductsRes.data);
      }
      
      if (!eventsRes.error && Array.isArray(eventsRes.data)) {
        setCarouselEvents(eventsRes.data);
      } else if (eventsRes.error && (eventsRes.error as any).code === '42P01') {
        console.warn('A tabela events_carousel não existe. Certifique-se de executar o código SQL fornecido.');
      }
    } catch (error) {
      console.error('Error fetching home content:', error);
    }
  };

  useEffect(() => {
    // Safety fallback: ensure loading is disabled even if Supabase gets stuck, hangs, or fails to respond
    const boundaryTimer = setTimeout(() => {
      setLoading(false);
    }, 4500);

    fetchHomeContent();

    // Handle password reset redirection and cantina hash
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setView('reset-password');
      } else if (hash === '#cantina') {
        setView('cantina');
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    let subscription: any = null;
    let realtimeChannel: any = null;

    if (isSupabaseConfigured) {
      // onAuthStateChange with INITIAL_SESSION handles both mount and updates in v2
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setView('reset-password');
        }
        
        if (session?.user) {
          setCurrentUser(session.user);
          await fetchUserData(session.user);
        } else {
          setCurrentUser(null);
          setLoading(false);
          setUserRole('member');
          setUserMinistries([]);
          setMinistryNotices([]);
          setMinistryScales([]);
          setBibleReading([]);
          setUserDevotionals([]);
          setKids([]);
          setUserUnavailabilities([]);
        }
      });
      subscription = sub;

      // Inscrição Realtime via Supabase Channel para sincronização automática imediata
      try {
        realtimeChannel = supabase.channel('mevam-public-realtime')
          .on('broadcast', { event: 'content_sync' }, (payload: any) => {
            if (payload?.payload?.table === 'church_services' && Array.isArray(payload?.payload?.services)) {
              setChurchServices(payload.payload.services);
              try {
                localStorage.setItem('mevam_cached_church_services', JSON.stringify(payload.payload.services));
                localStorage.setItem('mevam_church_services_initialized', 'true');
              } catch (e) {}
            }
            fetchHomeContent();
          })
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'church_services' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'announcements' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'events_carousel' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'media_contents' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'live_stream' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'congresses' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'cell_groups' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_settings' },
            () => {
              fetchHomeContent();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'cantina_products' },
            () => {
              fetchHomeContent();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Erro ao conectar ao canal Realtime do Supabase:', err);
      }
    } else {
      setLoading(false);
    }

    // Sincronização entre abas abertas no mesmo navegador
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'mevam_cached_church_services' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setChurchServices(parsed);
          }
        } catch (err) {}
      }
      if (
        e.key === 'mevam_cached_church_services' || 
        e.key === 'mevam_cached_announcements' || 
        e.key === 'mevam_has_unread_notice'
      ) {
        fetchHomeContent();
      }
    };
    window.addEventListener('storage', handleStorageSync);

    // Sincronização em tempo real de eventos internos do app
    const handleLocalSync = (e?: any) => {
      if (e?.detail?.table === 'church_services' && Array.isArray(e?.detail?.services)) {
        setChurchServices(e.detail.services);
      }
      fetchHomeContent();
    };
    window.addEventListener('mevam:content_sync', handleLocalSync);

    // Sincronização ao reativar a aba
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        fetchHomeContent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilitySync);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('mevam:content_sync', handleLocalSync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      if (subscription) subscription.unsubscribe();
      clearTimeout(boundaryTimer);
    };
  }, []);

  const handleDeleteAnnouncementRoot = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este aviso? Ele será removido permanentemente da Central e da Página Inicial.')) {
      return;
    }
    // Remoção otimista imediata
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    // Cache local persistente
    try {
      const cached = JSON.parse(localStorage.getItem('mevam_cached_announcements') || '[]');
      const updated = cached.filter((a: any) => a.id !== id);
      localStorage.setItem('mevam_cached_announcements', JSON.stringify(updated));
    } catch (e) {}

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao excluir aviso no Supabase:', error.message);
      }
      fetchHomeContent();
      try {
        window.dispatchEvent(new CustomEvent('mevam:content_sync', { detail: { table: 'announcements' } }));
      } catch (e) {}
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  return (
    <div className="min-h-screen selection:bg-primary/30">
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-100 p-4 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-amber-800 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <p>
              O Supabase não está configurado. Vá em <strong>Settings &gt; Environment Variables</strong> e adicione 
              <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>
      )}
      <Navbar 
        onOpenMemberArea={() => setView('member')} 
        onOpenPastorArea={() => setView('pastor')}
        onOpenVisitorForm={() => setIsVisitorModalOpen(true)}
        onOpenPlannedVisit={() => setIsPlannedVisitModalOpen(true)}
        showNewHereButton={view === 'home'}
        isLoggedIn={!!currentUser}
        onOpenInstallApp={() => setShowPWAInstallModal(true)}
        onOpenCongress={() => setIsCongressModalOpen(true)}
        onOpenCells={() => setIsCellsModalOpen(true)}
        onOpenRepository={() => setIsRepositoryModalOpen(true)}
        onOpenGiving={() => setIsGivingModalOpen(true)}
        onOpenPrayer={() => setIsPrayerModalOpen(true)}
        onOpenLists={() => setIsListsModalOpen(true)}
      />
      <VisitorModal isOpen={isVisitorModalOpen} onClose={() => setIsVisitorModalOpen(false)} />
      <PlannedVisitModal isOpen={isPlannedVisitModalOpen} onClose={() => setIsPlannedVisitModalOpen(false)} />
      <MercadoSolidarioModal isOpen={isMercadoModalOpen} onClose={() => setIsMercadoModalOpen(false)} />
      <MercadoSolidarioDetailModal 
        isOpen={isMercadoDetailOpen} 
        onClose={() => setIsMercadoDetailOpen(false)} 
        registration={selectedMercadoRegistration} 
      />
      <CongressRegistrationModal 
        isOpen={isCongressRegModalOpen} 
        onClose={() => setIsCongressRegModalOpen(false)} 
        congress={selectedCongressForReg}
        user={currentUser}
        onSuccess={() => fetchHomeContent()}
      />
      
      {/* Modals for App Icons (Exclusively opened on icon click) */}
      <EventListsModal 
        isOpen={isListsModalOpen}
        onClose={() => setIsListsModalOpen(false)}
        currentUser={currentUser}
        userRole={userRole}
        onOpenMemberArea={() => setView('member')}
      />
      <CongressModal 
        isOpen={isCongressModalOpen} 
        onClose={() => setIsCongressModalOpen(false)}
        congresses={congresses}
        user={currentUser}
        onRegister={(congress) => {
          setIsCongressModalOpen(false);
          setSelectedCongressForReg(congress);
          setIsCongressRegModalOpen(true);
        }}
      />
      <PrayerModal 
        isOpen={isPrayerModalOpen} 
        onClose={() => setIsPrayerModalOpen(false)} 
      />
      <CellsModal 
        isOpen={isCellsModalOpen} 
        onClose={() => setIsCellsModalOpen(false)} 
        initialCells={cellGroups}
      />
      <RepositoryModal 
        isOpen={isRepositoryModalOpen} 
        onClose={() => setIsRepositoryModalOpen(false)} 
        mediaContents={mediaContents}
        weeklyData={weeklyRepositoryData}
        onOpenPost={(post) => {
          setSelectedPost(post);
          setView('post-detail');
        }}
      />
      <GivingModal 
        isOpen={isGivingModalOpen} 
        onClose={() => setIsGivingModalOpen(false)} 
      />

      <main className="min-h-[calc(100vh-400px)]">
        {view === 'home' && (
          <>
            <Hero 
              onOpenPlannedVisit={() => setIsPlannedVisitModalOpen(true)} 
              onOpenVisitorForm={() => setIsVisitorModalOpen(true)}
              liveStream={liveStream}
              onOpenCantina={() => {
                window.location.hash = '#cantina';
                setView('cantina');
              }}
              announcements={announcements}
              onOpenMemberArea={() => setView('member')}
              currentUser={currentUser}
              onOpenCongress={() => setIsCongressModalOpen(true)}
              onOpenCells={() => setIsCellsModalOpen(true)}
              onOpenRepository={() => setIsRepositoryModalOpen(true)}
              onOpenPrayer={() => setIsPrayerModalOpen(true)}
              onOpenGiving={() => setIsGivingModalOpen(true)}
              onOpenLists={() => setIsListsModalOpen(true)}
              onDeleteAnnouncement={handleDeleteAnnouncementRoot}
              churchServices={churchServices}
            />
            <EventsCarousel events={carouselEvents} />
          </>
        )}

        {view === 'post-detail' && selectedPost && (
          <PostDetail 
            post={selectedPost} 
            onBack={() => setView('home')} 
          />
        )}
        
        {view === 'member' && (
          <MemberArea 
            user={currentUser}
            setCurrentUser={setCurrentUser}
            onBack={() => setView('home')} 
            onAuthSuccess={async (u) => {
              setCurrentUser(u);
              await fetchUserData(u);
            }}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            fetchHomeContent={fetchHomeContent}
            liveStream={liveStream}
            setLiveStream={setLiveStream}
            carouselEvents={carouselEvents}
            userUnavailabilities={userUnavailabilities}
            setUserUnavailabilities={setUserUnavailabilities}
            ministryUnavailabilities={ministryUnavailabilities}
            fetchUserData={fetchUserData}
            profiles={profiles}
            ministries={ministries}
            userMinistries={userMinistries}
            cellGroups={cellGroups}
            bibleReading={bibleReading}
            setBibleReading={setBibleReading}
            kids={kids}
            setKids={setKids}
            userRole={userRole}
            setUserRole={setUserRole}
            formData={formData}
            setFormData={setFormData}
            ministryNotices={ministryNotices}
            setMinistryNotices={setMinistryNotices}
            ministryScales={ministryScales}
            setMinistryScales={setMinistryScales}
            ministryReports={ministryReports}
            setMinistryReports={setMinistryReports}
            userDevotionals={userDevotionals}
            setUserDevotionals={setUserDevotionals}
            ministryMembers={ministryMembers}
            setMinistryMembers={setMinistryMembers}
            confirmModal={confirmModal}
            setConfirmModal={setConfirmModal}
            isAddingUnavailability={isAddingUnavailability}
            setIsAddingUnavailability={setIsAddingUnavailability}
            newUnavailability={newUnavailability}
            setNewUnavailability={setNewUnavailability}
            setUserMinistries={setUserMinistries}
            weeklyRepositoryData={weeklyRepositoryData}
            setWeeklyRepositoryData={setWeeklyRepositoryData}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {view === 'pastor' && (
          <PastorArea 
            onBack={() => setView('home')} 
            onGoToLogin={() => setView('member')}
            mediaContents={mediaContents} 
            setMediaContents={setMediaContents} 
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            fetchHomeContent={fetchHomeContent}
            liveStream={liveStream}
            setLiveStream={setLiveStream}
            carouselEvents={carouselEvents}
            userUnavailabilities={userUnavailabilities}
            ministryUnavailabilities={ministryUnavailabilities}
            fetchUserData={fetchUserData}
            profiles={profiles}
            ministries={ministries}
            userMinistries={userMinistries}
            cellGroups={cellGroups}
            bibleReading={bibleReading}
            setBibleReading={setBibleReading}
            kids={kids}
            setKids={setKids}
            userRole={userRole}
            setUserRole={setUserRole}
            formData={formData}
            setFormData={setFormData}
            ministryNotices={ministryNotices}
            setMinistryNotices={setMinistryNotices}
            ministryScales={ministryScales}
            setMinistryScales={setMinistryScales}
            ministryReports={ministryReports}
            setMinistryReports={setMinistryReports}
            userDevotionals={userDevotionals}
            setUserDevotionals={setUserDevotionals}
            ministryMembers={ministryMembers}
            setMinistryMembers={setMinistryMembers}
            confirmModal={confirmModal}
            setConfirmModal={setConfirmModal}
            isAddingUnavailability={isAddingUnavailability}
            setIsAddingUnavailability={setIsAddingUnavailability}
            newUnavailability={newUnavailability}
            setNewUnavailability={setNewUnavailability}
            setUserMinistries={setUserMinistries}
            congresses={congresses}
            mercadoRegistrations={mercadoRegistrations}
            setMercadoRegistrations={setMercadoRegistrations}
            isMercadoOpen={isMercadoOpen}
            setIsMercadoOpen={setIsMercadoOpen}
            toggleMercadoStatus={toggleMercadoStatus}
            handleDeleteMercadoRegistration={handleDeleteMercadoRegistration}
            handleShareMercadoRegistration={handleShareMercadoRegistration}
            setSelectedMercadoRegistration={setSelectedMercadoRegistration}
            setIsMercadoDetailOpen={setIsMercadoDetailOpen}
            loading={loading}
            isCantinaOpen={isCantinaOpen}
            setIsCantinaOpen={setIsCantinaOpen}
            cantinaPixCode={cantinaPixCode}
            setCantinaPixCode={setCantinaPixCode}
            cantinaEventDate={cantinaEventDate}
            setCantinaEventDate={setCantinaEventDate}
            weeklyRepositoryData={weeklyRepositoryData}
            setWeeklyRepositoryData={setWeeklyRepositoryData}
            churchServices={churchServices}
            setChurchServices={setChurchServices}
          />
        )}

        {view === 'reset-password' && (
          <div className="py-24 bg-stone-50 min-h-screen flex items-center justify-center px-4">
            <ResetPassword onComplete={() => setView('member')} />
          </div>
        )}

        {view === 'cantina' && (
          <CantinaPublic onBack={() => {
            window.location.hash = '';
            setView('home');
          }} />
        )}
      </main>
      
      <Footer onOpenInstallApp={() => setShowPWAInstallModal(true)} />
      <CookieConsent />
      <PWAInstallBanner 
        forceShowModal={showPWAInstallModal} 
        onCloseModal={() => setShowPWAInstallModal(false)} 
      />
      <OfflineIndicator />
    </div>
  );
}
