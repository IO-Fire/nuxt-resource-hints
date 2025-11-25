import type { OutgoingHttpHeaders } from 'node:http'
import type { NitroApp } from 'nitropack/types'
import {
  getResponseHeaders,
  setResponseHeaders,
  appendResponseHeader,
} from 'h3'
import {
  defineNitroPlugin,
  useStorage,
} from 'nitropack/runtime'

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // Add the link header
    const link = generateLinkHeader(html.head, {
      resources: {
        stylesheet: true,
        preload: true,
        module_preload: true,
        prefetch: false,
        images: false,
        fonts: false,
        scripts: true,
        dns_prefetch: true,
        preconnect: true,
      },
      headerLength: 1990,
    })

    if (link !== '') {
      appendResponseHeader(event, 'link', link)
    }
  })

  // Save preRendered headers when in SSG mode
  // Code source: https://github.com/nuxt-modules/security/blob/f824882c30875f65eba270df7c7b1f53fa4c6ad5/src/runtime/nitro/plugins/90-prerenderedHeaders.ts#L9-L24
  if (import.meta.prerender) {
    const preRenderedHeaders: Record<string, OutgoingHttpHeaders> = {}
    nitroApp.hooks.hook('render:html', (_html, { event }) => {
      // We save the headers for the current path
      const headers = getResponseHeaders(event)

      const path = event.path.split('?')[0]
      preRenderedHeaders[path] = headers
    })

    // Adapted from code source: https://github.com/nuxt-modules/security/blob/f824882c30875f65eba270df7c7b1f53fa4c6ad5/src/runtime/nitro/plugins/90-prerenderedHeaders.ts#L26-L46
    nitroApp.hooks.hook('close', async () => {
      // We need to convert header values that are provided in array format
      // Keep only the link header
      const headers = Object.fromEntries(
        Object.entries(preRenderedHeaders).map(([path, headers]) => {
          const headersEntries = Object.entries(headers)
            .filter(([header]) => header === 'link')
            .map(([header, value]) => {
              if (Array.isArray(value)) {
                return [header, value.join(';')]
              }
              else {
                return [header, value]
              }
            })
          return [path, Object.fromEntries(headersEntries)]
        }),
      )
      await useStorage('build:nuxt-resource-hints').setItem(
        'headers.json',
        headers,
      )
    })
  }

  // Code source: https://github.com/nuxt-modules/security/blob/f824882c30875f65eba270df7c7b1f53fa4c6ad5/src/runtime/nitro/plugins/90-prerenderedHeaders.ts#L48-L61
  // Retrieve pre-rendered headers when in SSR mode
  else {
    const preRenderedHeaders
      = (await useStorage('assets:nuxt-resource-hints').getItem<
        Record<string, Record<string, string>>
      >('headers.json')) || {}
    nitroApp.hooks.hook('beforeResponse', (event) => {
      const path = event.path.split('?')[0]
      // We retrieve the headers for the current path
      if (preRenderedHeaders[path]) {
        setResponseHeaders(event, preRenderedHeaders[path])
      }
    })
  }
})

/**
 * Generates Link HTTP header value from HTML head `string[]`
 * @param head 'render:html' hook `html.head`
 * @param options
 * @returns `</...>; rel="..."; as="..."; crossorigin; fetchpriority="...", ...`
 */
function generateLinkHeader(head: string[], options): string {
  const linkRegex = /<link\s([^>]+)>/g

  /**
   * Regex pattern components:
   * - rel, href, as, fetchpriority: standard attributes requiring non-empty values
   * - crossorigin: captures both presence and optional value (empty string allowed)
   * Case-insensitive to handle attribute name variations
   */
  const attrRegex = /\brel="(?<rel>[^"]+)"|\bhref="(?<href>[^"]+)"|\bas="(?<as>[^"]+)"|\b(?<crossoriginKey>crossorigin)(?:="(?<crossoriginValue>[^"]*)")?|\bfetchpriority="(?<fetchpriority>[^"]+)"/gi

  let linkHeader = ''

  for (const headChildElem of head) {
    let match
    while ((match = linkRegex.exec(headChildElem)) !== null) {
      const attributes = match[1]
      const result: Record<string, string | undefined> = {}

      // Single pass to extract all attributes
      for (const m of attributes.matchAll(attrRegex)) {
        for (const [key, value] of Object.entries(m.groups || {})) {
          // Only merge values that exist to prevent overwriting with undefined
          if (value) result[key] = value
        }
      }

      if (result.rel && result.href) {
        // Derive includePreload for granular per-type toggles
        let includePreload = false
        if (result.rel === 'preload') {
          if (result.as === 'script' && options.resources.scripts) {
            includePreload = true
          } else if (result.as === 'font' && options.resources.fonts) {
            includePreload = true
          } else if (result.as === 'image' && options.resources.images) {
            includePreload = true
          } else if (result.as === 'style' && options.resources.stylesheet) {
            includePreload = true
          }
        }

        const includeResource
          = (options.resources.stylesheet && result.rel === 'stylesheet')
            || includePreload
            || (options.resources.module_preload && result.rel === 'modulepreload')
            || (options.resources.prefetch && result.rel === 'prefetch')
            || (options.resources.dns_prefetch && result.rel === 'dns-prefetch')
            || (options.resources.preconnect && result.rel === 'preconnect')

        if (includeResource) {
          // Determine if blocking is needed
          let blocking = false

          // TODO ignore stylesheets with media queries or maybe allow 'all' or scope nuxt dir styles to be included or offer an exclude option for the media styles

          // infer style and prioritise styles
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
          // 'stylesheet' is ignored by browser use `as="style" rel="preload" blocking` with `Initiator` in Network as `Other` rather than `Parser`
          // Currently `as="style" rel="preload"` causes browser console warning as styles don't count as used
          if (result.rel === 'stylesheet') {
            result.as = 'style'
            result.rel = 'preload'
            blocking = true
          }

          const link = `<${result.href}>; rel="${result.rel}"${
            result.as ? `; as="${result.as}"` : ''}${
            result.crossoriginKey
              // Handle crossorigin attribute presence and value
              // If value is empty or 'anonymous', use shorthand `crossorigin`
              ? `; crossorigin${(
                (!result.crossoriginValue || result.crossoriginValue === 'anonymous')
                  ? ''
                  : `="${result.crossoriginValue}"`)}`
              : ''}${
            result.fetchpriority ? `; fetchpriority="${result.fetchpriority}"` : ''}${
            blocking ? '; blocking' : ''}`

          // Build Link string
          if (linkHeader.length + link.length + 2 >= options.headerLength) {
            // TODO: Consider adding multiple link headers for more length
            return linkHeader
          }
          linkHeader += linkHeader ? `, ${link}` : link
        }
      }
    }
  }

  return linkHeader
}
