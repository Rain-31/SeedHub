export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // 获取请求体
    const formData = new FormData()
    
    // 处理文件上传
    if (req.body && req.body.file) {
      formData.append('file', req.body.file)
    } else {
      // 如果是multipart/form-data，需要特殊处理
      const chunks = []
      req.on('data', chunk => chunks.push(chunk))
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks)
          
          // 转发请求到Telegraph API
          const response = await fetch('https://telegraph-image-92x.pages.dev/upload', {
            method: 'POST',
            body: buffer,
            headers: {
              'Content-Type': req.headers['content-type']
            }
          })

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          res.status(200).json(data)
        } catch (error) {
          console.error('Upload error:', error)
          res.status(500).json({ error: 'Upload failed', details: error.message })
        }
      })
      return
    }

    // 如果有直接的文件数据，转发到Telegraph API
    const response = await fetch('https://telegraph-image-92x.pages.dev/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    res.status(200).json(data)

  } catch (error) {
    console.error('Upload proxy error:', error)
    res.status(500).json({ error: 'Upload failed', details: error.message })
  }
}