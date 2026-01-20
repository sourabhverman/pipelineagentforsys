import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Webhook API handler
async function webhookMiddleware(req: any, res: any, next: any) {
  if (req.url === '/api/webhook' || req.url.startsWith('/api/webhook?')) {
    const chunks: any[] = [];
    
    req.on('data', (chunk: any) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks).toString();
        const payload = JSON.parse(body);
        
        console.log('Webhook received:', payload);
        
        // For now, just acknowledge receipt
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Webhook received' }));
      } catch (error) {
        console.error('Webhook error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
  } else {
    next();
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    middlewareMode: false,
    middleware: [
      (req, res, next) => webhookMiddleware(req, res, next),
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
