import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="color:#f87171; background:#0f172a; padding:24px; font-family:monospace; word-break:break-all; min-height:100vh;">
    <h3 style="font-size:18px; font-weight:bold; margin-bottom:12px; color:#ef4444;">🚨 Runtime Error Caught</h3>
    <p style="margin-bottom:8px;"><b>Error:</b> ${e.message}</p>
    <p style="margin-bottom:8px;"><b>File:</b> ${e.filename}</p>
    <p style="margin-bottom:8px;"><b>Line:</b> ${e.lineno}:${e.colno}</p>
  </div>`;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
