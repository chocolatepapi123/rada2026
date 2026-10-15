window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="color:#f87171; background:#0f172a; padding:24px; font-family:monospace; word-break:break-all; min-height:100vh;">
    <h3 style="font-size:18px; font-weight:bold; margin-bottom:12px; color:#ef4444;">🚨 Runtime Error Caught</h3>
    <p style="margin-bottom:8px;"><b>Error:</b> ${e.message}</p>
    <p style="margin-bottom:8px;"><b>File:</b> ${e.filename}</p>
    <p style="margin-bottom:8px;"><b>Line:</b> ${e.lineno}:${e.colno}</p>
  </div>`;
});

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
// Add to the bottom of src/main.tsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('RADA Offline SW registered: ', reg),
      (err) => console.error('SW registration failed: ', err)
    );
  });
}
