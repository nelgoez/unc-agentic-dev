import type { MoodleApiClient } from '../api/MoodleApiClient'
import crypto from 'node:crypto'

export class MoodleStudentFactory {
  constructor(private api: MoodleApiClient) {}

  async createAndEnrolStudent(
    courseId: number,
    roleId: number = 5,
  ): Promise<{ userId: number; username: string; password: string } | null> {
    try {
      const uniqueId = crypto.randomUUID().slice(0, 8)
      const username = `audit_student_${uniqueId}`
      const password = `Temp_${uniqueId}_pass!`
      const email = `audit.${uniqueId}@example.com`

      const user = await this.api.createUser(username, password, 'Audit', 'Student', email)
      const userId = user.id

      const methods = await this.api.getCourseEnrolMethods(courseId)
      const method =
        methods.find((m) => m.type === 'manual') ??
        methods.find((m) => m.type === 'self') ??
        methods[0]
      if (!method) {
        throw new Error(`No enrolment method found for course ${courseId}`)
      }

      const params = new URLSearchParams({
        enrolid: String(method.id),
        userid: String(userId),
        roleid: String(roleId),
      })

      await this.api.submitUserEnrolmentForm(params.toString())

      return { userId, username, password }
    } catch (err) {
      console.warn('⚠️ createAndEnrolStudent failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  async cleanupStudent(userId: number): Promise<void> {
    try {
      await this.api.deleteUsers([userId])
    } catch (err) {
      console.warn('⚠️ cleanupStudent failed:', err instanceof Error ? err.message : err)
    }
  }
}
