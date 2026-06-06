<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1>404</h1>
      <p>页面不存在</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f7fa;
}
.not-found-content {
  text-align: center;
}
.not-found-content h1 {
  font-size: 72px;
  color: #c0c4cc;
  margin: 0;
}
.not-found-content p {
  font-size: 16px;
  color: #909399;
  margin: 12px 0 24px;
}
</style>
