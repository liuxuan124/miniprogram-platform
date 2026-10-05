<template>
  <div class="mw-page community-entry">
    <div class="loading-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchPlanetConfig, normalizeCommunities } from './planet-config'

const route = useRoute()
const router = useRouter()
const hint = ref('正在进入社区…')

onMounted(async () => {
  // kind 来自路由路径：/community/{content|members|membership}
  const seg = route.path.split('/')[2] || 'content'
  try {
    const cfg = await fetchPlanetConfig()
    const cards = normalizeCommunities(cfg)
    if (!cards.length) {
      ElMessage.info('还没有社区，请先创建')
      router.replace('/community/create')
      return
    }
    // 优先用最近操作的社区（社区列表/概览页写入），不存在则取第一个
    const lastId = localStorage.getItem('community_last_id') || ''
    const target = cards.find((c) => c.id === lastId) || cards[0]
    router.replace(`/community/${seg}/${target.id}`)
  } catch {
    ElMessage.error('社区配置加载失败')
    router.replace('/community/list')
  }
})
</script>

<style scoped>
.community-entry { padding: 40px 24px; }
</style>
