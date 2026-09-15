import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Global resilience listener to prevent uncaught network drops/Failed to fetch and invalid refresh tokens from crashing the application
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (
    msg.includes('Failed to fetch') || 
    msg.includes('NetworkError') || 
    msg.includes('Load failed') ||
    msg.includes('Invalid Refresh Token') ||
    msg.includes('Refresh Token Not Found') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid_grant')
  ) {
    console.warn('[Global Resilience Guard] Handled error gracefully:', msg);
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || String(event?.error?.message || '');
  if (
    msg.includes('Invalid Refresh Token') ||
    msg.includes('Refresh Token Not Found') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid_grant')
  ) {
    console.warn('[Global Resilience Guard] Handled window error gracefully:', msg);
    event.preventDefault();
  }
});

// Auto-register service worker for PWA installation and Web Push notifications
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

// Register background Web Push Service Worker (/sw.js)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[MEVAM Push] Service Worker registrado:', reg.scope))
      .catch((err) => console.warn('[MEVAM Push] SW register warning:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

