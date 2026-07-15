import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.netlify/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/cms-admin/components.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // Nuxt and Vue expose typed auto-imports that are verified by vue-tsc.
      'no-undef': 'off',
      // File-based route names such as index.vue and error.vue are framework contracts.
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
)
