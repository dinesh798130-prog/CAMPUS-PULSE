import crypto from 'crypto'
import { prisma } from './prisma.js'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const session = await prisma.session.create({
    data: { userId, token, expiresAt },
  })
  return { token: session.token, expiresAt }
}

export async function getSessionUser(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { token } }).catch(() => {})
    }
    return null
  }
  return session.user
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {})
}
