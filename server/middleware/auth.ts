import { Request, Response, NextFunction } from 'express'
import { getSessionUser } from '../lib/session.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    name: string
    group: string | null
    facultyId: string | null
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  const user = await getSessionUser(token)
  if (!user) {
    res.clearCookie('session')
    res.status(401).json({ error: 'Session expired' })
    return
  }
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    group: user.group,
    facultyId: user.facultyId,
  }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
