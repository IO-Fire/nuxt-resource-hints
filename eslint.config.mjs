// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
// @ts-check
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: true
  },
  dirs: {
    src: ['./playground']
  }
})
  .insertBefore('nuxt/vue/rules', eslintPluginPrettierRecommended)
  .append(
    // your custom flat config here...
    {
      rules: {
        '@stylistic/comma-dangle': 0,
        '@stylistic/operator-linebreak': 0,
        '@stylistic/brace-style': 0,
        '@stylistic/arrow-parens': 0,
        '@stylistic/indent-binary-ops': 0,
        '@stylistic/indent': 0
      }
    }
  )
