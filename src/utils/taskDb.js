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
            mimeType: image.mimeType
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
 * 读取原图 Blob（仅下载原图时使用）
 */
export async function getImageBlob(blobKey) {
  if (!blobKey) {
    return null
  }

  const record = await db.imageBlobs.get(blobKey)
  return record && record.blob ? record.blob : null
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
 * 为缺少预览图的历史记录补生成预览图（迁移过来的旧数据）
 * @param {'tasks' | 'favorites'} tableName
 * @param {number} taskId
 * @returns {Promise<object|null>} 更新后的任务记录
 */
export async function ensurePreviews(tableName, taskId) {
  const table = tableName === 'favorites' ? db.favorites : db.tasks
  const record = await table.get(taskId)

  if (!record || !Array.isArray(record.images)) {
    return record || null
  }

  let changed = false

  for (const image of record.images) {
    if (!image || image.preview || !image.blobKey) {
      continue
    }

    const blobRecord = await db.imageBlobs.get(image.blobKey)
    if (!blobRecord || !blobRecord.blob) {
      continue
    }

    const preview = await createPreviewBlob(blobRecord.blob)
    if (preview) {
      image.preview = preview
      changed = true
    }
  }

  if (changed) {
    await table.put(record)
  }

  return record
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
