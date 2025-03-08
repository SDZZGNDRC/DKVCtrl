<template>
  <el-menu default-active="/system-status" class="sidebar-menu" router>
    <el-menu-item index="/system-status">
      <el-icon><Monitor /></el-icon>
      <span>系统状态信息</span>
    </el-menu-item>
    <!-- 后续可以添加更多菜单项 -->
  </el-menu>
</template>

<script setup>
import { Monitor } from '@element-plus/icons-vue'
</script>

<style scoped>
.sidebar-menu {
  height: 100%;
}
</style>
