/**
 * 历史任务 / 收藏任务数据层
 * 使用 Dexie（成熟的 IndexedDB 封装库）持久化任务记录、生成结果图片和收藏快照
 *
 * 原图 Blob 单独存放在 imageBlobs 表中，任务记录只保留缩略图、屏幕预览图和 blobKey，
 * 避免读取历史列表时把几十张 2K/4K 原图一次性载入内存。
 */
import Dexie from 'dexie'

export const MAX_TASK_HISTORY_ITEMS = 50

const THUMBNAIL_MAX_SIZE = 320
const PREVIEW_MAX_SIZE = 1600
// 图片代理（同源）路径，用于绕开未配置 CORS 的临时图片地址
const IMAGE_PROXY_PATH = '/api/image'
const IMAGE_FETCH_TIMEOUT = 20000

const db = new Dexie('SeedHubTaskDB')

db.version(1).stores({
  // images / video 等生成结果直接以内联 Blob 的形式保存在任务记录中
  tasks: '++id, createdAt',
  // 收藏任务保存任务快照，与历史任务相互独立，删除历史任务不会影响收藏
  favorites: '++id, favoritedAt, sourceTaskId'
})

db.version(2).stores({
  tasks: '++id, createdAt',
  favorites: '++id, favoritedAt, sourceTaskId',
  // 原图 Blob 独立存储，任务记录中的 images[].blobKey 指向这里
  imageBlobs: 'blobKey'
}).upgrade(async tx => {
  const blobTable = tx.table('imageBlobs')

  for (const tableName of ['tasks', 'favorites']) {
    const table = tx.table(tableName)
    const records = await table.toArray()

    for (const record of records) {
      if (!Array.isArray(record.images)) {
        continue
      }

      let changed = false
      for (const image of record.images) {
        if (!image.blob) {
          continue
        }

        const blobKey = createBlobKey()
        await blobTable.put({ blobKey, blob: image.blob })
        image.blobKey = blobKey
        delete image.blob
        changed = true
      }

      if (changed) {
        await table.put(record)
      }
    }
  }
})

/**
 * 读取历史任务，按生成时间倒序
 * 记录中不再包含原图 Blob，只含缩略图与预览图
 */
export function listTasks() {
  return db.tasks.orderBy('createdAt').reverse().toArray()
}

/**
 * 读取收藏任务，按收藏时间倒序
 */
export function listFavorites() {
  return db.favorites.orderBy('favoritedAt').reverse().toArray()
}

function createBlobKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * 判断 Blob 是否可用
 * IndexedDB 中的图片可能因为浏览器清理存储、解码失败而变成 null / 0 字节，
 * 这时不能再当作“图片还在本地”，否则界面只会显示一个裂图。
 */
export function isUsableBlob(blob) {
  return Boolean(blob) && typeof blob === 'object' && typeof blob.size === 'number' && blob.size > 0
}

/**
 * 申请持久化存储
 * 不申请时浏览器把 IndexedDB 当作“尽力而为”数据，磁盘紧张或长期不访问时可能被整体清理，
 * 表现为：历史/收藏记录还在，但图片全部显示不出来。
 */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, persisted: false, usage: null }
  }

  let persisted = false

  try {
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted()
    }

    if (!persisted && typeof navigator.storage.persist === 'function') {
      persisted = await navigator.storage.persist()
    }
  } catch (error) {
    console.warn('⚠️ 申请持久化存储失败:', error)
  }

  const usage = await getStorageUsage()

  if (!persisted) {
    console.warn('⚠️ 当前站点未获得持久化存储权限，浏览器可能在存储空间紧张时清理 IndexedDB，历史/收藏中的图片会随之丢失')
  }

  return { supported: true, persisted, usage }
}

/**
 * 读取当前站点的存储用量，用于自检面板提示
 */
export async function getStorageUsage() {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.estimate !== 'function') {
    return null
  }

  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return {
      usage,
      quota,
      ratio: quota > 0 ? usage / quota : 0
    }
  } catch (error) {
    console.warn('⚠️ 读取存储用量失败:', error)
    return null
  }
}

/**
 * 将 images 中的原图 Blob 移到 imageBlobs 表，返回可直接持久化的图片元数据
 */
async function externalizeImageBlobs(images) {
  if (!Array.isArray(images)) {
    return images
  }

  return Promise.all(images.map(async image => {
    if (!image || !image.blob) {
      return image
    }

    const blobKey = createBlobKey()
    await db.imageBlobs.put({ blobKey, blob: image.blob })

    const { blob, ...rest } = image
    return { ...rest, blobKey }
  }))
}

