import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/image', import.meta.url)),
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toMatch(/<img .+[^>]>/)
  })

  it('index page has link tag with imagesrcset attr.', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    /**
     * Link to image with `<href>`, `imagesrcset`, `fetchpriority`
     */
    expect(html).toMatch(/<link rel="preload" as="image" href=".+[^">]" imagesrcset=".+[^">]" fetchpriority="high">/)
  })

  it('returns page with link header', async () => {
    // Get response to a server-rendered page with `$fetch`.
    await $fetch('/', {
      onResponse: (response) => {
        const link = response.response.headers.get('link')
        /**
         * Link to image with `<href>`, `imagesrcset`, `fetchpriority`
         */
        expect(link).toMatch(/^<.+[^>]>; rel="preload"; as="image"; imagesrcset=".+[^"]"; fetchpriority="high", <\/_nuxt\//)
      },
    })
  })
})
