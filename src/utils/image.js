/**
 * 图片 Blob 相关工具：抓取生成图片、生成缩略图、保存到本地
 */

/**
 * 获取图片二进制内容
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export async function fetchImageBlob(url) {
  if (!url) {
    throw new Error('图片地址为空')
  }

  const response = await fetch(url, {
    mode: 'cors',
    credentials: 'omit'
  })

  if (!response.ok) {
    throw new Error(`图片获取失败: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}

function loadImageSource(blob) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob)
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片解码失败'))
    }
    image.src = objectUrl
  })
}

/**
 * 生成用于历史列表展示的小尺寸缩略图
 * @param {Blob} blob
 * @param {number} maxSize 最长边像素
 * @returns {Promise<Blob|null>}
 */
export async function createThumbnailBlob(blob, maxSize = 320) {
  if (!blob) {
    return null
  }

  try {
    const source = await loadImageSource(blob)
    const width = source.width || 0
    const height = source.height || 0

    if (!width || !height) {
      return null
    }

    const scale = Math.min(1, maxSize / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.drawImage(source, 0, 0, canvas.width, canvas.height)

    if (typeof source.close === 'function') {
      source.close()
    }

    return await new Promise(resolve => {
      canvas.toBlob(thumbnail => resolve(thumbnail), 'image/jpeg', 0.82)
    })
  } catch (error) {
    console.warn('⚠️ 生成缩略图失败:', error)
    return null
  }
}

/**
 * 直接使用 Blob 保存到本地（不发起网络下载）
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  if (!blob) {
    return
  }

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}
