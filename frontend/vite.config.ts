import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Vite blocks requests with an unrecognized Host header by default;
    // allow the VS Code Dev Tunnels domain so the forwarded 5173 port works.
    allowedHosts: ['.devtunnels.ms'],
  },
})
