<template>
  <div class="system-status">
    <h1>系统状态信息</h1>

    <div class="topology-container">
      <el-card class="topology-card">
        <template #header>
          <div class="card-header">
            <span>Raft节点拓扑图</span>
            <el-button type="primary" @click="refreshAllNodes">刷新所有节点</el-button>
          </div>
        </template>

        <div class="topology-diagram" ref="topologyRef">
          <svg class="connections" ref="connectionsRef">
            <!-- 动态绘制节点连接线 -->
          </svg>

          <div
            v-for="(node, index) in systemStatus.nodes"
            :key="index"
            class="node"
            :class="getNodeClass(node.status)"
            @click="handleNodeClick(index)"
            :ref="
              (el) => {
                nodeRefs[index] = el
              }
            "
          >
            <span>Node {{ node.id }}</span>
            <div class="node-ip">{{ node.ip }}{{ node.port }}</div>
            <div class="node-status">{{ capitalizeFirstLetter(node.status) }}</div>
          </div>
        </div>

        <div class="legend">
          <div class="legend-item">
            <div class="legend-color leader"></div>
            <span>Leader</span>
          </div>
          <div class="legend-item">
            <div class="legend-color follower"></div>
            <span>Follower</span>
          </div>
          <div class="legend-item">
            <div class="legend-color candidate"></div>
            <span>Candidate</span>
          </div>
          <div class="legend-item">
            <div class="legend-color disconnected"></div>
            <span>Disconnected/Unknown</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 节点详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="节点详情" width="30%">
      <div v-if="selectedNodeDetails">
        <el-descriptions direction="vertical" :column="1" border>
          <el-descriptions-item label="角色">{{ selectedNodeDetails.role }}</el-descriptions-item>
          <el-descriptions-item label="节点ID">{{
            selectedNodeDetails.server_id
          }}</el-descriptions-item>
          <el-descriptions-item label="当前任期">{{
            selectedNodeDetails.term
          }}</el-descriptions-item>
          <el-descriptions-item label="时间戳">{{
            formatTimestamp(selectedNodeDetails.timestamp)
          }}</el-descriptions-item>
          <el-descriptions-item label="投票给">{{
            selectedNodeDetails.voted_for
          }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-else-if="systemStatus.error">
        <el-alert
          title="获取节点信息失败"
          type="error"
          :description="systemStatus.error"
          show-icon
          :closable="false"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useSystemStatusStore } from '../stores/systemStatusStore'

const systemStatus = useSystemStatusStore()
const dialogVisible = ref(false)
const topologyRef = ref(null)
const connectionsRef = ref(null)
const nodeRefs = []

const selectedNodeDetails = computed(() => {
  if (systemStatus.selectedNode !== null) {
    return systemStatus.nodes[systemStatus.selectedNode].details
  }
  return null
})

const getNodeClass = (status) => {
  switch (status) {
    case 'leader':
      return 'leader'
    case 'follower':
      return 'follower'
    case 'candidate':
      return 'candidate'
    default:
      return 'disconnected' // 包括unknown和disconnected状态
  }
}

const capitalizeFirstLetter = (string) => {
  if (!string) return 'Unknown'
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const handleNodeClick = async (nodeIndex) => {
  try {
    await systemStatus.fetchNodeStatus(nodeIndex)
    dialogVisible.value = true
  } catch {
    dialogVisible.value = true // 即使失败也显示弹窗，会显示错误信息
  }
}

const refreshAllNodes = async () => {
  for (let i = 0; i < systemStatus.nodes.length; i++) {
    try {
      await systemStatus.fetchNodeStatus(i)
    } catch (error) {
      console.error(`Failed to fetch status for node ${i + 1}:`, error)
    }
  }
  nextTick(() => {
    drawConnections()
  })
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString()
}

const drawConnections = () => {
  if (!connectionsRef.value) return

  const svg = connectionsRef.value
  // 清除现有连接
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild)
  }

  const leaderIndex = systemStatus.nodes.findIndex((node) => node.status === 'leader')

  // 如果没有leader，创建完全连接的拓扑
  if (leaderIndex === -1) {
    for (let i = 0; i < nodeRefs.length; i++) {
      for (let j = i + 1; j < nodeRefs.length; j++) {
        if (nodeRefs[i] && nodeRefs[j]) {
          drawLine(
            nodeRefs[i].getBoundingClientRect(),
            nodeRefs[j].getBoundingClientRect(),
            systemStatus.nodes[i].status === 'disconnected' ||
              systemStatus.nodes[j].status === 'disconnected',
          )
        }
      }
    }
  } else {
    // 如果有leader，创建星型拓扑
    for (let i = 0; i < nodeRefs.length; i++) {
      if (i !== leaderIndex && nodeRefs[i] && nodeRefs[leaderIndex]) {
        drawLine(
          nodeRefs[leaderIndex].getBoundingClientRect(),
          nodeRefs[i].getBoundingClientRect(),
          systemStatus.nodes[i].status === 'disconnected',
        )
      }
    }
  }
}

const drawLine = (rect1, rect2, isDisconnected) => {
  const svg = connectionsRef.value
  const svgRect = svg.getBoundingClientRect()

  // 计算相对于SVG的中心点
  const x1 = rect1.left + rect1.width / 2 - svgRect.left
  const y1 = rect1.top + rect1.height / 2 - svgRect.top
  const x2 = rect2.left + rect2.width / 2 - svgRect.left
  const y2 = rect2.top + rect2.height / 2 - svgRect.top

  // 创建线条元素
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', x1)
  line.setAttribute('y1', y1)
  line.setAttribute('x2', x2)
  line.setAttribute('y2', y2)
  line.setAttribute('stroke', isDisconnected ? '#F56C6C' : '#909399')
  line.setAttribute('stroke-width', '2')

  if (isDisconnected) {
    line.setAttribute('stroke-dasharray', '5,5')
  }

  svg.appendChild(line)
}

watch(
  () => systemStatus.nodes,
  () => {
    nextTick(() => {
      drawConnections()
    })
  },
  { deep: true },
)

onMounted(() => {
  refreshAllNodes()
  window.addEventListener('resize', drawConnections)
  nextTick(() => {
    drawConnections()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', drawConnections)
})
</script>

<style scoped>
.system-status {
  padding: 20px;
}

.topology-container {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topology-diagram {
  position: relative;
  height: 400px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  padding: 20px;
}

.node {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  color: white;
  margin: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  position: relative;
  z-index: 2;
}

.node:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.node-ip {
  font-size: 12px;
  margin-top: 5px;
}

.node-status {
  font-size: 12px;
  margin-top: 5px;
  font-weight: bold;
}

.leader {
  background-color: #67c23a; /* 绿色 - Leader */
}

.follower {
  background-color: #409eff; /* 蓝色 - Follower */
}

.candidate {
  background-color: #e6a23c; /* 黄色 - Candidate */
}

.disconnected {
  background-color: #f56c6c; /* 红色 - 失联 */
}

.connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  pointer-events: none;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
</style>
