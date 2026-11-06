import 'dotenv/config'
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import { prisma } from '../lib/prisma.js'

describe('CampusPulse Backend API Integration Tests', () => {
  let csrfToken: string
  let adminBearerToken: string
  let adminCookie: string
  let studentBearerToken: string
  let studentCookie: string

  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@vignan.ac.in'
  const studentEmail = process.env.STUDENT_SEED_EMAIL || 'student@vignan.ac.in'
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || ''
  const studentPassword = process.env.STUDENT_SEED_PASSWORD || ''

  beforeAll(async () => {
    // Ensure database connection is ready
    const blockCount = await prisma.block.count()
    expect(blockCount).toBeGreaterThanOrEqual(1)
  })

  describe('1. Public Endpoints (No Auth Required)', () => {
    it('GET /api/health should return ok', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.version).toBe('1.0.0')
    })

    it('GET /api/openapi.json should return valid OpenAPI 3.1 schema', async () => {
      const res = await request(app).get('/api/openapi.json')
      expect(res.status).toBe(200)
      expect(res.body.openapi).toBe('3.1.0')
      expect(res.body.info.title).toBe('CampusPulse API')
    })

    it('GET /api/docs should serve Swagger UI HTML', async () => {
      const res = await request(app).get('/api/docs')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('text/html')
      expect(res.text).toContain('CampusPulse API Documentation')
    })

    it('GET /api/campus/blocks should return academic blocks', async () => {
      const res = await request(app).get('/api/campus/blocks')
      expect(res.status).toBe(200)
      expect(res.body.blocks).toBeDefined()
      expect(Array.isArray(res.body.blocks)).toBe(true)
    })

    it('GET /api/availability/now should return live room statuses', async () => {
      const res = await request(app).get('/api/availability/now')
      expect(res.status).toBe(200)
      expect(res.body.rooms).toBeDefined()
      expect(Array.isArray(res.body.rooms)).toBe(true)
      if (res.body.rooms.length > 0) {
        expect(['FREE', 'OCCUPIED', 'LATER', 'UNAVAILABLE']).toContain(res.body.rooms[0].status)
      }
    })
  })

  describe('2. Authentication & Dual-Client Session Management', () => {
    it('GET /api/auth/csrf should return CSRF token', async () => {
      const res = await request(app).get('/api/auth/csrf')
      expect(res.status).toBe(200)
      expect(res.body.csrfToken).toBeDefined()
      csrfToken = res.body.csrfToken
    })

    it('POST /api/auth/login with invalid email or password returns generic 401', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@vignan.ac.in', password: 'wrongpassword123' })

      expect(res1.status).toBe(401)
      expect(res1.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.'
      })

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'wrongpassword123' })

      expect(res2.status).toBe(401)
      expect(res2.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.'
      })
    })

    it('POST /api/auth/login with valid admin credentials returns both cookie and bearer token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: adminPassword })

      expect(res.status).toBe(200)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.role).toBe('admin')
      expect(res.body.token).toBeDefined()
      expect(res.body.expiresAt).toBeDefined()

      adminBearerToken = res.body.token

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      const sessionCookie = cookies.find((c: string) => c.startsWith('cp_session='))
      expect(sessionCookie).toBeDefined()
      adminCookie = sessionCookie.split(';')[0]
    })

    it('POST /api/auth/login with valid student credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: studentEmail, password: studentPassword })

      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('student')
      studentBearerToken = res.body.token

      const cookies = res.headers['set-cookie']
      const sessionCookie = cookies.find((c: string) => c.startsWith('cp_session='))
      studentCookie = sessionCookie.split(';')[0]
    })

    it('GET /api/auth/me should succeed with Cookie session', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [adminCookie])

      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe(adminEmail)
    })

    it('GET /api/auth/me should succeed with Bearer token (Mobile APK mode)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminBearerToken}`)

      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe(adminEmail)
    })

    it('GET /api/auth/me without auth should return 401', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('3. CSRF Protection for Cookie Requests vs Bearer Bypassing', () => {
    it('State-changing request with Cookie BUT without CSRF token returns 403', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [adminCookie])

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('INVALID_CSRF_TOKEN')
    })

    it('State-changing request with Bearer token does NOT require CSRF token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminBearerToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('4. Role-Based Access Control (RBAC)', () => {
    it('Student user cannot access /api/admin/disruptions (returns 403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/admin/disruptions')
        .set('Authorization', `Bearer ${studentBearerToken}`)

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('Admin user can access /api/admin/disruptions', async () => {
      // Re-login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: adminPassword })

      const newAdminToken = loginRes.body.token

      const res = await request(app)
        .get('/api/admin/disruptions')
        .set('Authorization', `Bearer ${newAdminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.disruptions).toBeDefined()
      expect(Array.isArray(res.body.disruptions)).toBe(true)
    })
  })

  describe('5. Assistant Query Endpoint', () => {
    it('POST /api/assistant/query returns structured response with citations', async () => {
      const res = await request(app)
        .post('/api/assistant/query')
        .send({ question: 'Where is section II AIML-J on Monday?' })

      expect(res.status).toBe(200)
      expect(['answered', 'needs_detail', 'no_data']).toContain(res.body.status)
      expect(res.body.answer).toBeDefined()
      expect(Array.isArray(res.body.citations)).toBe(true)
    })

    it('POST /api/assistant/query for unknown department correctly states data boundary', async () => {
      const res = await request(app)
        .post('/api/assistant/query')
        .send({ question: 'Where is Mechanical 4B on Tuesday?' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('no_data')
      expect(res.body.answer).toContain('not covered in the loaded department timetables')
    })
  })
})
