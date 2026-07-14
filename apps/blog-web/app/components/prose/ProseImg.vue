<script setup lang="ts">
defineProps<{
  src: string
  alt?: string
  title?: string
}>()
</script>

<template>
  <NuxtImg
    :alt="alt ?? ''"
    decoding="async"
    loading="lazy"
    sizes="100vw sm:100vw md:704px"
    :src="src"
    :title="title"
  />
</template>