async function pruneTasks() {
  const count = await db.tasks.count()
  if (count <= MAX_TASK_HISTORY_ITEMS) {
    return
  }

  const excessIds = await db.tasks
    .orderBy('createdAt')
    .limit(count - MAX_TASK_HISTORY_ITEMS)
    .primaryKeys()

  if (excessIds.length > 0) {
    await db.tasks.bulkDelete(excessIds)
    await pruneOrphanBlobs()
  }
}

async function addTask(record) {
  const images = await externalizeImageBlobs(record.images)
  const id = await db.tasks.add({ ...record, ...(images ? { images } : {}) })
  await pruneTasks()
  return { ...record, ...(images ? { images } : {}), id }
}

/**
 * 收藏任务 / 历史任务中引用到的所有 blobKey
 */
async function collectReferencedBlobKeys() {
  const keys = new Set()
  const records = await Promise.all([db.tasks.toArray(), db.favorites.toArray()])

  records.forEach(list => {
    list.forEach(record => {
      if (!Array.isArray(record.images)) {
        return
      }
      record.images.forEach(image => {
        if (image && image.blobKey) {
          keys.add(image.blobKey)
        }
      })
    })
  })

  return keys
}

/**
 * 清理不再被任何历史/收藏任务引用的原图 Blob
 */
async function pruneOrphanBlobs() {
  const referencedKeys = await collectReferencedBlobKeys()
  const allKeys = await db.imageBlobs.toCollection().primaryKeys()
  const orphanKeys = allKeys.filter(key => !referencedKeys.has(key))

  if (orphanKeys.length > 0) {
    await db.imageBlobs.bulkDelete(orphanKeys)
  }
}

/**
 * 保存图片生成任务（记录中只保留缩略图 / 预览图，原图存 imageBlobs）
 */
export function saveImageTask(record) {
  return addTask({
    ...record,
    type: 'image'
  })
}

/**
 * 保存视频生成任务（暂不保存缩略图，仅保存视频地址等元信息）
 */
export function saveVideoTask(record) {
  return addTask({
    ...record,
    type: 'video'
  })
}

export async function deleteTask(id) {
  await db.tasks.delete(id)
  await pruneOrphanBlobs()
}

export async function clearTasks() {
  await db.tasks.clear()
  await pruneOrphanBlobs()
}

/**
 * 收藏任务：保存一份任务快照，之后即使历史任务被删除，收藏仍然保留
 * 快照只引用 blobKey，不会重复写入原图数据
 */
export async function addFavoriteTask(task) {
  const sourceTaskId = task.sourceTaskId ?? task.id

  if (sourceTaskId) {
    const existing = await db.favorites.where('sourceTaskId').equals(sourceTaskId).first()
    if (existing) {
      return existing.id
    }
  }

  // 删除任务自身的主键与临时展示地址，并转为普通对象，避免 Vue 响应式代理导致结构化克隆失败
  const { id, thumbnailUrl, images, video, ...rest } = task
  const snapshot = {
    ...rest,
    ...(Array.isArray(images)
      ? {
          images: images.map(image => ({
            url: image.url,
            revised_prompt: image.revised_prompt,
            blobKey: image.blobKey,
            blob: image.blob,
            thumbnail: image.thumbnail,
            preview: image.preview,
            mimeType: image.mimeType,
            missing: image.missing,
            remoteGone: image.remoteGone
          }))
        }
      : {}),
    ...(video ? { video: { ...video } } : {})
  }

  const storedImages = await externalizeImageBlobs(snapshot.images)
  const { images: _ignored, ...snapshotRest } = snapshot

  return db.favorites.add({
    ...snapshotRest,
    ...(storedImages ? { images: storedImages } : {}),
    sourceTaskId,
    favoritedAt: Date.now()
  })
}

export async function removeFavoriteTask(id) {
  await db.favorites.delete(id)
  await pruneOrphanBlobs()
}

/**
 * 读取一次远程图片并校验响应，失败返回 null
 */
