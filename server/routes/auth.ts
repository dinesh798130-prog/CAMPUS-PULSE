import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { createSession, deleteSession } from '../lib/session.js'
import { loginRateLimit, resetLoginAttempts, RateLimitedResponse } from '../middleware/rateLimit.js'
import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { log } from '../lib/logger.js'

const router = Router()

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const GENERIC_ERROR = 'Invalid email or password'

router.post('/login', loginRateLimit, async (req: Request, res: RateLimitedResponse) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' })
    return
  }

  const { email, password } = result.data
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user) {
    // Timing attack mitigation: dummy compare
    await bcrypt.compare(password, '$2b$12$DUMMYHASHFORCONSTTIMEPASSWORDCHECKSxxxxxxxxx')
    if (res.incrementLoginFailure) res.incrementLoginFailure()
    await prisma.failedLogin.create({
      data: {
        email: normalizedEmail,
        ip: req.ip || null
      }
    }).catch(() => {})
    res.status(401).json({ error: GENERIC_ERROR })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    if (res.incrementLoginFailure) res.incrementLoginFailure()
    await prisma.failedLogin.create({
      data: {
        email: normalizedEmail,
        userId: user.id,
        ip: req.ip || null
      }
    }).catch(() => {})
    log('warn', 'Failed login attempt', { email: normalizedEmail })
    res.status(401).json({ error: GENERIC_ERROR })
    return
  }

  resetLoginAttempts(normalizedEmail)
  const { token, expiresAt } = await createSession(user.id)

  const isSecure = process.env.NODE_ENV === 'production'
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    expires: expiresAt,
  })

  log('info', 'User logged in', { userId: user.id, role: user.role })

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      group: user.group,
      facultyId: user.facultyId,
    }
  })
})

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.session
  if (token) {
    await deleteSession(token)
  }
  res.clearCookie('session')
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      group: user.group,
      facultyId: user.facultyId,
    }
  })
})

export default router
