import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Label, Switch } from '@/components/ui/misc'
import { updateInstance, type InstanceInfo } from '@/lib/api'

export function InstanceSettings({ instance }: { instance: InstanceInfo }) {
  const queryClient = useQueryClient()
  const [nickname, setNickname] = useState(instance.config.nickname)
  const [startCommand, setStartCommand] = useState(instance.config.startCommand)
  const [stopCommand, setStopCommand] = useState(instance.config.stopCommand)
  const [cwd, setCwd] = useState(instance.config.cwd)
  const [type, setType] = useState(instance.config.type)
  const [autoStart, setAutoStart] = useState(instance.config.eventTask?.autoStart ?? false)
  const [autoRestart, setAutoRestart] = useState(instance.config.eventTask?.autoRestart ?? false)

  const mutation = useMutation({
    mutationFn: () =>
      updateInstance(instance.instanceUuid, {
        ...instance.config,
        nickname: nickname.trim(),
        startCommand,
        stopCommand,
        cwd: cwd.trim(),
        type,
        eventTask: {
          autoStart,
          autoRestart,
          ignore: instance.config.eventTask?.ignore ?? false,
        },
      }),
    onSuccess: () => {
      toast.success('设置已保存')
      queryClient.invalidateQueries({ queryKey: ['instance', instance.instanceUuid] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '保存失败'),
  })

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>基本信息</CardTitle>
          <CardDescription>实例名称、类型与工作目录</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1.5'>
            <Label>实例名称</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className='space-y-1.5'>
            <Label>实例类型</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder='universal' />
          </div>
          <div className='space-y-1.5'>
            <Label>工作目录</Label>
            <Input value={cwd} onChange={(e) => setCwd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>启动配置</CardTitle>
          <CardDescription>进程的启动与停止命令</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1.5'>
            <Label>启动命令</Label>
            <Textarea
              className='min-h-16 font-mono text-xs'
              value={startCommand}
              onChange={(e) => setStartCommand(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label>停止命令</Label>
            <Input value={stopCommand} onChange={(e) => setStopCommand(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>事件任务</CardTitle>
          <CardDescription>自动化行为配置</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>保存</CardTitle>
          <CardDescription>修改将在保存后生效</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className='w-full'>
            {mutation.isPending ? '保存中…' : '保存设置'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
