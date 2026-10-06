import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NodeConnection {
  id: string
  name: string
  url: string
  apiKey: string
}

interface NodeState {
  /** 所有已配置的节点 */
  nodes: NodeConnection[]
  /** 当前选中的节点 id；空 = 未选中 */
  activeId: string
  /** 添加节点（不自动选中） */
  addNode: (node: NodeConnection) => void
  /** 更新节点 */
  updateNode: (id: string, patch: Partial<Omit<NodeConnection, 'id'>>) => void
  /** 删除节点 */
  removeNode: (id: string) => void
  /** 选中节点 */
  setActive: (id: string) => void
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function newId(): string {
  return genId()
}

export const useNodeStore = create<NodeState>()(
  persist(
    (set) => ({
      nodes: [],
      activeId: '',
      addNode: (node) =>
        set((s) => {
          const nodes = [...s.nodes, node]
          // 第一个节点自动选中
          const activeId = s.activeId || node.id
          return { nodes, activeId }
        }),
      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      removeNode: (id) =>
        set((s) => {
          const nodes = s.nodes.filter((n) => n.id !== id)
          const activeId = s.activeId === id ? (nodes[0]?.id ?? '') : s.activeId
          return { nodes, activeId }
        }),
      setActive: (id) => set({ activeId: id }),
    }),
    { name: 'irix-node-connections' }
  )
)

/** 获取当前选中的节点 */
export function getActiveNode(): NodeConnection | null {
  const s = useNodeStore.getState()
  return s.nodes.find((n) => n.id === s.activeId) ?? null
}
