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
        expect(link).equal('</_nuxt/entry.xWPGQPTh.css>; rel="preload"; as="style"; crossorigin; blocking, </_nuxt/DbB7ZFe_.js>; rel="modulepreload"; as="script"; crossorigin, </_nuxt/CWYUvlE3.js>; rel="prefetch"; as="script"; crossorigin, </_nuxt/DxoSW7xX.js>; rel="prefetch"; as="script"; crossorigin, </_nuxt/meLkTXGg.js>; rel="prefetch"; as="script"; crossorigin, </_nuxt/builds/meta/test.json>; rel="preload"; as="fetch"; crossorigin; fetchpriority="low"')
      },
    })
  })
})
