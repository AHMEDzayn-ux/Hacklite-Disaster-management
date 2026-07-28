import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Core no-unused-vars misses JSX member expressions whose root
      // identifier is lowercase (e.g. `<motion.div>` from framer-motion),
      // reporting the import as unused. This rule marks them as used.
      'react/jsx-uses-vars': 'error',

      // Warn, don't error. The remaining reports are all the standard
      // "load data on mount" pattern - an async loader whose first statement
      // is setLoading(true), called from an effect. That is the documented
      // React approach when not using a data-fetching library, and the rule's
      // preferred alternatives (Suspense, or React Query / SWR) are an
      // architectural change rather than a lint fix. Revisit if a
      // data-fetching library is adopted; until then these are known and
      // intentional, not accidental.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
