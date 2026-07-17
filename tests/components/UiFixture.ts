import type { Page } from '@playwright/test'
import { TestContext } from './TestContext'

export interface FixtureOptions {
  baseUrl?: string
}

export function createFixture(page: Page, opts?: FixtureOptions) {
  const ctx = new TestContext(opts)
  return { ctx, page }
}
