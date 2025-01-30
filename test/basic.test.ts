import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
  })

  it('returns page with link header', async () => {
    // Get response to a server-rendered page with `$fetch`.
    await $fetch('/', {
      onResponse: (response) => {
        const link = response.response.headers.get('link')
        expect(link).toContain('</_nuxt/entry.xWPGQPTh.css>; rel="prefetch"; as="style"; crossorigin; fetchpriority="high"')
      },
    })
  })
})
