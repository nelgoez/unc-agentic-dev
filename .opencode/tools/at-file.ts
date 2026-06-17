import { tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

export default tool({
  description:
    "Resolve @file references to load file contents into context. When you see @path/to/file.md, call this tool with that path. Returns the file contents as text.",
  args: {
    path: tool.schema
      .string()
      .describe(
        "The full @ reference including @ prefix, e.g. '@.context/reengagement/plan-implementacion.md'. Relative to the project root."
      ),
  },
  async execute({ path }, { directory }) {
    const relativePath = path.startsWith("@") ? path.slice(1) : path
    const fullPath = resolve(directory, relativePath)

    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8")
      return `--- BEGIN ${relativePath} ---\n${content}\n--- END ${relativePath} ---`
    }

    // Try parent directory (for cross-repo access to diploma-tracking-system)
    const parentPath = resolve(directory, "..", relativePath)
    if (existsSync(parentPath)) {
      const content = readFileSync(parentPath, "utf-8")
      return `--- BEGIN ${relativePath} (from parent) ---\n${content}\n--- END ${relativePath} ---`
    }

    return `File not found: ${relativePath}. Tried: ${fullPath}, ${parentPath}`
  },
})
