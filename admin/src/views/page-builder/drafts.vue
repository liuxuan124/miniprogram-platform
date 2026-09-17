<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  router.replace({ path: '/page-builder/start', query: { ...route.query, scene: 'templates' } })
})
</script>

<template>
  <div />
</template>