async function fetchBlobFrom(sourceUrl) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT)

  try {
    const response = await fetch(sourceUrl, { mode: 'cors', signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (/^(text\/|application\/(json|xml))/.test(contentType)) {
      throw new Error(`返回内容不是图片: ${contentType}`)
    }

    const blob = await response.blob()
    return isUsableBlob(blob) ? blob : null
  } catch (error) {
    console.warn('⚠️ 读取远程图片失败:', sourceUrl, error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 从远程地址读取图片并转为 Blob，失败时返回 null
 *
 * 先直连（浏览器 <img> 能显示不代表 fetch 能跨域读取，很多图床不返回 CORS 头），
 * 直连失败再走同源代理 /api/image，保证生成结果能真正落到本地 IndexedDB。
 * 这一步失败的话，任务里只剩一个约 24 小时后就失效的临时链接。
 */
export async function fetchImageBlob(url) {
  if (!url) {
    return null
  }

  const direct = await fetchBlobFrom(url)
  if (direct) {
    return direct
  }

  if (typeof window !== 'undefined' && url.startsWith('http')) {
    const proxied = await fetchBlobFrom(`${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`)
    if (proxied) {
      return proxied
    }
  }

  console.warn('⚠️ 图片转存 IndexedDB 失败，将只保留临时远程地址:', url)
  return null
}

/**
 * 读取原图 Blob（仅下载原图时使用）
 */
export async function getImageBlob(blobKey) {
  if (!blobKey) {
    return null
  }

  const record = await db.imageBlobs.get(blobKey)
  return record && isUsableBlob(record.blob) ? record.blob : null
}

/**
 * 通过 Image 元素解码 Blob（部分浏览器不支持 createImageBitmap 时的回退方案）
 */
function decodeWithImageElement(blob) {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null)
  }

  const url = URL.createObjectURL(blob)

  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  }).finally(() => {
    URL.revokeObjectURL(url)
  })
}

/**
 * 将图片 Blob 等比缩放到指定最长边并重新编码为 JPEG
 */
async function createResizedBlob(blob, maxSize, quality) {
  if (!blob || typeof document === 'undefined') {
    return null
  }

  let source = null

  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(blob)
    }
  } catch (error) {
    console.warn('⚠️ createImageBitmap 解码失败，尝试使用 Image 元素:', error)
  }

  if (!source) {
    source = await decodeWithImageElement(blob)
  }

  if (!source) {
    console.warn('⚠️ 生成图片尺寸失败: 无法解码图片')
    return null
  }

  try {
    const sourceWidth = source.width || source.naturalWidth
    const sourceHeight = source.height || source.naturalHeight
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.drawImage(source, 0, 0, width, height)
    if (typeof source.close === 'function') {
      source.close()
    }

    return await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
  } catch (error) {
    console.warn('⚠️ 生成图片尺寸失败:', error)
    return null
  }
}

/**
 * 使用 canvas 生成缩略图，避免历史列表加载大图
 */
export function createThumbnailBlob(blob) {
  return createResizedBlob(blob, THUMBNAIL_MAX_SIZE, 0.8)
}

/**
 * 生成屏幕尺寸预览图（最长边 1600px），用于结果区和图片弹窗，避免直接解码 2K/4K 原图
 */
export function createPreviewBlob(blob) {
  return createResizedBlob(blob, PREVIEW_MAX_SIZE, 0.82)
}

/**
 * 修复单条历史任务 / 收藏任务的图片资源
 *
 * 处理四类问题：
 * 1. blobKey 指向的原图已经不存在（浏览器清理存储、迁移中断等）→ 清掉失效引用
 * 2. 旧记录仍把原图内联在任务里 → 统一挪到 imageBlobs，避免体积膨胀
 * 3. 原图缺失但远程链接还没过期 → 重新下载并转存（可以把旧收藏救回来）
 * 4. 缺少缩略图 / 预览图（旧数据、生成失败）→ 用原图重新生成
 *
 * @param {'tasks' | 'favorites'} tableName
 * @param {number} taskId
 * @param {{redownload?: boolean}} options redownload=false 时不访问网络
 * @returns {Promise<{record: object|null, changed: boolean, missing: number, recovered: number}>}
 */
