// 面板本地账户系统：纯前端实现，与后端节点账户完全分离。
//
// 类比：节点连接（API Key）= SSH 密钥，只负责连后端；
// 本地账户 = 这台电脑上操作面板的用户，存在浏览器 localStorage 中。
//
// 密码存储：PBKDF2-SHA256（WebCrypto）加盐哈希，不存明文。

const ITERATIONS = 100_000
const KEY_LEN = 32 // bytes
const STORAGE_USERS = 'irix-panel-users'
const STORAGE_SESSION = 'irix-panel-session'

export interface LocalUser {
  username: string
  /** base64 编码的 PBKDF2 哈希 */
  hash: string
  /** base64 编码的盐 */
  salt: string
  isAdmin: boolean
  createdAt: number
}

function readUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS) ?? '[]')
  } catch {
    return []
  }
}

function writeUsers(users: LocalUser[]) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users))
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    keyMaterial,
    KEY_LEN * 8
  )
  return toBase64(bits)
}

export function hasUsers(): boolean {
  return readUsers().length > 0
}

export function getSession(): string | null {
  return localStorage.getItem(STORAGE_SESSION)
}

export function setSession(username: string) {
  localStorage.setItem(STORAGE_SESSION, username)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_SESSION)
}

export function getSessionUser(): LocalUser | null {
  const name = getSession()
  if (!name) return null
  return readUsers().find((u) => u.username === name) ?? null
}

/** 注册首个用户（管理员）。已有用户时应走 addUser（需要管理员）。 */
export async function registerFirstUser(
  username: string,
  password: string
): Promise<LocalUser> {
  const users = readUsers()
  if (users.length > 0) {
    throw new Error('面板已有用户，请由管理员添加新用户')
  }
  const user = await createUser(username, password, true)
  writeUsers([user])
  setSession(user.username)
  return user
}

export async function addUser(
  username: string,
  password: string,
  isAdmin: boolean
): Promise<LocalUser> {
  const users = readUsers()
  if (users.some((u) => u.username === username)) {
    throw new Error('用户名已存在')
  }
  const user = await createUser(username, password, isAdmin)
  writeUsers([...users, user])
  return user
}

async function createUser(
  username: string,
  password: string,
  isAdmin: boolean
): Promise<LocalUser> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveHash(password, salt)
  return {
    username,
    hash,
    salt: toBase64(salt),
    isAdmin,
    createdAt: Date.now(),
  }
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<LocalUser> {
  const user = readUsers().find((u) => u.username === username)
  if (!user) throw new Error('用户名或密码错误')
  const saltBytes = Uint8Array.from(atob(user.salt), (c) => c.charCodeAt(0))
  const hash = await deriveHash(password, saltBytes)
  if (hash !== user.hash) throw new Error('用户名或密码错误')
  setSession(username)
  return user
}

export function removeUser(username: string): void {
  const users = readUsers()
  if (users.length <= 1) throw new Error('不能删除最后一个用户')
  const target = users.find((u) => u.username === username)
  if (!target) return
  if (target.isAdmin && users.filter((u) => u.isAdmin).length <= 1) {
    throw new Error('不能删除最后一个管理员')
  }
  writeUsers(users.filter((u) => u.username !== username))
}

export async function changeLocalPassword(
  username: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const users = readUsers()
  const user = users.find((u) => u.username === username)
  if (!user) throw new Error('用户不存在')
  const saltBytes = Uint8Array.from(atob(user.salt), (c) => c.charCodeAt(0))
  const oldHash = await deriveHash(oldPassword, saltBytes)
  if (oldHash !== user.hash) throw new Error('旧密码错误')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  user.hash = await deriveHash(newPassword, salt)
  user.salt = toBase64(salt)
  writeUsers(users)
}

export function listUsers(): LocalUser[] {
  return readUsers()
}
