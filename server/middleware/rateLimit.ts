import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'

interface Attempt {
  count: number
  resetAt: number
}

const store = new Map<string, Attempt>()
const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export interface RateLimitedResponse extends Response {
  incrementLoginFailure?: () => void
}

export async function loginRateLimit(req: Request, res: RateLimitedResponse, next: NextFunction) {
  const email = (req.body?.email as string | undefined)?.toLowerCase().trim() || 'unknown'
  const key = `login:${email}`
  const now = Date.now()

  // 1. Check DB for account lock if user exists
  if (email !== 'unknown') {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true }
    }).catch(() => null)

    if (user?.lockedUntil && user.lockedUntil.getTime() > now) {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.'
        }
      })
      return
    }
  }

  // 2. Check in-memory rate limiter
  const attempt = store.get(key)
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_FAILURES) {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed login attempts. Try again in 15 minutes.'
      }
    })
    return
  }

  if (!attempt || attempt.resetAt <= now) {
    store.set(key, { count: 0, resetAt: now + WINDOW_MS })
  }

  res.incrementLoginFailure = async () => {
    const a = store.get(key)
    if (a) {
      a.count++
      if (a.count >= MAX_FAILURES) {
        // Lock user in DB for 15 minutes
        const lockTime = new Date(Date.now() + WINDOW_MS)
        await prisma.user.updateMany({
          where: { email },
          data: { lockedUntil: lockTime }
        }).catch(() => {})
      }
    }
  }

  next()
}

export function resetLoginAttempts(email: string) {
  const normalized = email.toLowerCase().trim()
  store.delete(`login:${normalized}`)
}
