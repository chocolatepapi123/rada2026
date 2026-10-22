import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (e) => {
  // Ignore resource load errors (e.g. images, stylesheets) or ResizeObserver
  if (!e.message || e.message.includes('ResizeObserver') || e.message.includes('Script error')) {
    return;
  }
  console.error('[RADA Runtime Error]', e.error || e.message);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Offline shell + faster repeat launches (production only, so dev/HMR is never cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[RADA] Service worker failed:', err));
  });
}
