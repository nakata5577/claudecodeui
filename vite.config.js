import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Determine if HTTPS should be used
  const useHttps = env.USE_HTTPS === 'true'
  const protocol = useHttps ? 'https' : 'http'
  const wsProtocol = useHttps ? 'wss' : 'ws'

  // HTTPS configuration for Vite dev server
  let httpsConfig = {}
  if (useHttps) {
    const certPath = path.join(process.cwd(), 'server/certificates/localhost.crt')
    const keyPath = path.join(process.cwd(), 'server/certificates/localhost.key')

    // Check if certificates exist, if not use Vite's auto-generated certs
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      httpsConfig = {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        }
      }
      console.log('📜 Vite using existing SSL certificates')
    } else {
      httpsConfig = {
        https: true  // Let Vite generate its own certificates
      }
      console.log('🔧 Vite generating own SSL certificates')
    }
  }

  // Parse allowed hosts from environment variable
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(host => host.trim()).filter(Boolean)
    : []

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      ...(allowedHosts.length > 0 && { host: true, allowedHosts }),
      ...httpsConfig,
      proxy: {
        '/api': {
          target: `${protocol}://localhost:${env.PORT || 3001}`,
          changeOrigin: true,
          secure: false,  // Allow self-signed certificates
          rewrite: (path) => path
        },
        '/ws': {
          target: `${wsProtocol}://localhost:${env.PORT || 3001}`,
          ws: true,
          changeOrigin: true,
          secure: false  // Allow self-signed certificates
        },
        '/shell': {
          target: `${wsProtocol}://localhost:${env.PORT || 3002}`,
          ws: true,
          changeOrigin: true,
          secure: false  // Allow self-signed certificates
        }
      }
    },
    build: {
      outDir: 'dist'
    }
  }
})