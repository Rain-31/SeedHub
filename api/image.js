// Vercel Serverless Function: 同源图片代理
//
// 火山引擎返回的生成结果是一个「预签名临时地址」（默认 24 小时失效）。
// 浏览器 <img> 能直接显示它，但页面脚本 fetch 它需要对方返回 CORS 头；
// 很多图床/对象存储并没有配置，于是转存 IndexedDB 会静默失败——
// 任务记录里只剩这个临时地址，过期后大图、缩略图一起变成裂图。
//
// 这里提供同源代理，让前端可以稳定地把图片字节读回来并写入 IndexedDB。

const ALLOWED_HOST_PATTERNS = [
  /(^|\.)volces\.com$/i,
  /(^|\.)bytepluses\.com$/i,
  /(^|\.)byteimg\.com$/i,
  /(^|\.)ibyteimg\.com$/i,
  /(^|\.)telegraph-image-92x\.pages\.dev$/i
]

const MAX_IMAGE_BYTES = 40 * 1024 * 1024

// 大图（4K 常见 2~5MB）在慢网络下回传需要更长时间，别让函数提前被掐断
export const config = { maxDuration: 60 }

function isAllowedUrl(target) {
  if (!target) {
    return false
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return false
  }

  return ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(target.hostname))
}

function getRequestedUrl(req) {
  if (req.query && typeof req.query.url === 'string') {
    return req.query.url
  }

  try {
    return new URL(req.url, 'http://localhost').searchParams.get('url') || ''
  } catch (error) {
    return ''
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawUrl = getRequestedUrl(req)

  if (!rawUrl) {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }

  let target
  try {
    target = new URL(rawUrl)
  } catch (error) {
    res.status(400).json({ error: 'Invalid url parameter' })
    return
  }

  if (!isAllowedUrl(target)) {
    res.status(403).json({ error: 'Host not allowed' })
    return
  }

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/*,*/*;q=0.8'
      }
    })

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream responded ${upstream.status}` })
      return
    }

    const declaredLength = Number(upstream.headers.get('content-length') || 0)
    if (declaredLength > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: 'Image too large' })
      return
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
    // 临时签名地址本身会变，缓存一天足够，避免重复回源
    res.setHeader('Cache-Control', 'public, max-age=86400')
    if (declaredLength > 0) {
      res.setHeader('Content-Length', String(declaredLength))
    }
    res.statusCode = 200

    // 流式转发：不要在函数里把整张图缓冲完再返回。
    // 4K 图有 1~5MB，等整图下载完再回传会让首字节延迟大幅上升，
    // 慢网络下前端会先超时（之前 4K“保存失败”就是这么来的）。
    if (!upstream.body) {
      const buffer = Buffer.from(await upstream.arrayBuffer())
      res.end(buffer)
      return
    }

    const { Readable } = await import('node:stream')
    const { pipeline } = await import('node:stream/promises')
    const stream = Readable.fromWeb(upstream.body)

    // 必须等流真正写完再让 handler 返回，否则函数会被提前收尾，
    // 客户端只会收到被截断的半张图（表现为图片能打开但只剩一部分像素）
    await pipeline(stream, res).catch(error => {
      if (error && (error.code === 'ERR_STREAM_PREMATURE_CLOSE' || error.name === 'AbortError')) {
        return
      }
      console.error('Image proxy stream error:', error)
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    if (res.headersSent) {
      res.destroy(error)
      return
    }
    res.status(502).json({ error: 'Image proxy failed', message: error.message })
  }
}
