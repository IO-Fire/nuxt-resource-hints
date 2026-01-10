<template>
  <div>basic</div>
</template>

<script setup>
useHead({
  link: [
    { rel: 'preload', as: 'script', href: '/test-crossorigin-use-credentials.js', crossorigin: 'use-credentials' },
    { rel: 'preload', as: 'script', href: '/test-crossorigin-empty.js', crossorigin: '' },
    { rel: 'preload', as: 'script', href: '/test-crossorigin-anonymous.js', crossorigin: 'anonymous' },
    { rel: 'preload', as: 'script', href: '/test-crossorigin-none.js' },
    { rel: 'preload', as: 'nottobeincluded', href: '/nottobeincluded' },
  ],
})
</script>

<style>
div {
  color: red;
}
</style>
