export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const targetUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    res.status(400).json({ error: 'Invalid url' })
    return
  }

  try {
    const imageResponse = await fetch(targetUrl, { redirect: 'follow' })

    if (!imageResponse.ok) {
      res.status(imageResponse.status).json({ error: 'Fetch image failed' })
      return
    }

    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.toLowerCase().startsWith('image/')) {
      res.status(415).json({ error: 'Target is not an image' })
      return
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(502).json({ error: 'Image proxy failed' })
  }
}
