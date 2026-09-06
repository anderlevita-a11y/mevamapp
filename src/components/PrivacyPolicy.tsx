import React from 'react';
import { ShieldCheck, X, Lock, Eye } from 'lucide-react';

export const PRIVACY_POLICY_CONTENT = {
  version: "1.0",
  lastUpdated: "Maio de 2026",
  organization: "MEVAM Itapema Sertão",
  content: `
    ## 1. Introdução
    A sua privacidade é fundamental para nós. Esta Política de Privacidade explica como o MEVAM Itapema Sertão coleta, usa e protege suas informações pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

    ## 2. Dados que Coletamos
    Para sua participação em ministérios, eventos e gestão de membros, coletamos:
    - **Dados de Identificação:** Nome completo, CPF, Data de Nascimento.
    - **Dados de Contato:** E-mail, Telefone, Endereço.
    - **Dados de Membresia:** Ministérios de interesse, histórico de escalas e participações.
    - **Dados Sensíveis:** Convicções religiosas e inclinações vocacionais (coletadas via Teste Vocacional).

    ## 3. Finalidade do Tratamento
    Seus dados são utilizados exclusivamente para:
    - Organização de escalas de serviço e ministérios.
    - Comunicação interna sobre avisos, eventos e convocações.
    - Orientação ministerial através do Teste Vocacional.
    - Gestão administrativa da membresia da igreja local.

    ## 4. Compartilhamento e Segurança
    NÃO compartilhamos seus dados com terceiros para fins comerciais. O acesso aos dados é restrito aos líderes de ministérios e administradores do sistema. Utilizamos tecnologias seguras para proteger suas informações contra acessos não autorizados.

    ## 5. Seus Direitos (LGPD)
    Você tem o direito de:
    - Confirmar a existência de tratamento de seus dados.
    - Acessar, corrigir ou atualizar seus dados.
    - Solicitar a exclusão de seus dados (isso pode impactar sua participação ativa em escalas digitais).
    - Revogar este consentimento a qualquer momento.

    ## 6. Consentimento
    Ao utilizar este sistema e marcar a caixa de aceite, você declara que compreende e concorda com o tratamento de seus dados para as finalidades ministeriais aqui descritas.
  `
};

export const PrivacyPolicyModal = ({ isOpen, onClose, onAccept }: { isOpen: boolean, onClose: () => void, onAccept?: () => void }) => {
  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-stone-100">
        <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">Política de Privacidade</h2>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Conformidade LGPD</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto prose prose-stone max-w-none flex-1 custom-scrollbar">
          <div className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
            {PRIVACY_POLICY_CONTENT.content}
          </div>
          
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start space-x-3">
              <Lock size={20} className="text-blue-500 mt-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-900 mb-1">Dados Protegidos</p>
                <p className="text-[10px] text-blue-700 leading-tight">Criptografia de ponta a ponta em todas as transações.</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start space-x-3">
              <Eye size={20} className="text-green-500 mt-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-green-900 mb-1">Transparência</p>
                <p className="text-[10px] text-green-700 leading-tight">Você decide como seus dados são usados na igreja.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8 border-t border-stone-100 bg-white">
          <button 
            onClick={handleAccept}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-900/20"
          >
            Entendi e Aceito
          </button>
        </div>
      </div>
    </div>
  );
};
