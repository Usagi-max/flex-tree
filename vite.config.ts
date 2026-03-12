import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-csv-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/save-csv') {
            let body = ''
            req.on('data', chunk => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const { filename, content } = JSON.parse(body)
                const dataDir = path.resolve(__dirname, 'src/data')
                if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true })
                }
                const filePath = path.join(dataDir, filename)
                fs.writeFileSync(filePath, content)
                res.statusCode = 200
                res.end(JSON.stringify({ message: 'Success', path: filePath }))
              } catch (err: any) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          } else if (req.method === 'GET' && req.url === '/api/list-csv') {
            try {
              const dataDir = path.resolve(__dirname, 'src/data')
              if (!fs.existsSync(dataDir)) {
                res.statusCode = 200
                res.end(JSON.stringify([]))
                return
              }
              const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(files))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          } else {
            next()
          }
        })
      }
    }
  ],
})
