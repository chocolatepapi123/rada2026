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
