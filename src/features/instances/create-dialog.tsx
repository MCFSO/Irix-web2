import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Label, Switch } from '@/components/ui/misc'
import { createInstance } from '@/lib/api'

export function CreateInstanceDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [nickname, setNickname] = useState('')
  const [cwd, setCwd] = useState('')
  const [startCommand, setStartCommand] = useState('')
  const [stopCommand, setStopCommand] = useState('stop')
  const [type, setType] = useState('universal')
  const [autoStart, setAutoStart] = useState(false)
  const [autoRestart, setAutoRestart] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      createInstance({
        nickname: nickname.trim(),
        cwd: cwd.trim(),
        startCommand,
        stopCommand: stopCommand || 'stop',
        type,
        eventTask: { autoStart, autoRestart, ignore: false },
      }),
    onSuccess: () => {
      toast.success('实例创建成功')
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      props.onOpenChange(false)
      reset()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '创建失败'),
  })

  const reset = () => {
    setNickname('')
    setCwd('')
    setStartCommand('')
    setStopCommand('stop')
    setType('universal')
    setAutoStart(false)
    setAutoRestart(false)
  }

  const canSubmit = nickname.trim() && startCommand.trim()

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='新建实例'
      description='创建一个通用应用实例（游戏服务端 / 脚本 / 任意进程）'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '创建中…' : '创建'}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='ci-nickname'>实例名称 *</Label>
          <Input
            id='ci-nickname'
            placeholder='例如：我的世界生存服'
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='ci-cwd'>工作目录</Label>
          <Input
            id='ci-cwd'
            placeholder='留空则使用节点数据目录下的实例目录'
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='ci-start'>启动命令 *</Label>
          <Textarea
            id='ci-start'
            className='min-h-16 font-mono text-xs'
            placeholder='例如：java -Xms2G -Xmx4G -jar server.jar nogui'
            value={startCommand}
            onChange={(e) => setStartCommand(e.target.value)}
          />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='ci-stop'>停止命令</Label>
            <Input
              id='ci-stop'
              placeholder='stop'
              value={stopCommand}
              onChange={(e) => setStopCommand(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='ci-type'>实例类型</Label>
            <Input
              id='ci-type'
              placeholder='universal'
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
        </div>
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <p className='text-sm font-medium'>开机自动启动</p>
            <p className='text-xs text-muted-foreground'>节点启动后自动启动此实例</p>
          </div>
          <Switch checked={autoStart} onCheckedChange={setAutoStart} />
        </div>
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <p className='text-sm font-medium'>崩溃自动重启</p>
            <p className='text-xs text-muted-foreground'>进程异常退出时自动重启</p>
          </div>
          <Switch checked={autoRestart} onCheckedChange={setAutoRestart} />
        </div>
      </div>
    </Dialog>
  )
}
