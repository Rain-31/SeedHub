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

## 部署到GitHub Pages（需要CORS扩展）

如果你仍然想使用GitHub Pages，需要用户安装CORS扩展。

## 📋 前置准备

- ✅ 已有 GitHub 账号
- ✅ 本地已安装 Git
- ✅ 项目代码已准备完毕

## 🚀 部署步骤

### 第一步：创建 GitHub 仓库

1. **登录 GitHub**
   - 访问 [github.com](https://github.com)
   - 使用你的账号登录

2. **创建新仓库**
   - 点击右上角的 `+` 号
   - 选择 `New repository`
   - 仓库名称：`seedhub-github-pages`（或你喜欢的名称）
   - 描述：`火山引擎AI图片生成工具 - Vue3 + GitHub Pages`
   - 设置为 `Public`（GitHub Pages 免费版需要公开仓库）
   - **不要**勾选 `Add a README file`
   - **不要**勾选 `.gitignore` 和 `license`
   - 点击 `Create repository`

### 第二步：初始化本地 Git 仓库

在项目根目录 `d:\project_seedhub` 中执行以下命令：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件到暂存区
git add .

# 创建第一次提交
git commit -m "Initial commit: SeedHub AI图片生成工具"

# 添加远程仓库地址（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/seedhub-github-pages.git

# 推送到 GitHub
git push -u origin main
```

### 第三步：配置 GitHub Pages

1. **进入仓库设置**
   - 在你的 GitHub 仓库页面
   - 点击 `Settings` 选项卡

2. **找到 Pages 设置**
   - 在左侧菜单中找到 `Pages`
   - 点击进入 Pages 设置页面

3. **配置部署源**
   - 在 `Source` 部分选择 `GitHub Actions`
   - 这将启用 GitHub Actions 自动部署

### 第四步：确认 GitHub Actions 工作流

项目已经包含了 `.github/workflows/deploy.yml` 文件，内容如下：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Get pnpm store directory
      id: pnpm-cache
      shell: bash
      run: |
        echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
        
    - name: Setup pnpm cache
      uses: actions/cache@v3
      with:
        path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
        key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
        restore-keys: |
          ${{ runner.os }}-pnpm-store-
          
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Build
      run: pnpm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

这个工作流会：
- 在每次推送到 `main` 分支时自动触发
- 使用 pnpm 安装依赖
- 构建项目
- 将构建结果部署到 GitHub Pages

### 第五步：触发首次部署

1. **推送代码触发部署测试**
   ```bash
   # 如果之前已经推送过，可以做一个小修改再推送
   git add .
   git commit -m "Enable GitHub Pages deployment"
   git push
   ```

2. **查看部署状态**
   - 在 GitHub 仓库页面点击 `Actions` 选项卡
   - 你会看到一个正在运行的工作流
   - 等待工作流完成（通常需要 2-5 分钟）

### 第六步：访问你的网站

1. **获取网站地址**
   - 部署完成后，在 `Settings` > `Pages` 中会显示网站地址
   - 地址格式：`https://你的用户名.github.io/seedhub-github-pages/`

2. **访问网站**
   - 点击提供的链接访问你的网站
   - 首次访问可能需要等待几分钟

### 第七步：配置 CORS 解决方案

由于 GitHub Pages 的限制，需要解决 CORS 问题：

1. **安装浏览器扩展**
   - Chrome: 搜索 "CORS Unblock" 或 "CORS Toggle"
   - Firefox: 搜索 "CORS Everywhere"
   - Edge: 搜索 "CORS Unblock"

2. **启用扩展**
   - 安装后点击扩展图标
   - 启用 CORS 解除限制
   - 刷新页面

3. **测试功能**
   - 输入你的火山引擎 API Key
   - 输入图片描述
   - 点击生成图片

## 🔧 故障排除

### 部署失败
- 检查 GitHub Actions 日志
- 确保 `package.json` 中的脚本正确
- 确认 `vite.config.js` 中的 `base` 配置

### 网站无法访问
- 等待 5-10 分钟让 DNS 生效
- 检查 GitHub Pages 设置是否正确
- 确认仓库是公开的

### API 调用失败
- 确保安装并启用了 CORS 浏览器扩展
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

### 自定义域名（可选）
1. 在仓库根目录创建 `CNAME` 文件
2. 文件内容写入你的域名：`your-domain.com`
3. 在域名提供商处配置 DNS 记录

## 🎉 完成！

现在你的 SeedHub 项目已经成功部署到 GitHub Pages！

- 🌐 网站地址：`https://你的用户名.github.io/seedhub-github-pages/`
- 🔄 自动部署：每次推送代码都会自动更新网站
- 💰 完全免费：GitHub Pages 提供免费托管服务

记得妥善保管你的 API Key，不要在代码中硬编码！