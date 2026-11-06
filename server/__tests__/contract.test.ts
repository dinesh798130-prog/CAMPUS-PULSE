import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import { prisma } from '../lib/prisma.js'

/**
 * Guards the SPA's API contract: the exact paths and response shapes the
 * frontend services call. These all 404'd or mismatched before the phase-2
 * follow-up fixes.
 */
describe('Frontend/backend API contract', () => {
  let adminToken = ''
  let facultyToken = ''
  let studentToken = ''
  let facultyId = ''
  const createdEntryIds: string[] = []

  const facultyEmail = process.env.FACULTY_SEED_EMAIL || 'faculty@vignan.ac.in'
  const facultyPassword = process.env.FACULTY_SEED_PASSWORD || ''
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@vignan.ac.in'
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || ''
  const studentEmail = process.env.STUDENT_SEED_EMAIL || 'student@vignan.ac.in'
  const studentPassword = process.env.STUDENT_SEED_PASSWORD || ''

  beforeAll(async () => {
    const [admin, faculty, student] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: adminEmail, password: adminPassword }),
      request(app).post('/api/auth/login').send({ email: facultyEmail, password: facultyPassword }),
      request(app).post('/api/auth/login').send({ email: studentEmail, password: studentPassword })
    ])
    adminToken = admin.body.token
    facultyToken = faculty.body.token
    studentToken = student.body.token
    facultyId = faculty.body.user.facultyId
  })

  afterAll(async () => {
    if (createdEntryIds.length) {
      await prisma.entry.deleteMany({ where: { id: { in: createdEntryIds } } })
    }
  })

  it('login returns the session shape the SPA reads', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: facultyEmail, password: facultyPassword })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      role: 'faculty',
      identifier: expect.any(String),
      facultyId: expect.any(String)
    })
  })

  it('GET /api/auth/me returns the same session shape', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${facultyToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.identifier).toBeDefined()
    expect(res.body.user.sectionId).toBeDefined()
    expect(res.body.user.departmentId).toBeDefined()
  })

  it('GET /api/faculty/me/timetable resolves instead of treating "me" as an id', async () => {
    const res = await request(app)
      .get('/api/faculty/me/timetable')
      .set('Authorization', `Bearer ${facultyToken}`)

    expect(res.status).toBe(200)
  })

  it('GET /api/changes returns an array in the TimetableChange shape', async () => {
    const res = await request(app)
      .get('/api/changes')
      .set('Authorization', `Bearer ${facultyToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /api/notifications returns an array in the UserNotification shape', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${facultyToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    if (res.body.length) {
      expect(res.body[0]).toMatchObject({
        id: expect.any(String),
        message: expect.any(String),
        isRead: expect.any(Boolean)
      })
    }
  })

  it('GET /api/timetables?facultyId=<facultyId> returns the faculty schedule', async () => {
    const res = await request(app).get(`/api/timetables?facultyId=${facultyId}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('admin can create, update and delete a timetable entry', async () => {
    const createRes = await request(app)
      .post('/api/timetables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sectionId: 'II AIML-J',
        subjectId: 'Contract Test Subject',
        day: 'Monday',
        startTime: '07:00',
        endTime: '07:50',
        roomId: 'N-215',
        isLab: false
      })

    expect(createRes.status).toBe(201)
    expect(createRes.body).toMatchObject({
      id: expect.any(String),
      subjectId: 'Contract Test Subject',
      day: 'Monday',
      isLab: false,
      status: 'published'
    })
    createdEntryIds.push(createRes.body.id)

    const updateRes = await request(app)
      .put(`/api/timetables/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startTime: '07:05' })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.startTime).toBe('07:05')

    const deleteRes = await request(app)
      .delete(`/api/timetables/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)
  })

  it('students cannot mutate the timetable', async () => {
    const res = await request(app)
      .post('/api/timetables')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ sectionId: 'II AIML-J', subjectId: 'x', day: 'Monday', startTime: '07:00', endTime: '07:50' })

    expect(res.status).toBe(403)
  })

  it('a timetable write with a malformed body is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/timetables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sectionId: 'II AIML-J' })

    expect(res.status).toBe(400)
  })

  it('admin CRUD ignores unknown fields instead of failing', async () => {
    const res = await request(app)
      .post('/api/admin/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'ZZ-CONTRACT', name: 'Contract Test Dept', bogusField: 1, groups: { create: {} } })

    expect(res.status).toBe(201)
    expect(res.body.department.code).toBe('ZZ-CONTRACT')

    await prisma.department.delete({ where: { id: res.body.department.id } })
  })

  it('assistant statuses stay within the spec enum', async () => {
    const res = await request(app)
      .post('/api/assistant/query')
      .send({ question: 'asdfghjkl nonsense' })

    expect(res.status).toBe(200)
    expect(['answered', 'no_data', 'clarify']).toContain(res.body.status)
  })
})
