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
