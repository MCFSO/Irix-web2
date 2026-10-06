# IriX Node Web 管理面板

参照 [new-api](../new-api) 风格实现的 IriX-Node 节点管理前端。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React 19 + TypeScript |
| 构建 | Rsbuild |
| 样式 | Tailwind CSS 3（CSS 变量主题，支持明暗模式） |
| 路由 | TanStack Router |
| 数据 | TanStack Query + Axios |
| 状态 | Zustand（localStorage 持久化） |
| 图表 | Recharts |
| 图标 | lucide-react |
| 通知 | Sonner |

## 开发

```bash
cd web
npm install
npm run dev      # 启动 http://127.0.0.1:5173，代理 /api → http://127.0.0.1:12346
```

后端需先启动节点：

```powershell
go run . -port 12346 -data <数据目录>
```

## 构建与嵌入

```bash
cd web
npm run build    # 输出到 web/dist/
```

项目根目录的 `webui.go` 通过 `go:embed all:web/dist` 将前端产物编译进二进制；
启动节点后直接访问 `http://<host>:<port>/` 即可打开面板（SPA 路由由前端接管，
`/api`、`/download`、`/upload` 路径不受影响）。

若 `web/dist` 不存在（未构建），Go 编译会失败——这是有意为之，
发布前必须先构建前端。

## 页面

| 路由 | 功能 |
| --- | --- |
| `/login` | 账户登录（root + 配对码/密码）或 API Key 直连 |
| `/` | 仪表盘：主机信息、CPU/内存/磁盘、网络吞吐实时曲线、守护进程列表 |
| `/instances` | 实例列表：搜索、状态过滤、启停/重启/强杀/删除、新建实例 |
| `/instances/:uuid` | 实例详情：实时控制台（命令下发）、监控、历史日志、实例设置 |
| `/files` | 文件管理：浏览、编辑、上传、新建、重命名、复制/剪切/粘贴、压缩/解压、回收站 |
| `/containers` | 容器环境：Docker 容器/镜像/网络，FreeBSD Bastille jails |
| `/runtime` | Java 运行时检测列表 |
| `/frp` | FRP 内网穿透隧道管理 |
| `/accounts` | 账户管理：增删账户、管理员标记、逐端点权限开关、修改密码 |
| `/audit` | 审计日志查询（分页） |

## 认证

- 会话 token 存于 `localStorage`（key `irix-node-auth`），请求头 `X-Auth-Token`；
- API Key 模式使用请求头 `X-Api-Key`，与 MCSM 客户端保持一致；
- 认证失效（401/403）自动清空登录态并返回登录页；
- root 首次登录（配对码未替换）会提示强制改密。
