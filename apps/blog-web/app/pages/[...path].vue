<script setup lang="ts">
useNotFoundResponse(true)
usePageSeo({
  title: '没有找到这个页面',
  description: '它可能已经移动，或从未公开发布。',
  noindex: true,
})
</script>

<template>
  <PublicNotFound
    description="它可能已经移动，或从未公开发布。"
    return-label="返回首页"
    return-to="/"
    title="没有找到这个页面"
  />
</template>
