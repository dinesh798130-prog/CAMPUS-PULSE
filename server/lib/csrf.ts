import crypto from 'crypto'

const CSRF_SECRET = process.env.SESSION_SECRET || 'campuspulse-csrf-secret-key-32-chars'

export function generateCsrfToken(): string {
  const random = crypto.randomBytes(24).toString('hex')
  const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(random).digest('hex')
  return `${random}.${hmac}`
}

export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [random, hmac] = parts
  const expectedHmac = crypto.createHmac('sha256', CSRF_SECRET).update(random).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))
}
