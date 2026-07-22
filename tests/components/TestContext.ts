import { randomInt } from 'node:crypto'

export interface TestEnv {
  baseUrl: string
  studentUser: string
  studentPass: string
  adminUser: string
  adminPass: string
  wsToken: string
  isCI: boolean
}

export class TestContext {
  env: TestEnv

  constructor(overrides?: Partial<TestEnv>) {
    this.env = {
      baseUrl: process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar',
      studentUser: process.env.STUDENT_USERNAME ?? '',
      studentPass: (process.env.STUDENT_PASSWORD ?? '').trim(),
      adminUser: (process.env.ADMIN_USERNAME ?? '').trim(),
      adminPass: (process.env.ADMIN_PASSWORD ?? '').trim(),
      wsToken: (process.env.MOODLE_WS_TOKEN ?? '').trim(),
      isCI: Boolean(process.env.CI),
      ...overrides,
    }
  }

  get hasAdminCreds(): boolean {
    return this.env.adminUser !== '' && this.env.adminPass !== ''
  }

  get hasWsToken(): boolean {
    return this.env.wsToken !== ''
  }

  uniqueEmail(prefix = 'test'): string {
    return `${prefix}+${randomInt(1_000_000)}@test.unc.edu.ar`
  }
}
