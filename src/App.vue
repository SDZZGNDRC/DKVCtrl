<template>
  <div class="app-container">
    <el-container>
      <el-aside width="250px">
        <Sidebar />
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import Sidebar from './components/SideBar.vue'
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}
.app-container {
  height: 100vh;
  width: 100vw;
}
</style>
