# SeedHub - 火山引擎AI图片生成工具

基于火山引擎SeedDream API的AI图片生成工具，支持文本到图片和图片到图片的生成功能。

## 功能特性

- 🎨 **AI图片生成**: 基于火山引擎SeedDream模型生成高质量图片
- 🖼️ **参考图片**: 支持上传参考图片进行图片到图片的生成
- ⚙️ **灵活配置**: 支持多种图片尺寸和生成参数
- 📱 **响应式设计**: 适配桌面和移动设备
- 🚀 **GitHub Pages**: 一键部署到GitHub Pages

## 技术栈

- **前端框架**: Vue 3 + Vite
- **样式框架**: Tailwind CSS
- **HTTP客户端**: Axios
- **部署平台**: GitHub Pages
- **CI/CD**: GitHub Actions

## 快速开始

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd seedhub-github-pages
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量（可选）
项目已预配置环境变量，开发环境会自动使用代理。如需自定义，可修改 `.env` 文件：

```bash
# 开发环境 - 使用Vite代理（推荐）
VITE_API_BASE_URL=/api/v3/images/generations

# 或直接调用API（需要CORS扩展）
VITE_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations
```

### 4. 启动开发服务器
```bash
pnpm run dev
```

### 5. 构建项目
```bash
pnpm run build
```

## 部署到GitHub Pages

### 自动部署（推荐）

1. 将代码推送到GitHub仓库的`main`分支
2. GitHub Actions会自动构建并部署到GitHub Pages
3. 在仓库设置中启用GitHub Pages，选择`gh-pages`分支

### 手动部署

```bash
pnpm run deploy
```

## 使用说明

1. **获取API Key**: 在火山引擎控制台获取ARK API Key
2. **输入提示词**: 描述你想要生成的图片内容
3. **配置参数**: 选择图片尺寸、数量等参数
4. **添加参考图片**（可选）: 提供参考图片URL进行图片到图片生成
5. **生成图片**: 点击生成按钮开始创作

## API配置

本项目使用火山引擎SeedDream API，需要配置以下参数：

- **API Endpoint**: `https://ark.cn-beijing.volces.com/api/v3/images/generations`
- **Model**: `doubao-seedream-4-0-250828`
- **支持的图片尺寸**: 1K (1024x1024), 2K (2048x2048), 4K (4096x4096)

## 项目结构

```
seedhub-github-pages/
├── src/
│   ├── App.vue          # 主应用组件
│   ├── main.js          # 应用入口
│   └── style.css        # 全局样式
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions部署配置
├── public/              # 静态资源
├── index.html           # HTML模板
├── vite.config.js       # Vite配置
├── tailwind.config.js   # Tailwind配置
└── package.json         # 项目配置

```

## 注意事项

### CORS 跨域问题解决方案

由于浏览器的同源策略限制，直接从前端调用火山引擎API会遇到CORS跨域问题。本项目提供了统一的解决方案：

#### 🔧 统一环境配置

项目使用环境变量统一管理API地址，**开发和生产环境现在使用相同的配置方式**：

**开发环境**（`.env`）：
```bash
VITE_API_BASE_URL=/api/v3/images/generations  # 使用Vite代理
```

**生产环境**（`.env.production`）：
```bash
# 根据部署平台选择其中一种：

# GitHub Pages（需要CORS扩展）
VITE_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations

# Vercel部署
VITE_API_BASE_URL=/api/generate

# Netlify部署  
VITE_API_BASE_URL=/.netlify/functions/generate
```

#### 🚀 如何测试

1. **开发环境测试**：
   ```bash
   pnpm run dev  # 自动使用代理配置
   ```

2. **生产环境测试**：
   - **Vercel**：修改 `.env.production` 中的 `VITE_API_BASE_URL=/api/generate`
   - **Netlify**：修改 `.env.production` 中的 `VITE_API_BASE_URL=/.netlify/functions/generate`
   - **GitHub Pages**：保持默认配置，需要安装CORS浏览器扩展

#### 📝 部署说明

**方案A: Vercel部署（推荐）**
- 项目包含 `api/generate.js` 无服务器函数
- 部署后API调用会自动通过 `/api/generate` 路径
- 无需额外配置，开箱即用

**方案B: Netlify部署**
- 项目包含 `netlify/functions/generate.js` 函数
- 部署后API调用会自动通过 `/.netlify/functions/generate` 路径
- 无需额外配置，开箱即用

**方案C: GitHub Pages + 浏览器扩展**
- 安装CORS浏览器扩展（如CORS Unblock）
- 适合快速测试和演示

- 请妥善保管你的API Key，不要在代码中硬编码
- API调用可能产生费用，请注意使用量
- 生成的图片链接可能有时效性，建议及时保存

## 许可证

MIT License