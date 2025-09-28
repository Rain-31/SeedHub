// Vercel Serverless Function for API Proxy
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Endpoint');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许POST请求
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 从请求头中获取Authorization
    const authorization = req.headers.authorization;
    if (!authorization) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    // 从请求头中获取API endpoint，如果没有则使用默认值
    const apiEndpoint = req.headers['x-api-endpoint'] || 'ark.cn-beijing.volces.com';
    
    // 构建完整的API URL
    const apiUrl = `https://${apiEndpoint}/api/v3/images/generations`;

    // 代理请求到火山引擎API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}