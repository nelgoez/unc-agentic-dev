import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  stylistic: {
    indent: 4,
    quotes: 'single',
    semi: true,
  },
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  ignores: ['node_modules', 'dist', '.opencode/node_modules'],
})
