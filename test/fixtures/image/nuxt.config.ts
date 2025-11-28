import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [MyModule, '@nuxt/image'],

  image: {
    imgix: {
      baseURL: 'https://assets.imgix.net'
    }
  }
})
