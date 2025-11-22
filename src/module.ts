import { defineNuxtModule, addServerPlugin, createResolver, useNitro } from '@nuxt/kit'
import { createDefu } from 'defu'

// Module options TypeScript interface definition
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleOptions {}

// Code source: https://github.com/nuxt-modules/security/blob/f824882c30875f65eba270df7c7b1f53fa4c6ad5/src/utils/merge.ts#L3-L8
const defuReplaceArray = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) || Array.isArray(value)) {
    obj[key] = value
    return true
  }
})

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'resource-hints',
    configKey: 'resourceHints',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addServerPlugin(resolve('./runtime/nitro/plugins/nitro-resource-link'))

    // Code source: https://github.com/nuxt-modules/security/blob/f824882c30875f65eba270df7c7b1f53fa4c6ad5/src/module.ts#L201-L228
    // Register init hook to add pre-rendered headers to responses
    _nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('prerender:done', async () => {
        // Add the pre-rendered headers to the Nitro server assets
        nitro.options.serverAssets.push({
          baseName: 'nuxt-resource-hints',
          dir: createResolver(_nuxt.options.buildDir).resolve(
            './nuxt-resource-hints',
          ),
        })

        // In some Nitro presets (e.g. Vercel), the header rules are generated for the static server
        // By default we update the nitro headers route rules with their calculated value to support this possibility
        const preRenderedHeaders
          = (await nitro.storage.getItem<Record<string, Record<string, string>>>(
            'build:nuxt-resource-hints:headers.json',
          )) || {}

        const preRenderedHeadersRouteRules = Object.fromEntries(
          Object.entries(preRenderedHeaders).map(([route, headers]) => [
            route,
            { headers },
          ]),
        )
        const n = useNitro()
        n.options.routeRules = defuReplaceArray(
          preRenderedHeadersRouteRules,
          n.options.routeRules,
        )
      })
    })
  },
})
