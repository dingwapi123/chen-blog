<script setup lang="ts">
defineProps<{
  description?: string
  eyebrow?: string
  title: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <p v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="description" class="page-header__description">{{ description }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--outline-ghost);
}

.page-header__copy {
  min-width: 0;
}

.page-header__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-header__title {
  margin: 0;
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  font-weight: 740;
  letter-spacing: -0.045em;
  line-height: 1.12;
}

.page-header__description {
  max-width: 43rem;
  margin: 0.5rem 0 0;
  color: var(--on-surface-muted);
  font-size: 0.88rem;
  line-height: 1.65;
}

.page-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.55rem;
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
  }

  .page-header__actions {
    flex-wrap: wrap;
  }
}
</style>