export async function ensureTaskAssets(tableName, taskId, options = {}) {
  const { redownload = true } = options
  const table = tableName === 'favorites' ? db.favorites : db.tasks
  const record = await table.get(taskId)

  if (!record || !Array.isArray(record.images)) {
    return { record: record || null, changed: false, missing: 0, recovered: 0 }
  }

  let changed = false
  let missing = 0
  let recovered = 0

  for (const image of record.images) {
    if (!image || typeof image !== 'object') {
      continue
    }

    let original = isUsableBlob(image.blob) ? image.blob : null

    if (image.blobKey) {
      const blobRecord = await db.imageBlobs.get(image.blobKey)
      if (blobRecord && isUsableBlob(blobRecord.blob)) {
        original = blobRecord.blob
      } else {
        // 失效引用：不删除的话会干扰孤儿 Blob 清理逻辑
        delete image.blobKey
        changed = true
      }
    }

    // 旧记录的内联原图统一外置，任务记录里不再保留大 Blob
    if (isUsableBlob(image.blob)) {
      if (!image.blobKey) {
        const blobKey = createBlobKey()
        await db.imageBlobs.put({ blobKey, blob: image.blob })
        image.blobKey = blobKey
        original = image.blob
        recovered += 1
      }
      delete image.blob
      changed = true
    }

    // 原图彻底丢失时，尝试从还没过期的远程链接救回来
    if (!original && redownload && image.url && !image.remoteGone) {
      const downloaded = await fetchImageBlob(image.url)
      if (downloaded) {
        const blobKey = createBlobKey()
        await db.imageBlobs.put({ blobKey, blob: downloaded })
        image.blobKey = blobKey
        image.mimeType = downloaded.type || image.mimeType || ''
        original = downloaded
        recovered += 1
        changed = true
        delete image.remoteGone
      } else {
        // 记录“远程也取不到”，避免每次打开都重复请求一个已过期的链接
        image.remoteGone = true
        changed = true
      }
    }

    if (!original) {
      missing += 1
      if (!image.missing) {
        image.missing = true
        changed = true
      }
      // 缩略图/预览图还在时仍然保留展示能力
      continue
    }

    if (image.missing) {
      delete image.missing
      changed = true
    }

    if (!isUsableBlob(image.thumbnail)) {
      const thumbnail = await createThumbnailBlob(original)
      if (thumbnail) {
        image.thumbnail = thumbnail
        changed = true
      }
    }

    if (!isUsableBlob(image.preview)) {
      const preview = await createPreviewBlob(original)
      if (preview) {
        image.preview = preview
        changed = true
      }
    }
  }

  if (changed) {
    await table.put(record)
  }

  return { record, changed, missing, recovered }
}

/**
 * 兼容旧调用：为缺少预览图的任务补生成预览图
 * @param {'tasks' | 'favorites'} tableName
 * @param {number} taskId
 * @returns {Promise<object|null>} 更新后的任务记录
 */
export async function ensurePreviews(tableName, taskId) {
  const { record } = await ensureTaskAssets(tableName, taskId, { redownload: false })
  return record
}

/**
 * 统计历史任务 / 收藏任务的图片资源现状，用于自检面板
 */
export async function diagnoseTaskAssets() {
  const [tasks, favorites, blobKeys] = await Promise.all([
    db.tasks.toArray(),
    db.favorites.toArray(),
    db.imageBlobs.toCollection().primaryKeys()
  ])

  const keySet = new Set(blobKeys)

  const summarize = records => {
    const summary = {
      records: records.length,
      images: 0,
      original: 0,
      thumbnail: 0,
      preview: 0,
      missingOriginal: 0,
      remoteGone: 0
    }

    records.forEach(record => {
      if (!Array.isArray(record.images)) {
        return
      }

      record.images.forEach(image => {
        if (!image || typeof image !== 'object') {
          return
        }

        summary.images += 1

        const hasOriginal = (image.blobKey && keySet.has(image.blobKey)) || isUsableBlob(image.blob)
        if (hasOriginal) {
          summary.original += 1
        } else {
          summary.missingOriginal += 1
        }

        if (isUsableBlob(image.thumbnail)) {
          summary.thumbnail += 1
        }

        if (isUsableBlob(image.preview)) {
          summary.preview += 1
        }

        if (image.remoteGone) {
          summary.remoteGone += 1
        }
      })
    })

    return summary
  }

  return {
    tasks: summarize(tasks),
    favorites: summarize(favorites),
    blobCount: keySet.size,
    usage: await getStorageUsage()
  }
}

/**
 * 批量修复（只使用本地数据，不访问网络）
 * @param {{redownload?: boolean, onProgress?: (done: number, total: number) => void}} options
 */
export async function repairAllTaskAssets(options = {}) {
  const { redownload = false, onProgress } = options
  const [tasks, favorites] = await Promise.all([db.tasks.toArray(), db.favorites.toArray()])

  const targets = [
    ...tasks.map(record => ({ tableName: 'tasks', id: record.id })),
    ...favorites.map(record => ({ tableName: 'favorites', id: record.id }))
  ]

  let repaired = 0
  let missing = 0

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]

    try {
      const result = await ensureTaskAssets(target.tableName, target.id, { redownload })
      if (result.changed) {
        repaired += 1
      }
      missing += result.missing
    } catch (error) {
      console.warn('⚠️ 修复任务图片资源失败:', target, error)
    }

    if (typeof onProgress === 'function') {
      onProgress(index + 1, targets.length)
    }
  }

  return { total: targets.length, repaired, missing }
}

/**
 * 根据 Blob 的 MIME 类型推断下载文件扩展名
 */
export function getImageExtension(blob, fallbackUrl = '') {
  const mimeType = blob && blob.type ? blob.type : ''
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/avif': 'avif'
  }

  if (mimeMap[mimeType]) {
    return mimeMap[mimeType]
  }

  const match = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(fallbackUrl || '')
  return match ? match[1].toLowerCase() : 'png'
}
