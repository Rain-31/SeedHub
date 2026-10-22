/**
 * IndexedDB 历史任务存储
 * - tasks 存储任务元数据（提示词、时间、收藏状态、缩略图等）
 * - images 存储图片原始 Blob，读取后可直接保存到本地，无需再次下载
 */

const DB_NAME = 'seedhub_history'
const DB_VERSION = 1
const TASK_STORE = 'tasks'
const IMAGE_STORE = 'images'

const MAX_HISTORY_TASKS = 100

let dbPromise = null

function getIndexedDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null
  }

  return window.indexedDB
}

function openDb() {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return Promise.reject(new Error('当前环境不支持 IndexedDB'))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDb.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(TASK_STORE)) {
          const taskStore = db.createObjectStore(TASK_STORE, { keyPath: 'id' })
          taskStore.createIndex('createdAt', 'createdAt')
          taskStore.createIndex('favorite', 'favorite')
        }

        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const imageStore = db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
          imageStore.createIndex('taskId', 'taskId')
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = null
        reject(request.error || new Error('打开 IndexedDB 失败'))
      }
    })
  }

  return dbPromise
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 事务已中止'))
  })
}

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function collectImageKeys(db, taskId) {
  const readTx = db.transaction(IMAGE_STORE, 'readonly')
  return requestToPromise(readTx.objectStore(IMAGE_STORE).index('taskId').getAllKeys(taskId))
}

async function removeTaskRecords(db, taskId) {
  const imageKeys = await collectImageKeys(db, taskId)
  const writeTx = db.transaction([TASK_STORE, IMAGE_STORE], 'readwrite')
  writeTx.objectStore(TASK_STORE).delete(taskId)
  const imageStore = writeTx.objectStore(IMAGE_STORE)
  imageKeys.forEach(key => imageStore.delete(key))
  await waitForTransaction(writeTx)
}

async function trimHistory() {
  const tasks = await getHistoryTasks()
  const removable = tasks.filter(task => !task.favorite)

  if (removable.length <= MAX_HISTORY_TASKS) {
    return
  }

  const db = await openDb()
  const overflow = removable.slice(MAX_HISTORY_TASKS)

  for (const task of overflow) {
    await removeTaskRecords(db, task.id)
  }
}

/**
 * 读取全部历史任务，按生成时间倒序
 * @returns {Promise<Object[]>}
 */
