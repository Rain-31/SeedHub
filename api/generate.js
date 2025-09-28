// Vercel Serverless Function for API Proxy
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Endpoint, X-Target-Host');

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
    // 添加调试日志
    console.log('🔍 [VERCEL] Request headers:', Object.keys(req.headers));
    console.log('🔍 [VERCEL] Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔍 [VERCEL] X-Target-Host:', req.headers['x-target-host']);
    console.log('🔍 [VERCEL] X-API-Endpoint:', req.headers['x-api-endpoint']);

    // 从请求头中获取Authorization
    const authorization = req.headers.authorization;
    if (!authorization) {
      console.log('❌ [VERCEL] Missing Authorization header');
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    // 从请求头中获取API endpoint，支持多种头部格式
    const apiEndpoint = req.headers['x-target-host'] || 
                       req.headers['x-api-endpoint'] || 
                       'ark.ap-southeast.bytepluses.com';
    
    // 构建完整的API URL
    const apiUrl = `https://${apiEndpoint}/api/v3/images/generations`;
    
    console.log('🚀 [VERCEL] Proxying to:', apiUrl);
    console.log('🔑 [VERCEL] Using Authorization:', authorization.substring(0, 20) + '...');

    // 代理请求到火山引擎API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      },
      body: JSON.stringify(req.body)
    });

    console.log('📥 [VERCEL] Response status:', response.status);
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