import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Global resilience listener to prevent uncaught network drops/Failed to fetch from crashing the application
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
    console.warn('[Global Resilience Guard] Handled network/fetch error gracefully:', msg);
    event.preventDefault();
  }
});

// Auto-register service worker for PWA installation and offline caching
try {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info('[MEVAM PWA] Nova versão do aplicativo disponível.');
    },
    onOfflineReady() {
      console.info('[MEVAM PWA] Aplicativo pronto para uso offline.');
    },
  });
} catch (swErr) {
  console.warn('[MEVAM PWA] Service Worker registration skipped or failed:', swErr);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

