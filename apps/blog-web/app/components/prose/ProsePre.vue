<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  language?: string
  filename?: string
}>()

const label = computed(() => props.filename?.trim() || props.language?.trim() || '')
</script>

<template>
  <div class="prose-pre" :class="{ 'prose-pre--labeled': label }">
    <span v-if="label" class="prose-pre__language">{{ label }}</span>
    <pre class="prose-pre__base" v-bind="$attrs"><slot /></pre>
  </div>
</template>

<style scoped>
.prose-pre {
  position: relative;
  margin: 1.6em 0 var(--space-xl);
}

.prose-pre__language {
  position: absolute;
  z-index: 1;
  top: 0.72rem;
  right: 0.82rem;
  color: color-mix(in srgb, var(--code-on-surface) 58%, transparent);
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.prose-pre__base {
  overflow-x: auto;
  margin: 0;
  padding: 2.55rem 1.15rem 1.15rem;
  border: 0;
  border-radius: 0.375rem;
  background: var(--code-bg);
  color: var(--code-on-surface);
  font-family: var(--font-code);
  font-size: 0.8em;
  line-height: 1.7;
}

.prose-pre:not(.prose-pre--labeled) .prose-pre__base {
  padding-top: 1.15rem;
}
</style>
