import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  server: {
    port: 5173,
    open: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  plugins: [
    {
      name: 'html-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Remove trailing slashes
          if (req.url !== '/' && req.url.endsWith('/')) {
            req.url = req.url.slice(0, -1);
          }

          // Map clean URLs to .html files
          const cleanUrlMap = {
            '/login': '/login.html',
            '/register': '/register.html',
            '/forgot-password': '/forgot-password.html',
            '/reset-password': '/reset-password.html',
            '/dashboard': '/dashboard.html',
            '/privacy-policy': '/privacy-policy.html',
            '/terms': '/terms.html',
            '/help': '/help.html'
          };

          if (cleanUrlMap[req.url]) {
            req.url = cleanUrlMap[req.url];
          }

          next();
        });
      }
    }
  ]
});
