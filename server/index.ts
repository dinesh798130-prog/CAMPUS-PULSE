import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { log } from './lib/logger.js'
import authRoutes from './routes/auth.js'
import publicRoutes from './routes/public.js'
import studentRoutes from './routes/student.js'
import facultyRoutes from './routes/faculty.js'
import adminRoutes from './routes/admin.js'
import assistantRoutes from './routes/assistant.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet({
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

// Public & Feature Routes
app.use('/api/auth', authRoutes)
app.use('/api', publicRoutes)
app.use('/api/me', studentRoutes)
app.use('/api/faculty/me', facultyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/assistant', assistantRoutes)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'campuspulse-backend',
    version: '1.0.0',
    time: new Date().toISOString()
  })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log('error', err.message, { stack: err.stack })
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    log('info', `CampusPulse backend listening on port ${PORT}`)
  })
}

export default app
