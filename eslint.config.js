import antfu from '@antfu/eslint-config';

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
    rules: {
        'no-console': 'off',
        'ts/strict-boolean-expressions': 'off',
        'ts/no-unsafe-assignment': 'off',
        'ts/no-unsafe-member-access': 'off',
        'ts/no-unsafe-call': 'off',
        'ts/no-unsafe-argument': 'off',
        'ts/explicit-function-return-type': 'off',
        'regexp/no-super-linear-backtracking': 'off',
    },
});
