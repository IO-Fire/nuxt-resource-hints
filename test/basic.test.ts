import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url))
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
        expect(link).toContain(
          '</_nuxt/entry.xWPGQPTh.css>; rel="preload"; as="style"; crossorigin; blocking,'
        )
      }
    })
  })

  it('returns crossorigin attributes in link header', async () => {
    // Get response to a server-rendered page with `$fetch`.
    await $fetch('/', {
      onResponse: (response) => {
        const link = response.response.headers.get('link')
        expect(link).toContain(
          '</test-crossorigin-use-credentials.js>; rel="preload"; as="script"; crossorigin="use-credentials",'
        )
        expect(link).toContain(
          '</test-crossorigin-empty.js>; rel="preload"; as="script"; crossorigin,'
        )
        expect(link).toContain(
          '</test-crossorigin-anonymous.js>; rel="preload"; as="script"; crossorigin,'
        )
        expect(link).toContain(
          '</test-crossorigin-none.js>; rel="preload"; as="script",'
        )
      }
    })
  })

  it('not return nottobeincluded preload in link header', async () => {
    // Get response to a server-rendered page with `$fetch`.
    await $fetch('/', {
      onResponse: (response) => {
        const link = response.response.headers.get('link')
        // Ensure the unwanted preload type is NOT present in the link header.
        expect(link).not.toContain(
          '</nottobeincluded>; rel="preload"; as="nottobeincluded",'
        )
      }
    })
  })
})
