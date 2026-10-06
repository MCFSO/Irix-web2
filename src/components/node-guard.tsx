import { Link } from '@tanstack/react-router'
import { Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNodeStore } from '@/stores/node-store'

/**
 * 未连接节点时的数据占位块：嵌在页面卡片内部使用，
 * 页面骨架（页头、卡片、标签页）照常显示。
 */
export function NodeEmpty() {
  return (
    <div className='flex flex-col items-center justify-center gap-3 py-14 text-center'>
      <div className='flex size-14 items-center justify-center rounded-2xl bg-muted'>
        <Unplug className='size-7 text-muted-foreground' />
      </div>
      <div>
        <p className='text-sm font-medium'>尚未选择节点</p>
        <p className='mt-1 text-sm text-muted-foreground'>
          前往「节点连接」添加或选择一个 irix-node 后端后，这里会显示数据
        </p>
      </div>
      <Link to='/connect'>
        <Button size='sm' variant='outline'>
          去连接节点
        </Button>
      </Link>
    </div>
  )
}

/**
 * 节点数据守卫：未选中节点时返回 false，页面据此渲染 NodeEmpty 占位。
 */
export function useNodeReady(): boolean {
  return useNodeStore((s) => Boolean(s.activeId && s.nodes.some((n) => n.id === s.activeId)))
}
