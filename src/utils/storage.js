/**
 * localStorage 存储工具函数
 * 用于保存表单数据和最近的 prompt 历史
 */

const FORM_STORAGE_KEY = 'seedhub_form_data'
const TASK_HISTORY_STORAGE_KEY = 'seedhub_prompt_history'
const VIDEO_TASK_STORAGE_KEY = 'seedhub_video_task_id'

export const MAX_TASK_HISTORY_ITEMS = 100

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.error('❌ localStorage 不可用:', error)
    return null
  }
}

function setItem(key, value) {
  const storage = getStorage()
  if (!storage) {
    return false
  }

  storage.setItem(key, value)
  return true
}

function getItem(key) {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  return storage.getItem(key)
}

function removeItem(key) {
  const storage = getStorage()
  if (!storage) {
    return false
  }

  storage.removeItem(key)
  return true
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 保存表单数据到 localStorage
 * @param {Object} formData 表单数据对象
 */
export function saveFormData(formData) {
  try {
    const validImageUrls = Array.isArray(formData.imageUrls)
      ? formData.imageUrls.filter(url => url && url.trim())
      : []

    const dataToSave = {
      apiKey: formData.apiKey,
      apiEndpoint: formData.apiEndpoint,
      model: formData.model,
      prompt: formData.prompt,
      imageUrls: validImageUrls,
      size: formData.size,
      maxImages: formData.maxImages,
      watermark: formData.watermark,
      ratio: formData.ratio,
      duration: formData.duration,
      generateAudio: formData.generateAudio
    }

    const jsonString = JSON.stringify(dataToSave)
    if (setItem(FORM_STORAGE_KEY, jsonString)) {
      console.log('✅ 表单数据已保存到 localStorage')
    }
  } catch (error) {
    console.error('❌ 保存表单数据失败:', error)
  }
}

/**
 * 从 localStorage 读取表单数据
 * @returns {Object|null} 表单数据对象
 */
export function loadFormData() {
  try {
    const jsonString = getItem(FORM_STORAGE_KEY)
    if (jsonString) {
      const formData = JSON.parse(jsonString)
      console.log('✅ 从 localStorage 加载表单数据成功')
      return formData
    }

    return null
  } catch (error) {
    console.error('❌ 读取表单数据失败:', error)
    return null
  }
}

/**
 * 清除保存的表单数据
 */
export function clearFormData() {
  try {
    if (removeItem(FORM_STORAGE_KEY)) {
      console.log('✅ 表单数据已清除')
    }
  } catch (error) {
    console.error('❌ 清除表单数据失败:', error)
  }
}

/**
 * 检查是否有保存的表单数据
 * @returns {boolean} 是否存在保存的数据
 */
export function hasFormData() {
  return getItem(FORM_STORAGE_KEY) !== null
}

/**
 * 读取最近的 prompt 历史
 * @returns {string[]} prompt 列表
 */
export function loadTaskHistory() {
  try {
    const jsonString = getItem(TASK_HISTORY_STORAGE_KEY)
    if (!jsonString) {
      return []
    }

    const history = JSON.parse(jsonString)
    return Array.isArray(history) ? history.filter(item => normalizeText(item)) : []
  } catch (error) {
    console.error('❌ 读取任务历史失败:', error)
    return []
  }
}

/**
 * 新增一个 prompt 到历史记录，重复 prompt 会前移到顶部
 * @param {string} prompt 提示词
 * @returns {string[]} 最新历史记录
 */
export function addTaskPrompt(prompt) {
  try {
    const normalizedPrompt = normalizeText(prompt)
    if (!normalizedPrompt) {
      return loadTaskHistory()
    }

    const nextHistory = [
      normalizedPrompt,
      ...loadTaskHistory().filter(item => item !== normalizedPrompt)
    ].slice(0, MAX_TASK_HISTORY_ITEMS)

    if (setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))) {
      console.log('✅ 任务历史已更新')
    }

    return nextHistory
  } catch (error) {
    console.error('❌ 保存任务历史失败:', error)
    return loadTaskHistory()
  }
}

/**
 * 清空任务历史
 */
export function clearTaskHistory() {
  try {
    if (removeItem(TASK_HISTORY_STORAGE_KEY)) {
      console.log('✅ 任务历史已清除')
    }
  } catch (error) {
    console.error('❌ 清除任务历史失败:', error)
  }
}

export function saveVideoTaskId(taskId) {
  try {
    const normalizedTaskId = normalizeText(taskId)
    if (!normalizedTaskId) {
      return false
    }

    if (setItem(VIDEO_TASK_STORAGE_KEY, normalizedTaskId)) {
      console.log('✅ 视频任务 ID 已保存')
      return true
    }

    return false
  } catch (error) {
    console.error('❌ 保存视频任务 ID 失败:', error)
    return false
  }
}

export function loadVideoTaskId() {
  try {
    return normalizeText(getItem(VIDEO_TASK_STORAGE_KEY))
  } catch (error) {
    console.error('❌ 读取视频任务 ID 失败:', error)
    return ''
  }
}

export function clearVideoTaskId() {
  try {
    if (removeItem(VIDEO_TASK_STORAGE_KEY)) {
      console.log('✅ 视频任务 ID 已清除')
    }
  } catch (error) {
    console.error('❌ 清除视频任务 ID 失败:', error)
  }
}