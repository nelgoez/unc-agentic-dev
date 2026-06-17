import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const AT_PATH_REGEX = /@(\.?[^\s]*\.(?:md|yaml|yml|json|ts|js|tsx|jsx))/gi

function resolveAtPath(
  atRef: string,
  projectRoot: string
): { found: boolean; path: string; content?: string } {
  const relativePath = atRef.startsWith("@") ? atRef.slice(1) : atRef
  const candidates = [
    resolve(projectRoot, relativePath),
    resolve(projectRoot, "..", relativePath), // cross-repo access
  ]

  for (const fullPath of candidates) {
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, "utf-8")
        return { found: true, path: relativePath, content }
      } catch {
        continue
      }
    }
  }

  return { found: false, path: relativePath }
}

export const atResolverPlugin: Plugin = async ({ client, directory }) => {
  return {
    event: async ({ event }) => {
      if (
        event.type !== "message.updated" &&
        event.type !== "tui.prompt.append"
      ) {
        return
      }

      const data = event.data as { content?: string; text?: string }
      const text = data?.content ?? data?.text
      if (!text) return

      const matches = text.matchAll(AT_PATH_REGEX)
      const resolved: Array<{ ref: string; content: string }> = []
      const notFound: string[] = []

      for (const match of matches) {
        const atRef = match[0]
        const result = resolveAtPath(atRef, directory)

        if (result.found && result.content) {
          resolved.push({
            ref: atRef,
            content: `--- BEGIN ${result.path} ---\n${result.content}\n--- END ${result.path} ---`,
          })
        } else {
          notFound.push(result.path)
        }
      }

      if (resolved.length > 0 || notFound.length > 0) {
        await client.app.log({
          body: {
            service: "at-resolver",
            level: "info",
            message: `Resolved ${resolved.length} @ref(s), ${notFound.length} not found`,
            extra: { resolved: resolved.map((r) => r.ref), notFound },
          },
        })
      }
    },
  }
}
