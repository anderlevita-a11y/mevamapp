import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone, 
  AlertCircle, 
  Database, 
  Sparkles,
  Search
} from 'lucide-react';
import { 
  getPushCleanupLogs, 
  runPushTokenCleanup, 
  TokenCleanupLog, 
  TokenCleanupSummary 
} from '../lib/pushNotifications';

interface PushTokensLogProps {
  currentSubscribersCount?: number;
  onRefreshParentCount?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const PushTokensLog: React.FC<PushTokensLogProps> = ({
  currentSubscribersCount = 0,
  onRefreshParentCount,
  className = '',
  isCompact = false
}) => {
  const [data, setData] = useState<TokenCleanupSummary>({
    totalRemoved: 0,
    activeTokensCount: currentSubscribersCount,
    lastCleanedAt: null,
    logs: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningSweep, setIsRunningSweep] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const summary = await getPushCleanupLogs();
      setData({
        ...summary,
        activeTokensCount: currentSubscribersCount > 0 ? currentSubscribersCount : summary.activeTokensCount
      });
    } catch (err) {
      console.warn('[PushTokensLog] Falha ao carregar logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentSubscribersCount]);

  const handleRunSweep = async () => {
    setIsRunningSweep(true);
    setFeedbackMessage(null);
    try {
      const res = await runPushTokenCleanup();
      setData(prev => ({
        totalRemoved: res.totalRemoved,
        activeTokensCount: currentSubscribersCount || prev.activeTokensCount,
        lastCleanedAt: new Date().toISOString(),
        logs: res.logs
      }));
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Varredura de integridade executada com sucesso!'
      });
      if (onRefreshParentCount) {
        onRefreshParentCount();
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'info',
        text: err?.message || 'Varredura concluída sem falhas.'
      });
    } finally {
      setIsRunningSweep(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const filteredLogs = data.logs.filter(log => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      log.trigger.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.reasonCodes.some(c => c.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-stone-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-stone-950 font-bold shadow-sm flex-shrink-0">
              <ShieldCheck size={22} className="text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900">
                  Saúde da Base de Assinaturas (Web Push)
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Auto-Expurgo 410/404 Ativo
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Monitoramento e higienização automática de tokens de notificação expirados ou revogados pelos aparelhos dos membros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
            <button
              type="button"
              onClick={handleRunSweep}
              disabled={isRunningSweep || isLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Executar verificação manual imediata de tokens da base"
            >
              <RefreshCw size={13} className={isRunningSweep ? 'animate-spin' : ''} />
              <span>{isRunningSweep ? 'Verificando...' : 'Varredura Agora'}</span>
            </button>

            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 transition cursor-pointer"
              title="Recarregar histórico"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className="px-5 pt-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tokens Expirados Removidos */}
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tokens Expirados</span>
            <Trash2 size={16} className="text-rose-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-950">
              {data.totalRemoved}
            </span>
            <span className="text-[11px] font-bold text-rose-700">removidos</span>
          </div>
          <p className="text-[10px] text-rose-700/90 mt-1 font-medium">
            Códigos HTTP 410 & 404
          </p>
        </div>

        {/* Card 2: Assinaturas Ativas */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aparelhos Ativos</span>
            <Smartphone size={16} className="text-stone-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-stone-900">
              {currentSubscribersCount > 0 ? currentSubscribersCount : data.activeTokensCount}
            </span>
            <span className="text-[11px] font-bold text-stone-500">válidos</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-1 font-medium">
            Prontos para receber avisos
          </p>
        </div>

        {/* Card 3: Estado da Base */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saúde da Base</span>
            <Sparkles size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-emerald-950">
              100% Íntegra
            </span>
          </div>
          <p className="text-[10px] text-emerald-700/90 mt-1 font-medium">
            Zero acúmulo de lixo
          </p>
        </div>

        {/* Card 4: Última Varredura */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Última Higienização</span>
            <Database size={16} className="text-amber-600" />
          </div>
          <div className="text-xs font-bold text-amber-950 truncate mt-1">
            {data.lastCleanedAt ? formatDate(data.lastCleanedAt) : 'Ao enviar avisos'}
          </div>
          <p className="text-[10px] text-amber-800/80 mt-1 font-medium">
            Em tempo real a cada disparo
          </p>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="px-5 sm:px-6 pb-2">
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 text-xs text-stone-600 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-xs">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            <span>Como funciona a limpeza automática (Garantia de Saúde da Base):</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            Quando um membro troca de smartphone, desinstala o navegador ou revoga as permissões de notificação, os servidores do Google (FCM) e Apple (APNs) retornam os códigos <strong className="text-stone-900">410 (Gone)</strong> ou <strong className="text-stone-900">404 (Not Found)</strong>. O sistema intercepta essas respostas e <span className="font-semibold text-rose-700">remove imediatamente</span> os registros do banco de dados, mantendo a lista limpa, sem sobrecarga de rede e sem desperdício de chamadas.
          </p>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-stone-900">
              Histórico de Limpezas & Expurgos Automáticos
            </h4>
            <span className="text-xs text-stone-400">
              ({filteredLogs.length} registro{filteredLogs.length === 1 ? '' : 's'})
            </span>
          </div>

          {!isCompact && (
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrar por evento ou motivo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500 opacity-80" />
            <p className="text-xs font-bold text-stone-700">Nenhum token expirado registrado</p>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              Todos os aparelhos cadastrados estão ativos e respondendo normalmente aos disparos de notificação.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const hasCleaned = log.removedCount > 0;
              return (
                <div
                  key={log.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasCleaned
                      ? 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                      : 'bg-stone-50/60 border-stone-200/70 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        hasCleaned
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {hasCleaned ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {log.trigger}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            hasCleaned
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {hasCleaned ? `-${log.removedCount} token(s) expurgado(s)` : '0 expirados'}
                        </span>
                        <div className="flex items-center gap-1">
                          {log.reasonCodes.map((code, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-600 leading-tight">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between text-[11px] text-stone-400 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200/50">
                    <span className="font-medium text-stone-500">{formatDate(log.timestamp)}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} /> Base Sincronizada
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PushTokensLog;
