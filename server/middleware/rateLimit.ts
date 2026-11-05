import { Request, Response, NextFunction } from 'express'

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

export function loginRateLimit(req: Request, res: RateLimitedResponse, next: NextFunction) {
  const email = (req.body?.email as string | undefined)?.toLowerCase().trim() || 'unknown'
  const key = `login:${email}`
  const now = Date.now()
  const attempt = store.get(key)

  if (attempt && attempt.resetAt > now && attempt.count >= MAX_FAILURES) {
    res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' })
    return
  }

  if (!attempt || attempt.resetAt <= now) {
    store.set(key, { count: 0, resetAt: now + WINDOW_MS })
  }

  res.incrementLoginFailure = () => {
    const a = store.get(key)
    if (a) {
      a.count++
    }
  }

  next()
}

export function resetLoginAttempts(email: string) {
  store.delete(`login:${email.toLowerCase().trim()}`)
}
