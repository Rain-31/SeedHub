# 部署教程

本教程将详细指导你如何将 SeedHub 项目部署到不同平台，每一步都不会遗漏。

## 部署到Vercel（推荐，完美解决CORS问题）

Vercel提供了serverless函数来代理API请求，完美解决了CORS跨域问题，无需用户安装任何浏览器扩展。

### 步骤：

1. **准备Vercel账号**
   - 访问 [vercel.com](https://vercel.com) 注册账号
   - 连接你的GitHub账号

2. **部署项目**
   - 在Vercel控制台点击"New Project"
   - 选择你的SeedHub仓库
   - 保持默认设置，点击"Deploy"

3. **自动配置**
   - Vercel会自动识别 `vercel.json` 配置
   - API请求会自动重写到serverless函数
   - 无需手动配置环境变量

4. **访问应用**
   - 部署完成后，Vercel会提供一个域名
   - 访问该域名即可使用应用，完全无CORS问题

### 优势：
- ✅ 自动解决CORS跨域问题
- ✅ 用户无需安装浏览器扩展
- ✅ 支持serverless函数
- ✅ 自动HTTPS
- ✅ 全球CDN加速
- ✅ 免费额度充足

## 🔧 故障排除

### 部署失败
- 检查 Vercel 构建日志
- 确保 `package.json` 中的脚本正确

### API 调用失败
- 检查 API Key 是否正确
- 查看浏览器控制台的错误信息

## 📝 后续维护

### 更新代码
```bash
# 修改代码后
git add .
git commit -m "描述你的修改"
git push
```

Vercel 会自动检测到新的提交并触发重新部署。

记得妥善保管你的 API Key，不要在代码中硬编码！
