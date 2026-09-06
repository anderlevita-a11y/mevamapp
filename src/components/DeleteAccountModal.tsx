import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isDeleting }: DeleteAccountModalProps) => {
  const [confirmText, setConfirmText] = useState('');
  const REQUIRED_TEXT = 'EXCLUIR';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-red-100"
        >
          <div className="p-8 border-b border-red-50 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center space-x-3 text-red-600">
              <ShieldAlert size={24} />
              <h2 className="text-xl font-black tracking-tight uppercase italic">Zona de Perigo</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-stone-900 mb-4 tracking-tight">Tem certeza de que deseja ir?</h3>
            
            <p className="text-stone-500 text-sm leading-relaxed mb-8">
              Esta ação é <span className="font-bold text-red-600">definitiva</span> segundo os termos da LGPD. Todos os seu históricos, participações e dados ministeriais serão apagados imediatamente sem possibilidade de recuperação.
            </p>

            <div className="space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1 mb-2 block">
                  Digite "{REQUIRED_TEXT}" para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="EXCLUIR"
                  className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  disabled={confirmText !== REQUIRED_TEXT || isDeleting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-30 disabled:shadow-none flex items-center justify-center"
                >
                  {isDeleting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full py-4 text-stone-400 font-bold hover:text-stone-600 transition-colors"
                >
                  Cancelar e Voltar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
