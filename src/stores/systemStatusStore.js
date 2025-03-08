import { defineStore } from 'pinia'
import config from '../config/config.json'

export const useSystemStatusStore = defineStore('systemStatus', {
  state: () => ({
    nodes: config.nodes.map((node, index) => ({
      ...node,
      id: index + 1,
      status: 'unknown', // unknown, leader, follower, candidate, disconnected
      details: null
    })),
    selectedNode: null,
    loading: false,
    error: null
  }),

  actions: {
    async fetchNodeStatus(nodeIndex) {
      const node = this.nodes[nodeIndex]
      this.loading = true
      this.error = null

      try {
        const url = `http://${node.ip}${node.port}/api/get-sysstatus`
        console.log(`Fetching status from: ${url}`)

        const response = await fetch(url, {
          headers: {
            'Token': config.APIAuthToken
          },
          signal: AbortSignal.timeout(5000) // 添加超时
        })

        if (!response.ok) {
          throw new Error(`Error fetching node status: ${response.statusText}`)
        }

        const data = await response.json()

        // 更新节点状态
        this.nodes[nodeIndex] = {
          ...node,
          status: data.role.toLowerCase(),
          details: data
        }

        this.selectedNode = nodeIndex

        // 如果这个节点是leader，更新其他节点为follower
        if (data.role.toLowerCase() === 'leader') {
          this.nodes.forEach((n, i) => {
            if (i !== nodeIndex && n.status !== 'disconnected') {
              this.nodes[i] = {
                ...n,
                status: 'follower'
              }
            }
          })
        }

        return data
      } catch (error) {
        console.error(`Error fetching node ${nodeIndex + 1} status:`, error)
        this.error = error.message
        this.nodes[nodeIndex] = {
          ...node,
          status: 'disconnected',
          details: null
        }
        throw error
      } finally {
        this.loading = false
      }
    },

    clearSelectedNode() {
      this.selectedNode = null
    }
  }
})
