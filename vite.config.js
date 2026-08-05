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