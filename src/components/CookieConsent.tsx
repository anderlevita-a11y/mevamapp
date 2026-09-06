import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie_consent');
    if (savedConsent === null) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setConsentGiven(savedConsent === 'true');
    }
  }, []);

  const handleAccept = async () => {
    localStorage.setItem('cookie_consent', 'true');
    setConsentGiven(true);
    setShowBanner(false);
    
    // Persist to DB if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({
        cookie_consent_accepted: true,
        cookie_consent_at: new Date().toISOString()
      }).eq('id', session.user.id);
      
      // Log for audit
      await supabase.from('privacy_consent_log').insert([{
        user_id: session.user.id,
        consent_type: 'cookies',
        action: 'accept',
        user_agent: navigator.userAgent
      }]);
    }

    window.dispatchEvent(new CustomEvent('analytics-allowed'));
    console.log('Analytics allowed by user.');
  };

  const handleDecline = async () => {
    localStorage.setItem('cookie_consent', 'false');
    setConsentGiven(false);
    setShowBanner(false);

    // Persist to DB if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({
        cookie_consent_accepted: false,
        cookie_consent_at: new Date().toISOString()
      }).eq('id', session.user.id);

      await supabase.from('privacy_consent_log').insert([{
        user_id: session.user.id,
        consent_type: 'cookies',
        action: 'decline',
        user_agent: navigator.userAgent
      }]);
    }

    console.log('Analytics declined by user.');
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6"
      >
        <div className="max-w-5xl mx-auto bg-stone-900 text-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-white/10 overflow-hidden backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-stretch md:items-center">
            {/* Left side info */}
            <div className="p-6 md:p-8 flex-1 flex items-start space-x-4">
              <div className="hidden sm:flex w-12 h-12 bg-primary/20 text-primary rounded-2xl items-center justify-center shrink-0">
                <Cookie size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight flex items-center">
                  <Cookie size={20} className="sm:hidden mr-2 text-primary" />
                  Sua Privacidade e Cookies
                </h3>
                <p className="text-stone-400 text-sm leading-relaxed max-w-2xl font-medium">
                  Utilizamos cookies para personalizar sua experiência, analisar o tráfego do site e garantir o funcionamento correto de sua área de membro. 
                  De acordo com a LGPD, os cookies analíticos só serão ativados se você permitir.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="flex items-center text-[10px] uppercase font-black text-stone-500 tracking-wider">
                    <CheckCircle2 size={12} className="mr-1 text-green-500" />
                    Essenciais (Ativos)
                  </div>
                  <div className="flex items-center text-[10px] uppercase font-black text-stone-500 tracking-wider">
                    <ShieldCheck size={12} className="mr-1 text-primary" />
                    Analíticos (Opcional)
                  </div>
                </div>
              </div>
            </div>

            {/* Right side actions */}
            <div className="bg-white/5 border-t md:border-t-0 md:border-l border-white/10 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={handleDecline}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl font-bold text-stone-400 hover:text-white hover:bg-white/5 transition-all text-sm"
              >
                Apenas Necessários
              </button>
              <button
                onClick={handleAccept}
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-primary/20 text-sm whitespace-nowrap"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
