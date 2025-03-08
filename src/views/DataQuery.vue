<!-- src/views/DataQuery.vue -->
<template>
  <div class="data-query-container">
    <h2>分布式KV存储数据查询</h2>

    <el-card class="operation-card">
      <el-tabs v-model="activeTab">
        <!-- 查询选项卡 -->
        <el-tab-pane label="查询" name="query">
          <el-form :inline="true" @submit.prevent="handleQuery">
            <el-form-item label="键名">
              <el-input v-model.trim="queryForm.key" placeholder="请输入要查询的键名" clearable></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleQuery" :loading="loading.query">查询</el-button>
              <el-button @click="handleClearQuery">清空</el-button>
            </el-form-item>
          </el-form>

          <div v-if="queryResult !== null" class="query-result">
            <h3>查询结果:</h3>
            <el-descriptions border>
              <el-descriptions-item label="键名">{{ queryForm.key }}</el-descriptions-item>
              <el-descriptions-item label="值">{{ queryResult || '(空值)' }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <el-empty v-else-if="showEmptyQuery" description="无查询结果或键不存在"></el-empty>
        </el-tab-pane>

        <!-- 添加/修改选项卡 -->
        <el-tab-pane label="添加/修改" name="put">
          <el-form :model="putForm" label-width="80px" @submit.prevent="handlePut">
            <el-form-item label="键名" required>
              <el-input v-model.trim="putForm.key" placeholder="请输入键名"></el-input>
            </el-form-item>
            <el-form-item label="值" required>
              <el-input
                v-model.trim="putForm.value"
                type="textarea"
                :rows="4"
                placeholder="请输入值"
              ></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handlePut" :loading="loading.put">保存</el-button>
              <el-button @click="handleClearPut">清空</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 追加选项卡 -->
        <el-tab-pane label="追加" name="append">
          <el-form :model="appendForm" label-width="80px" @submit.prevent="handleAppend">
            <el-form-item label="键名" required>
              <el-input v-model.trim="appendForm.key" placeholder="请输入要追加的键名"></el-input>
            </el-form-item>
            <el-form-item label="追加值" required>
              <el-input
                v-model.trim="appendForm.value"
                type="textarea"
                :rows="4"
                placeholder="请输入要追加的值"
              ></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAppend" :loading="loading.append">追加</el-button>
              <el-button @click="handleClearAppend">清空</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 操作记录 -->
    <el-card class="operation-log-card">
      <template #header>
        <div class="card-header">
          <span>操作记录</span>
          <el-button type="primary" link @click="handleClearLogs">清空记录</el-button>
        </div>
      </template>
      <el-timeline v-if="operationLogs.length > 0">
        <el-timeline-item
          v-for="(log, index) in operationLogs"
          :key="index"
          :type="log.status === 'success' ? 'success' : 'danger'"
          :timestamp="log.time"
        >
          {{ log.message }}
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无操作记录"></el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataQueryStore } from '../stores/dataQuery'

const dataQueryStore = useDataQueryStore()

// 活动选项卡
const activeTab = ref('query')

// 查询表单
const queryForm = reactive({
  key: ''
})
const queryResult = ref(null)
const showEmptyQuery = ref(false)

// 添加/修改表单
const putForm = reactive({
  key: '',
  value: ''
})

// 追加表单
const appendForm = reactive({
  key: '',
  value: ''
})

// 加载状态
const loading = reactive({
  query: false,
  put: false,
  append: false
})

// 操作日志
const operationLogs = ref([])

// 查询操作
const handleQuery = async () => {
  if (!queryForm.key) {
    ElMessage.warning('请输入要查询的键名')
    return
  }

  loading.query = true
  showEmptyQuery.value = false
  queryResult.value = null

  try {
    const result = await dataQueryStore.get(queryForm.key)
    if (result === '') {
      showEmptyQuery.value = true
    } else {
      queryResult.value = result
      addOperationLog('success', `查询键 "${queryForm.key}" 成功`)
    }
  } catch (error) {
    console.error('查询失败:', error)
    showEmptyQuery.value = true
    ElMessage.error(error.message || '查询失败')
    addOperationLog('error', `查询键 "${queryForm.key}" 失败: ${error.message}`)
  } finally {
    loading.query = false
  }
}

// 添加/修改操作
const handlePut = async () => {
  if (!putForm.key) {
    ElMessage.warning('请输入键名')
    return
  }

  if (putForm.value === undefined || putForm.value === null) {
    ElMessage.warning('请输入值')
    return
  }

  loading.put = true

  try {
    await dataQueryStore.put(putForm.key, putForm.value)
    ElMessage.success('保存成功')
    addOperationLog('success', `保存键 "${putForm.key}" 成功`)
    handleClearPut()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.message || '保存失败')
    addOperationLog('error', `保存键 "${putForm.key}" 失败: ${error.message}`)
  } finally {
    loading.put = false
  }
}

// 追加操作
const handleAppend = async () => {
  if (!appendForm.key) {
    ElMessage.warning('请输入要追加的键名')
    return
  }

  if (appendForm.value === undefined || appendForm.value === null) {
    ElMessage.warning('请输入要追加的值')
    return
  }

  loading.append = true

  try {
    await dataQueryStore.append(appendForm.key, appendForm.value)
    ElMessage.success('追加成功')
    addOperationLog('success', `向键 "${appendForm.key}" 追加成功`)
    handleClearAppend()
  } catch (error) {
    console.error('追加失败:', error)
    ElMessage.error(error.message || '追加失败')
    addOperationLog('error', `向键 "${appendForm.key}" 追加失败: ${error.message}`)
  } finally {
    loading.append = false
  }
}

// 清空相关方法保持不变
const handleClearQuery = () => {
  queryForm.key = ''
  queryResult.value = null
  showEmptyQuery.value = false
}

const handleClearPut = () => {
  putForm.key = ''
  putForm.value = ''
}

const handleClearAppend = () => {
  appendForm.key = ''
  appendForm.value = ''
}

const addOperationLog = (status, message) => {
  operationLogs.value.unshift({
    status,
    message,
    time: new Date().toLocaleString()
  })

  if (operationLogs.value.length > 10) {
    operationLogs.value = operationLogs.value.slice(0, 10)
  }
}

const handleClearLogs = () => {
  operationLogs.value = []
}
</script>

<style scoped>
.data-query-container {
  padding: 20px;
}

.operation-card {
  margin-bottom: 20px;
}

.query-result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.operation-log-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
