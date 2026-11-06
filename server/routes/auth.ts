import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { createSession, deleteSession } from '../lib/session.js'
import { generateCsrfToken } from '../lib/csrf.js'
import { loginRateLimit, resetLoginAttempts, RateLimitedResponse } from '../middleware/rateLimit.js'
import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { log } from '../lib/logger.js'

const router = Router()

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
})

const INVALID_CREDENTIALS_RESPONSE = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect.',
  },
}

/**
 * Shapes a user row into the session object the SPA expects. The frontend keys
 * its dashboards off `identifier`, `sectionId` and `facultyId`, which are not
 * columns on User, so they are resolved from the linked Faculty/Group here.
 */
async function buildSessionUser(user: {
  id: string
  email: string
  name: string
  role: string
  group: string | null
  facultyId: string | null
}) {
  const [faculty, group] = await Promise.all([
    user.facultyId
      ? prisma.faculty.findUnique({ where: { id: user.facultyId }, select: { code: true, departmentId: true } })
      : Promise.resolve(null),
    user.group
      ? prisma.group.findUnique({ where: { name: user.group }, select: { departmentId: true } })
      : Promise.resolve(null),
  ])

  const departmentId = faculty?.departmentId ?? group?.departmentId ?? null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    group: user.group,
    facultyId: user.facultyId,
    // Registration number / faculty code, shown in the UI chrome.
    identifier: faculty?.code ?? user.group ?? user.email,
    sectionId: user.group ?? null,
    departmentId,
  }
}

// GET /api/auth/csrf - provides a CSRF token for web clients
router.get('/csrf', (_req: Request, res: Response) => {
  const csrfToken = generateCsrfToken()
  res.json({ csrfToken })
})

// POST /api/auth/login - dual client login: sets cp_session cookie & returns bearer token in JSON
router.post('/login', loginRateLimit, async (req: Request, res: RateLimitedResponse) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.errors[0]?.message || 'Invalid login request.',
      },
    })
    return
  }

  const { email, password } = result.data
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user) {
    // Timing attack mitigation: dummy comparison
    await bcrypt.compare(password, '$2b$10$DUMMYHASHFORCONSTTIMEPASSWORDCHECKSxxxxxxxxx')
    if (res.incrementLoginFailure) await res.incrementLoginFailure()
    await prisma.failedLogin.create({
      data: {
        email: normalizedEmail,
        ip: req.ip || null,
      },
    }).catch(() => {})
    res.status(401).json(INVALID_CREDENTIALS_RESPONSE)
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    if (res.incrementLoginFailure) await res.incrementLoginFailure()
    await prisma.failedLogin.create({
      data: {
        email: normalizedEmail,
        userId: user.id,
        ip: req.ip || null,
      },
    }).catch(() => {})
    log('warn', 'Failed login attempt', { email: normalizedEmail })
    res.status(401).json(INVALID_CREDENTIALS_RESPONSE)
    return
  }

  resetLoginAttempts(normalizedEmail)
  const { token, expiresAt } = await createSession(user.id)

  const isProduction = process.env.NODE_ENV === 'production'
  const sameSiteSetting = (process.env.COOKIE_SAMESITE?.toLowerCase() === 'none' ? 'none' : 'lax') as 'lax' | 'none'

  // Set HttpOnly session cookie cp_session for web browser
  res.cookie('cp_session', token, {
    httpOnly: true,
    sameSite: sameSiteSetting,
    secure: isProduction || sameSiteSetting === 'none',
    path: '/',
    expires: expiresAt,
  })

  log('info', 'User authenticated successfully', { userId: user.id, role: user.role })

  // Return user info and bearer token for Android APK / API consumers
  res.json({
    user: await buildSessionUser(user),
    token,
    expiresAt: expiresAt.toISOString(),
  })
})

// POST /api/auth/logout - deletes session and clears cookie
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7).trim()
    : req.cookies?.cp_session

  if (token) {
    await deleteSession(token)
  }

  res.clearCookie('cp_session', { path: '/' })
  res.json({ success: true, message: 'Logged out successfully.' })
})

// GET /api/auth/me - inspect current authenticated session
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!
  res.json({ user: await buildSessionUser(user) })
})

export default router
