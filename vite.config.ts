import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // The public address of the site, used for share previews (og:image, canonical). Set VITE_PUBLIC_URL when you get a custom domain.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const publicUrl = String(process.env.VITE_PUBLIC_URL || env.VITE_PUBLIC_URL || 'https://rada2026-omega.vercel.app').replace(/\/+$/, '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      { name: 'rada-public-url', transformIndexHtml: (html: string) => html.replace(/__PUBLIC_URL__/g, publicUrl) },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Stable vendor chunks cache well and keep the first screen's JavaScript small.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('/motion') || id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('react')) return 'vendor-react';
            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});
