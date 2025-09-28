/**
 * Cookie存储工具函数
 * 用于保存和读取用户输入的表单数据
 */

const STORAGE_KEY = 'seedhub_form_data'
const COOKIE_EXPIRES_DAYS = 30

/**
 * 设置Cookie
 * @param {string} name Cookie名称
 * @param {string} value Cookie值
 * @param {number} days 过期天数
 */
export function setCookie(name, value, days = COOKIE_EXPIRES_DAYS) {
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

/**
 * 获取Cookie
 * @param {string} name Cookie名称
 * @returns {string|null} Cookie值
 */
export function getCookie(name) {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
  }
  return null
}

/**
 * 删除Cookie
 * @param {string} name Cookie名称
 */
export function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

/**
 * 保存表单数据到Cookie
 * @param {Object} formData 表单数据对象
 */
export function saveFormData(formData) {
  try {
    // 保存所有表单数据，包括apiKey
    const dataToSave = {
      apiKey: formData.apiKey,
      apiEndpoint: formData.apiEndpoint,
      model: formData.model,
      prompt: formData.prompt,
      imageUrls: formData.imageUrls,
      size: formData.size,
      maxImages: formData.maxImages,
      watermark: formData.watermark
    }
    
    const jsonString = JSON.stringify(dataToSave)
    setCookie(STORAGE_KEY, jsonString)
    console.log('✅ 表单数据已保存到Cookie')
  } catch (error) {
    console.error('❌ 保存表单数据失败:', error)
  }
}

/**
 * 从Cookie读取表单数据
 * @returns {Object|null} 表单数据对象
 */
export function loadFormData() {
  try {
    const jsonString = getCookie(STORAGE_KEY)
    if (jsonString) {
      const formData = JSON.parse(jsonString)
      console.log('✅ 从Cookie加载表单数据成功')
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
    deleteCookie(STORAGE_KEY)
    console.log('✅ 表单数据已清除')
  } catch (error) {
    console.error('❌ 清除表单数据失败:', error)
  }
}

/**
 * 检查是否有保存的表单数据
 * @returns {boolean} 是否存在保存的数据
 */
export function hasFormData() {
  return getCookie(STORAGE_KEY) !== null
}