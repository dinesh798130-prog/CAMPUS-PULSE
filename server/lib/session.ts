import crypto from 'crypto'
import { prisma } from './prisma.js'

const IDLE_EXPIRY_MS = 12 * 60 * 60 * 1000 // 12 hours idle
const ABSOLUTE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days absolute

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string) {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + IDLE_EXPIRY_MS)
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_EXPIRY_MS)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      lastActiveAt: now,
      expiresAt,
      absoluteExpiresAt,
    },
  })

  return { token, expiresAt, absoluteExpiresAt }
}

export async function getSessionUser(token: string) {
  const tokenHash = hashToken(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session) return null

  const now = new Date()

  // Check 1: Absolute expiry (7 days)
  if (now > session.absoluteExpiresAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Check 2: Idle expiry (12 hours)
  if (now > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Rolling idle extension: extend expiresAt by 12h, capped at absoluteExpiresAt
  const nextIdle = new Date(now.getTime() + IDLE_EXPIRY_MS)
  const updatedExpiresAt = nextIdle > session.absoluteExpiresAt ? session.absoluteExpiresAt : nextIdle

  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: now,
      expiresAt: updatedExpiresAt,
    },
  }).catch(() => {})

  return session.user
}

export async function deleteSession(token: string) {
  const tokenHash = hashToken(token)
  await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {})
}
