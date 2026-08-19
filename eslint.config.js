import antfu from '@antfu/eslint-config';

export default antfu({
  type: 'lib',
  stylistic: {
    indent: 2,
    semi: true,
  },
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  ignores: [
    'node_modules',
    'dist',
    '.opencode',
    '.context',
    'docs',
    'reports',
    'allure-report',
    'allure-results',
    'playwright-report',
    'test-results',
  ],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    'ts/strict-boolean-expressions': 'off',
    'ts/no-unsafe-assignment': 'off',
    'ts/no-unsafe-member-access': 'off',
    'ts/no-unsafe-call': 'off',
    'ts/no-unsafe-argument': 'off',
    'ts/explicit-function-return-type': 'off',
    'ts/restrict-template-expressions': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'jsonc/comma-dangle': 'off',
    'style/max-statements-per-line': 'off',
  },
});
