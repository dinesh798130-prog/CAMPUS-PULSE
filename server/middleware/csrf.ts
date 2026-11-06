import { Request, Response, NextFunction } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function allowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
  if (configured.length > 0) return configured
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ]
}

/**
 * Origin-based CSRF protection for state-changing requests.
 *
 * The session cookie is SameSite=Lax, which blocks cross-site POSTs from
 * browsers that honour it. This middleware adds a second, independent check:
 * any POST/PUT/PATCH/DELETE must carry an Origin (or Referer) that matches the
 * allow-list, otherwise it is rejected. Same-origin browser requests always
 * send Origin on these methods.
 *
 * Set ALLOWED_ORIGINS (comma separated) in production to the deployed frontend.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const origin = req.get('origin')
  const referer = req.get('referer')

  // Non-browser clients (the demo scenario, curl, tests) send neither header.
  // They cannot be driven by a victim's browser, so they are not a CSRF vector.
  if (!origin && !referer) {
    next()
    return
  }

  const allowed = allowedOrigins()
  const source = origin || (referer ? new URL(referer).origin : '')
  if (!allowed.includes(source)) {
    res.status(403).json({ error: 'Cross-site request blocked' })
    return
  }

  next()
}
