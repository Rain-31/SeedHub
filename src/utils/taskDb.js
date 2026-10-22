/**
 * 历史任务 / 收藏任务数据层
 * 使用 Dexie（成熟的 IndexedDB 封装库）持久化任务记录、生成结果图片和收藏快照
 */
import Dexie from 'dexie'

export const MAX_TASK_HISTORY_ITEMS = 50

const THUMBNAIL_MAX_SIZE = 320

const db = new Dexie('SeedHubTaskDB')

db.version(1).stores({
  // images / video 等生成结果直接以内联 Blob 的形式保存在任务记录中
  tasks: '++id, createdAt',
  // 收藏任务保存任务快照，与历史任务相互独立，删除历史任务不会影响收藏
  favorites: '++id, favoritedAt, sourceTaskId'
})

/**
 * 读取历史任务，按生成时间倒序
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
  }
}

async function addTask(record) {
  const id = await db.tasks.add(record)
  await pruneTasks()
  return { ...record, id }
}

/**
 * 保存图片生成任务（包含原图 Blob 与缩略图 Blob）
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

export function deleteTask(id) {
  return db.tasks.delete(id)
}

export function clearTasks() {
  return db.tasks.clear()
}

/**
 * 收藏任务：保存一份任务快照，之后即使历史任务被删除，收藏仍然保留
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
            blob: image.blob,
            thumbnail: image.thumbnail,
            mimeType: image.mimeType
          }))
        }
      : {}),
    ...(video ? { video: { ...video } } : {})
  }

  return db.favorites.add({
    ...snapshot,
    sourceTaskId,
    favoritedAt: Date.now()
  })
}

export function removeFavoriteTask(id) {
  return db.favorites.delete(id)
}

/**
 * 从远程地址读取图片并转为 Blob，失败时返回 null（例如跨域受限）
 */
export async function fetchImageBlob(url) {
  if (!url) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, { mode: 'cors', signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    return blob.size > 0 ? blob : null
  } catch (error) {
    console.warn('⚠️ 图片转存 IndexedDB 失败，将保留远程地址:', error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 使用 canvas 生成缩略图，避免历史列表加载大图
 */
export async function createThumbnailBlob(blob) {
  if (!blob || typeof document === 'undefined') {
    return null
  }

  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, THUMBNAIL_MAX_SIZE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.drawImage(bitmap, 0, 0, width, height)
    if (typeof bitmap.close === 'function') {
      bitmap.close()
    }

    return await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    })
  } catch (error) {
    console.warn('⚠️ 生成缩略图失败:', error)
    return null
  }
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
