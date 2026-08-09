/** @type {import('prettier').Config} */
export default {
  // Line length
  printWidth: 100,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',

  // Semicolons
  semi: true,

  // Trailing commas
  trailingComma: 'all',

  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'always',

  // End of line
  endOfLine: 'lf',

  // Plugins
  plugins: ['prettier-plugin-organize-imports'],

  // Import order
  importOrder: [
    '^@cc-ops/(.*)$',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // File patterns
  overrides: [
    {
      files: '*.{json,jsonc,yml,yaml,md,mdx}',
      options: {
        tabWidth: 2,
        printWidth: 120,
      },
    },
    {
      files: '*.{html,css,scss}',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
  ],
};