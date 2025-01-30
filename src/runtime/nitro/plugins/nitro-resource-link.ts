import type { OutgoingHttpHeaders } from 'node:http'
import type { NitroApp } from 'nitropack/types'
import { appendResponseHeader } from 'h3'
import {
  defineNitroPlugin,
  getResponseHeaders,
  setResponseHeaders,
  useStorage,
} from '#imports'

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // Add the link header
    const link = generateLinkHeader(html.head, {
      resources: {
        stylesheet: true,
        // preload: false,
        // module_preload: false,
        // prefetch: false,
        // images: false,
        // fonts: false,
        // scripts: false,
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
function generateLinkHeader(head: string[], options): string | '' {
  const link_regex = /<link\s([^>]+)>/g
  let linkHeader = ''

  for (let i = 0; i < head.length; i++) {
    let match

    while ((match = link_regex.exec(head[i])) !== null) {
      const attributes = match[1]
      const relMatch = attributes.match(/rel="([^"]+)"/)
      const hrefMatch = attributes.match(/href="([^"]+)"/)
      const asMatch = attributes.match(/as="([^"]+)"/)
      const crossoriginMatch = attributes.match(/crossorigin(?:="([^"]*)")?/)
      const fetchpriorityMatch = attributes.match(/fetchpriority="([^"]+)"/i) // Case insensitive
      let fetchpriority = fetchpriorityMatch ? fetchpriorityMatch[1] : null

      if (relMatch && hrefMatch) {
        let rel = relMatch[1]
        let as = asMatch ? asMatch[1] : null
        // Only `stylesheet`, `dns_prefetch` and `preconnect` are enabled.
        // Browser will prioritise other resources higher than CSS (which is render blocking) until the `blocking` param is standard in browsers https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link#browser_compatibility
        const includeResource
          = (options.resources.stylesheet && rel === 'stylesheet')
          // (options.resources.preload && rel === "preload") ||
          // (options.resources.module_preload && rel === "modulepreload") ||
          // (options.resources.prefetch && rel === "prefetch") ||
          // (options.resources.images && as === "image") ||
          // (options.resources.fonts && as === "font") ||
          // (options.resources.scripts && as === "script") ||
            || (options.resources.dns_prefetch && rel === 'dns-prefetch')
            || (options.resources.preconnect && rel === 'preconnect')

        if (includeResource) {
          // TODO ignore stylesheets with media queries or maybe allow 'all' or scope nuxt dir styles to be included or offer an exclude option for the media styles

          // infer style and prioritise styles
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
          // 'stylesheet' is ignored by browser use `as="style" rel="prefetch"` instead for "Fulfilled by" credit in Network
          // Currently `as="style" rel="preload"` causes browser console warning as styles don't count as used
          if (rel === 'stylesheet') {
            as = 'style'
            rel = 'prefetch'
            fetchpriority = 'high'
          }

          const link = `<${hrefMatch[1]}>; rel="${rel}"${as ? `; as="${as}"` : ''}${crossoriginMatch ? '; crossorigin' : ''}${fetchpriority ? `; fetchpriority="${fetchpriority}"` : ''}`

          // Build Link string
          if (linkHeader.length + link.length + 2 >= options.headerLength) {
            return linkHeader
          }
          if (linkHeader !== '') {
            linkHeader += ', ' + link
          }
          else {
            linkHeader += link
          }
        }
      }
    }
  }

  return linkHeader
}