export async function getHistoryTasks() {
  const db = await openDb()
  const tx = db.transaction(TASK_STORE, 'readonly')
  const tasks = await requestToPromise(tx.objectStore(TASK_STORE).getAll())

  return tasks.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 读取指定任务的原始图片 Blob
 * @param {string} taskId
 * @returns {Promise<Object[]>}
 */
export async function getTaskImages(taskId) {
  const db = await openDb()
  const tx = db.transaction(IMAGE_STORE, 'readonly')
  const images = await requestToPromise(tx.objectStore(IMAGE_STORE).index('taskId').getAll(taskId))

  return images.sort((a, b) => a.index - b.index)
}

/**
 * 把单张图片的 Blob 补存入 IndexedDB（用于旧记录或首次缓存失败的记录）
 * @param {Object} payload
 * @param {string} payload.taskId
 * @param {number} payload.index
 * @param {Blob} payload.blob
 * @param {Blob|null} payload.thumbnail
 * @param {string} payload.mimeType
 */
export async function saveTaskImageBlob({ taskId, index, blob, thumbnail, mimeType }) {
  if (!taskId || !blob) {
    return
  }

  const db = await openDb()
  const readTx = db.transaction(TASK_STORE, 'readonly')
  const task = await requestToPromise(readTx.objectStore(TASK_STORE).get(taskId))

  if (!task) {
    return
  }

  const nextImages = (task.images || []).map(image => {
    if (image.index !== index) {
      return image
    }

    return {
      ...image,
      mimeType: mimeType || image.mimeType,
      thumbnail: thumbnail || image.thumbnail || null
    }
  })

  const writeTx = db.transaction([TASK_STORE, IMAGE_STORE], 'readwrite')
  writeTx.objectStore(TASK_STORE).put({ ...task, images: nextImages })
  writeTx.objectStore(IMAGE_STORE).put({
    id: `${taskId}:${index}`,
    taskId,
    index,
    blob,
    mimeType: mimeType || blob.type || 'image/png'
  })

  await waitForTransaction(writeTx)
}

/**
 * 保存图片生成任务
 * @param {Object} payload
 * @param {string} payload.prompt
 * @param {string} payload.model
 * @param {string} payload.modelLabel
 * @param {Object} payload.settings
 * @param {Array<{url: string, blob: Blob|null, thumbnail: Blob|null, mimeType: string}>} payload.images
 * @returns {Promise<string|null>} 任务 id
 */
export async function saveImageTask({ prompt, model, modelLabel, settings, images }) {
  const sourceImages = Array.isArray(images) ? images.filter(image => image && image.url) : []
  if (sourceImages.length === 0) {
    return null
  }

  const db = await openDb()
  const id = createTaskId()
  const createdAt = Date.now()

  const imageMeta = sourceImages.map((image, index) => ({
    index,
    url: image.url,
    mimeType: image.mimeType || (image.blob ? image.blob.type : ''),
    thumbnail: image.thumbnail || null
  }))

  const tx = db.transaction([TASK_STORE, IMAGE_STORE], 'readwrite')
  tx.objectStore(TASK_STORE).put({
    id,
    type: 'image',
    prompt: prompt || '',
    model,
    modelLabel,
    settings: settings || {},
    createdAt,
    favorite: 0,
    imageCount: sourceImages.length,
    images: imageMeta,
    video: null
  })

  const imageStore = tx.objectStore(IMAGE_STORE)
  sourceImages.forEach((image, index) => {
    if (!image.blob) {
      return
    }

    imageStore.put({
      id: `${id}:${index}`,
      taskId: id,
      index,
      blob: image.blob,
      mimeType: image.mimeType || image.blob.type || 'image/png'
    })
  })

  await waitForTransaction(tx)
  await trimHistory()

  return id
}

/**
 * 保存视频生成任务（视频本身保留远程链接，仅缓存缩略图）
 * @param {Object} payload
 * @returns {Promise<string|null>}
 */
export async function saveVideoTask({ prompt, model, modelLabel, settings, video }) {
  if (!video || !video.url) {
    return null
  }

  const db = await openDb()
  const id = createTaskId()
  const createdAt = Date.now()

  const tx = db.transaction(TASK_STORE, 'readwrite')
  tx.objectStore(TASK_STORE).put({
    id,
    type: 'video',
    prompt: prompt || '',
    model,
    modelLabel,
    settings: settings || {},
    createdAt,
    favorite: 0,
    imageCount: 0,
    images: [],
    video: {
      url: video.url,
      resolution: video.resolution || '',
      ratio: video.ratio || '',
      duration: video.duration ?? null,
      framespersecond: video.framespersecond ?? null,
      thumbnail: video.thumbnail || null,
      thumbnailUrl: video.thumbnailUrl || ''
    }
  })

  await waitForTransaction(tx)
  await trimHistory()

  return id
}

/**
 * 切换任务收藏状态
 * @param {string} taskId
 * @returns {Promise<number|null>} 新的收藏状态（1 收藏 / 0 未收藏）
 */
export async function toggleTaskFavorite(taskId) {
  const db = await openDb()
  const readTx = db.transaction(TASK_STORE, 'readonly')
  const task = await requestToPromise(readTx.objectStore(TASK_STORE).get(taskId))

  if (!task) {
    return null
  }

  const nextFavorite = task.favorite ? 0 : 1
  const writeTx = db.transaction(TASK_STORE, 'readwrite')
  writeTx.objectStore(TASK_STORE).put({ ...task, favorite: nextFavorite })
  await waitForTransaction(writeTx)

  return nextFavorite
}

/**
 * 删除单条历史任务及其图片
 * @param {string} taskId
 */
export async function deleteHistoryTask(taskId) {
  const db = await openDb()
  await removeTaskRecords(db, taskId)
}

/**
 * 清空历史任务（默认保留收藏任务）
 * @param {Object} options
 * @param {boolean} options.includeFavorites 是否同时清空收藏
 * @returns {Promise<number>} 删除数量
 */
export async function clearHistoryTasks({ includeFavorites = false } = {}) {
  const tasks = await getHistoryTasks()
  const targets = includeFavorites ? tasks : tasks.filter(task => !task.favorite)

  if (targets.length === 0) {
    return 0
  }

  const db = await openDb()
  for (const task of targets) {
    await removeTaskRecords(db, task.id)
  }

  return targets.length
}
