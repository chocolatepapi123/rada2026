import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
