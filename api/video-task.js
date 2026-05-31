export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Endpoint, X-Target-Host')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const authorization = req.headers.authorization
    if (!authorization) {
      res.status(401).json({ error: 'Authorization header is required' })
      return
    }

    const taskId = req.query.id
    if (!taskId) {
      res.status(400).json({ error: 'Task id is required' })
      return
    }

    const apiEndpoint = req.headers['x-target-host'] ||
      req.headers['x-api-endpoint'] ||
      'ark.ap-southeast.bytepluses.com'

    const response = await fetch(`https://${apiEndpoint}/api/v3/contents/generations/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      }
    })

    const rawText = await response.text()
    const data = rawText ? JSON.parse(rawText) : {}

    if (!response.ok) {
      res.status(response.status).json(data)
      return
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Video task proxy error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}