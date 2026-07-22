## Task 2: MoodleStudentFactory — Fresh student creation

**New file:** `tests/components/shared/MoodleStudentFactory.ts`

```typescript
class MoodleStudentFactory {
  constructor(private api: MoodleApiClient) {}

  async createAndEnrolStudent(
    courseId: number,
    roleId: number = 5,
  ): Promise<{
    userId: number
    username: string
    password: string
  }>
  // 1. Generate unique username/password
  // 2. api.createUser(username, password, 'Audit', 'Student', email)
  // 3. api.getCourseEnrolMethods(courseId) → find manual method
  // 4. api.submitUserEnrolmentForm(formdata)
  // 5. Return credentials

  async cleanupStudent(userId: number): Promise<void>
  // api.deleteUsers([userId])
}
```

