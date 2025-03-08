// src/stores/dataQuery.js
import { defineStore } from 'pinia'
import config from '../config/config.json'

export const useDataQueryStore = defineStore('dataQuery', {
  state: () => ({
    loading: false,
    error: null,
    lastResult: null,
    currentLeader: 0,
    identifier: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  }),

  actions: {
    // 获取键值
    async get(key) {
      this.loading = true
      this.error = null

      try {
        const args = {
          key
        }

        let attempt = 0
        const maxAttempts = config.nodes.length * 2

        while (attempt < maxAttempts) {
          const nodeIndex = (this.currentLeader + Math.floor(attempt / 2)) % config.nodes.length
          const node = config.nodes[nodeIndex]

          try {
            console.log(`尝试从节点 ${nodeIndex + 1} (${node.ip}) 获取键 "${key}"`)

            const response = await fetch(`http://${node.ip}:5112/kv/get`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Token': config.APIAuthToken
              },
              body: JSON.stringify(args),
              signal: AbortSignal.timeout(3000)
            })

            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`)
            }

            const result = await response.json()

            if (!result.success) {
              if (result.err === "ERR_NOT_LEADER") {
                console.log(`节点 ${nodeIndex + 1} 不是Leader, 尝试下一个节点`)
                attempt++
                continue
              }
              throw new Error(result.err)
            }

            // 如果成功，更新当前leader索引
            this.currentLeader = nodeIndex
            this.lastResult = result.value
            return this.lastResult
          } catch (error) {
            console.error(`从节点 ${nodeIndex + 1} 获取失败:`, error)
            attempt++

            if (attempt >= maxAttempts) {
              throw new Error('无法连接到集群节点')
            }

            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 设置或追加键值
    async putAppend(key, value, isAppend = false) {
      this.loading = true
      this.error = null

      try {
        const args = {
          key,
          value
        }

        let attempt = 0
        const maxAttempts = config.nodes.length * 2

        while (attempt < maxAttempts) {
          const nodeIndex = (this.currentLeader + Math.floor(attempt / 2)) % config.nodes.length
          const node = config.nodes[nodeIndex]

          try {
            const endpoint = isAppend ? 'append' : 'put'
            console.log(`尝试向节点 ${nodeIndex + 1} (${node.ip}) 发送 ${endpoint} 操作, 键: "${key}"`)

            const response = await fetch(`http://${node.ip}:5112/kv/${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Token': config.APIAuthToken
              },
              body: JSON.stringify(args),
              signal: AbortSignal.timeout(3000)
            })

            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`)
            }

            const result = await response.json()

            if (!result.success) {
              if (result.err === "ERR_NOT_LEADER") {
                console.log(`节点 ${nodeIndex + 1} 不是Leader, 尝试下一个节点`)
                attempt++
                continue
              }
              throw new Error(result.err)
            }

            // 如果成功，更新当前leader索引
            this.currentLeader = nodeIndex
            return true
          } catch (error) {
            console.error(`向节点 ${nodeIndex + 1} 发送操作失败:`, error)
            attempt++

            if (attempt >= maxAttempts) {
              throw new Error('无法连接到集群节点')
            }

            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 设置键值 (Put)
    async put(key, value) {
      return this.putAppend(key, value, false)
    },

    // 追加键值 (Append)
    async append(key, value) {
      return this.putAppend(key, value, true)
    }
  }
})
