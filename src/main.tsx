import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Guard against transient background/wake-up network blips and ResizeObserver errors
window.addEventListener('error', (e) => {
  if (!e.message || e.message.includes('ResizeObserver') || e.message.includes('Script error')) {
    return;
  }
  console.warn('[RADA Runtime Error]', e.error || e.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason?.message || String(reason || '')).toLowerCase();
  // Mobile browsers discard network connections after 3+ minutes in background.
  // Suppress abort/fetch errors so they don't tear down the JS context on wake-up.
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('aborterror') ||
    msg.includes('load failed') ||
    msg.includes('dynamically imported module')
  ) {
    event.preventDefault();
    console.warn('[RADA Resumed from Background - Network Reconnected]:', msg);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Offline shell + faster repeat launches (production only, so dev/HMR is never cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[RADA] Service worker failed:', err));
  });
}

