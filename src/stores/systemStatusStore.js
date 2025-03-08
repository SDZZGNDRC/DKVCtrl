import { defineStore } from 'pinia'
import config from '../config/config.json'

export const useSystemStatusStore = defineStore('systemStatus', {
  state: () => ({
    nodes: config.nodes.map((node, index) => ({
      ...node,
      id: index + 1,
      status: 'unknown',
      details: null
    })),
    selectedNode: null,
    loading: false,
    error: null,
    lastRefreshTime: null
  }),

  actions: {
    // 单个节点状态获取方法
    async fetchSingleNodeStatus(node, nodeIndex, retryCount = 2) {
      try {
        const url = `http://${node.ip}${node.port}/api/get-sysstatus`
        const response = await fetch(url, {
          headers: {
            'Token': config.APIAuthToken
          },
          signal: AbortSignal.timeout(1000) // 减少超时时间到1秒
        })

        if (!response.ok) {
          throw new Error(`Error fetching node status: ${response.statusText}`)
        }

        const data = await response.json()
        return {
          nodeIndex,
          data,
          success: true
        }
      } catch (error) {
        if (retryCount > 0) {
          // 递归重试
          return await this.fetchSingleNodeStatus(node, nodeIndex, retryCount - 1)
        }
        return {
          nodeIndex,
          error: error.message,
          success: false
        }
      }
    },

    // 并行获取所有节点状态
    async fetchAllNodesStatus() {
      if (this.loading) return // 防止重复请求

      this.loading = true
      this.error = null

      try {
        // 并行发送所有请求
        const requests = this.nodes.map((node, index) =>
          this.fetchSingleNodeStatus(node, index)
        )

        const results = await Promise.all(requests)

        // 处理结果
        let foundLeader = false
        results.forEach(result => {
          if (result.success) {
            const status = result.data.role.toLowerCase()
            this.nodes[result.nodeIndex] = {
              ...this.nodes[result.nodeIndex],
              status: status,
              details: result.data
            }

            if (status === 'leader') {
              foundLeader = true
            }
          } else {
            this.nodes[result.nodeIndex] = {
              ...this.nodes[result.nodeIndex],
              status: 'disconnected',
              details: null
            }
          }
        })

        // 如果找到了leader,更新其他在线节点为follower
        if (foundLeader) {
          this.nodes.forEach((node, index) => {
            if (node.status !== 'leader' && node.status !== 'disconnected') {
              this.nodes[index] = {
                ...node,
                status: 'follower'
              }
            }
          })
        }

        this.lastRefreshTime = Date.now()
      } catch (error) {
        console.error('Error fetching all nodes status:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    // 单个节点状态查询(保留向后兼容)
    async fetchNodeStatus(nodeIndex) {
      const result = await this.fetchSingleNodeStatus(this.nodes[nodeIndex], nodeIndex)
      this.selectedNode = nodeIndex

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    },

    clearSelectedNode() {
      this.selectedNode = null
    }
  }
})
