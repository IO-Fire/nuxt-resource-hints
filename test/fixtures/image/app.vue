<template>
  <NuxtImg
    provider="imgix"
    src="/blog/woman-hat.jpg"
    width="300"
    height="500"
    fit="cover"
    :preload="{ fetchPriority: 'high' }"
    :modifiers="{ auto: 'format,compress', crop: 'faces' }"
  />
  <NuxtImg
    src="srcset-test-duplicate.jpg"
    :preload="{ fetchPriority: 'low' }"
  />
</template>

<script setup>
</script>

<style>
</style>
