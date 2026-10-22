import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createProxyMiddleware } from 'http-proxy-middleware'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'custom-proxy',
      configureServer(server) {
        
        // 创建动态代理中间件
        const proxyMiddleware = createProxyMiddleware({
          // 路径过滤器 - 匹配所有以 /api 开头的请求
          pathFilter: '/api/**',
          target: 'https://ark.cn-beijing.volces.com', // 默认目标
          changeOrigin: true,
          secure: false,
          
          // 使用router函数实现动态路由
          router: (req) => {
            const targetHost = req.headers['x-target-host'];
            
            if (targetHost && targetHost.trim()) {
              const dynamicTarget = `https://${targetHost.trim()}`;
              return dynamicTarget;
            }
            
            return 'https://ark.cn-beijing.volces.com';
          },
          
          // 使用 on 对象配置事件监听器 (http-proxy-middleware 3.x 语法)
          on: {
            proxyReq: (proxyReq, req, res) => {
              
              // 确保Authorization头被正确传递
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
              }
              
            },
            
            proxyRes: (proxyRes, req, res) => {
              if (proxyRes.statusCode === 401) {
                console.log('❌ [PROXY_RES] 401错误详情:');
                console.log('   - x-error-code:', proxyRes.headers['x-error-code']);
                console.log('   - content-type:', proxyRes.headers['content-type']);
                
                // 读取响应体
                let body = '';
                proxyRes.on('data', (chunk) => {
                  body += chunk;
                });
                proxyRes.on('end', () => {
                  console.log('   - 响应体:', body);
                });
              }
            },
            
            error: (err, req, res) => {
              console.error('💥 [PROXY_ERROR] ===== 代理发生错误 =====');
              console.error('💥 [PROXY_ERROR] 代理错误:', err.message);
              console.error('💥 [PROXY_ERROR] 错误堆栈:', err.stack);
              console.error('💥 [PROXY_ERROR] 请求URL:', req.url);
              console.error('💥 [PROXY_ERROR] 目标主机:', req.headers['x-target-host']);
              console.error('💥 [PROXY_ERROR] ===== 错误处理完成 =====');
            }
          },
          
          // 日志级别
          logLevel: 'debug'
        });
        
        // 添加中间件来记录所有请求
        server.middlewares.use((req, res, next) => {
          next();
        });
        
        // 添加上传代理中间件
        server.middlewares.use('/api/upload', async (req, res, next) => {
          // 设置CORS头
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          // 处理预检请求
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          try {
            // 收集请求体数据
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', async () => {
              try {
                const buffer = Buffer.concat(chunks)
                
                // 转发请求到Telegraph API
                const fetch = (await import('node-fetch')).default
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
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify(data))
              } catch (error) {
                console.error('Upload error:', error)
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Upload failed', details: error.message }))
              }
            })
          } catch (error) {
            console.error('Upload proxy error:', error)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Upload failed', details: error.message }))
          }
        })
        
        // 同源图片代理：用于把远程生成图片抓取为 Blob 缓存到 IndexedDB
        server.middlewares.use('/api/image-proxy', async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const requestUrl = new URL(req.url, 'http://localhost')
          const targetUrl = requestUrl.searchParams.get('url')

          if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid url' }))
            return
          }

          try {
            const imageResponse = await fetch(targetUrl, { redirect: 'follow' })

            if (!imageResponse.ok) {
              res.statusCode = imageResponse.status
              res.end()
              return
            }

            const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream'
            if (!contentType.toLowerCase().startsWith('image/')) {
              res.statusCode = 415
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Target is not an image' }))
              return
            }

            const buffer = Buffer.from(await imageResponse.arrayBuffer())
            res.setHeader('Content-Type', contentType)
            res.setHeader('Content-Disposition', 'inline')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buffer)
          } catch (error) {
            console.error('Image proxy error:', error)
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Image proxy failed' }))
          }
        })

        // 将代理中间件应用到服务器
        server.middlewares.use(proxyMiddleware);
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true
    // 移除原有的proxy配置，使用自定义中间件替代
  }
})