<script setup lang="ts">
const { size = 'default' } = defineProps<{
  size?: 'default' | 'narrow' | 'wide'
}>()
</script>

<template>
  <div class="admin-page" :class="`admin-page--${size}`">
    <slot />
  </div>
</template>

<style scoped>
.admin-page {
  width: 100%;
  margin: 0 auto;
}

.admin-page--default {
  max-width: 76rem;
}

.admin-page--wide {
  max-width: 92rem;
}

.admin-page--narrow {
  max-width: 52rem;
}
</style>
