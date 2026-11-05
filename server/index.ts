import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { log } from './lib/logger.js'
import { openApiSpec } from './lib/openapi.js'
import authRoutes from './routes/auth.js'
import publicRoutes from './routes/public.js'
import studentRoutes from './routes/student.js'
import facultyRoutes from './routes/faculty.js'
import adminRoutes from './routes/admin.js'
import assistantRoutes from './routes/assistant.js'

const app = express()
const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT) || 3001

// 1. CORS Configuration
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://campus-pulse-two-gilt.vercel.app',
  'https://campus-pulse-vignan.vercel.app',
  'https://localhost', // Capacitor Android WebView origin
  'capacitor://localhost',
  'http://localhost',
]

const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]))

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
)

// 2. Helmet Security Headers with Swagger UI compatibility
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https://validator.swagger.io', 'https://unpkg.com'],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// 3. API Documentation Endpoints
app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec)
})

app.get('/api/docs', (_req, res) => {
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CampusPulse API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; font-family: sans-serif; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`
  res.send(swaggerHtml)
})

// 4. Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    time: new Date().toISOString(),
  })
})

// 5. Application Feature Routes
app.use('/api/auth', authRoutes)
app.use('/api', publicRoutes)
app.use('/api/me', studentRoutes)
app.use('/api/faculty/me', facultyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/assistant', assistantRoutes)

// 6. 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint was not found.',
    },
  })
})

// 7. Central Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log('error', err.message, { stack: err.stack })
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred.',
    },
  })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    log('info', `CampusPulse backend online on port ${PORT}`, {
      docs: `http://localhost:${PORT}/api/docs`,
      openapi: `http://localhost:${PORT}/api/openapi.json`,
      health: `http://localhost:${PORT}/api/health`,
    })
  })
}

export default app
