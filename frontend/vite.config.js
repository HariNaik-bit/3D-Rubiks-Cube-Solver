import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'DEV_API_']);
  const base = env.VITE_API_BASE_URL?.trim();
  if (base || process.env.VERCEL === '1') {
    let origin;
    try {
      origin = new URL(base);
    } catch {
      throw new Error('Set VITE_API_BASE_URL to the backend origin, without an /api path.');
    }
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash ||
        (process.env.VERCEL === '1' && (origin.protocol !== 'https:' ||
          /^(localhost|127\.|\[::1\])/i.test(origin.hostname)))) {
      throw new Error('Set VITE_API_BASE_URL to an HTTP(S) origin, using public HTTPS on Vercel.');
    }
  }
  return {
    server: { proxy: { '/api': env.DEV_API_TARGET || 'http://localhost:8080' } },
    build: {
      rollupOptions: { output: { manualChunks: { three: ['three'] } } }
    }
  };
});
