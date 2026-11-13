# Seedream 5.5 接入说明

本文说明本次在 SeedHub 中接入 BytePlus ModelArk `Seedream 5.5` 图片生成模型所做的适配，包括新增能力、界面用法、参数映射、限制与前端改动位置。

## 1. 基本信息

| 项目 | 值 |
| --- | --- |
| 模型 ID | `dola-seedream-5-5-261028` |
| 接口 | `POST https://{endpoint}/api/v3/images/generations` |
| 默认 Endpoint | `ark.ap-southeast.bytepluses.com` |
| 认证 | `Authorization: Bearer <API Key>` |
| 默认输出尺寸 | `2K` |
| 默认输出格式 | `png` |
| 默认透明度 | `auto` |
| 参考图上限 | 10 张 |

> Seedream 5.5 属于 BytePlus 国际站模型（`dola-` 前缀），默认使用 `ap-southeast` Endpoint。若改用火山引擎国内站，需确认模型 ID 与开通区域是否一致。

## 2. 能力对比

| 能力 | Seedream 5.5 | 说明 |
| --- | --- | --- |
| 文生图 / 图生图 | 支持 | 最多 10 张参考图 |
| 图层拆分 | 支持 | 1 张输入图 → 1 张底图 + 最多 99 个图层 |
| 富文本 OCR | 支持 | 仅图层拆分模式，可返回文字内容与样式 |
| 原生 RGBA | 支持 | `background: transparent`，文生图 / 图生图均可 |
| 输出格式 | PNG / JPEG | 默认 PNG |
| 批量连续生图 | 不支持 | 不能传 `sequential_image_generation` |
| 流式输出 | 不支持 | `stream` 仅 5.0 Lite / 4.5 / 4.0 支持 |
| 自定义宽高 | 支持 | `宽x高`，总像素需在 `[921600, 4624220]`，宽高比 `[1/16, 16]` |
| 分辨率档位 | 1K / 1.5K / 2K | 图层拆分额外支持 `auto` |

## 3. 界面使用说明

### 3.1 选择模型

在“模型”下拉框选择 **SeedReam 5.5**，页面会出现“SeedReam 5.5 新能力”设置区。

### 3.2 普通图片生成

1. 填写提示词（必填）。
2. 可添加 1-10 张参考图片。
3. 选择分辨率档位：`1K` / `1.5K` / `2K`；也可以直接输入 `宽x高`。
4. 选择输出格式：
   - `png`：默认，支持透明通道。
   - `jpeg`：体积更小，但**不能**与 `transparent` 同时使用。
5. 选择透明度：
   - `auto`：由模型根据提示词和输出格式决定。
   - `transparent`：生成带 Alpha 通道的 RGBA 图片，结果区会显示棋盘格背景。
   - `opaque`：生成不带 Alpha 通道的 RGB 图片。
6. 可选填写 `safety_identifier`：用于内容安全检测的稳定用户标识，不超过 64 个字符，建议传哈希值。
7. 水印开关与其他模型一致。

### 3.3 图层拆分

1. 勾选“图层拆分”。
2. 上传或填写**且仅填写 1 张**参考图片。
3. 提示词可选：
   - 留空时，模型会自动识别图片中的主要元素并拆分。
   - 填写时可描述希望如何拆分，例如“将人物、背景、标题文字分别拆成独立图层”。
4. 设置“最大输出图片数（含底图）”，范围 2-100，默认 30。数值越大通常拆分越细，但会按该值预扣配额。
5. 可勾选“返回富文本 OCR”：
   - 开启后，文字图层会返回文字内容、行信息、包围盒以及粗体 / 斜体 / 下划线 / 删除线 / 阴影 / 半透明等样式。
   - 仅 Seedream 5.5 支持该选项。
6. 图层模式下：
   - 尺寸默认 `auto`，也可选 `1K` / `1.5K` / `2K`。
   - “透明度”参数会被禁用，因为图层拆分不允许传 `background`，图层固定为带 Alpha 的 PNG。
   - 输出格式只影响底图，图层始终为 PNG。

图层结果会按 `z_index` 从小到大排列（底图在前），每张图下方显示图层名称、描述、`z_index`、实际尺寸和格式；含透明通道的图层会以棋盘格为底显示。

## 4. 参数映射

| 界面项 | 请求字段 | 说明 |
| --- | --- | --- |
| 模型 | `model` | `dola-seedream-5-5-261028` |
| 提示词 | `prompt` | 普通模式必填；图层模式可省略 |
| 参考图片 | `image` | 字符串或字符串数组；图层模式只取第 1 张 |
| 分辨率 | `size` | `1K` / `1.5K` / `2K` / `auto`（仅图层）/ `宽x高` |
| 最大图片数量 | `sequential_image_generation_options.max_images` | **5.5 不发送**，界面已隐藏 |
| 水印 | `watermark` | 默认 `true` |
| 图层拆分 | `layer_decomposition` | 勾选后为 `true` |
| 最大输出图片数 | `layer_decomposition_options.max_images` | 2-100，默认 30 |
| 富文本 OCR | `layer_decomposition_options.text_recognition` | 布尔值 |
| 输出格式 | `output_format` | `png` / `jpeg` |
| 透明度 | `background` | `auto` / `transparent` / `opaque`；图层模式不发送 |
| 安全标识 | `safety_identifier` | 可选，≤64 字符 |

请求构建逻辑位于 `src/App.vue` 的 `buildImageRequestData`。

## 5. 请求示例

### 5.1 文生图（原生 RGBA）

```json
{
  "model": "dola-seedream-5-5-261028",
  "prompt": "一只半透明的玻璃质感的蝴蝶，纯色背景，适合抠图",
  "size": "2K",
  "output_format": "png",
  "background": "transparent",
  "watermark": false,
  "response_format": "url"
}
```

### 5.2 图生图（最多 10 张参考图）

```json
{
  "model": "dola-seedream-5-5-261028",
  "prompt": "将图一的角色放入图二的场景中，保持角色五官和服装一致",
  "image": [
    "https://example.com/character.png",
    "https://example.com/scene.png"
  ],
  "size": "2K",
  "output_format": "jpeg",
  "background": "opaque",
  "watermark": true,
  "response_format": "url"
}
```

### 5.3 图层拆分 + 富文本 OCR

```json
{
  "model": "dola-seedream-5-5-261028",
  "image": ["https://example.com/poster.png"],
  "size": "auto",
  "response_format": "url",
  "watermark": false,
  "layer_decomposition": true,
  "layer_decomposition_options": {
    "max_images": 30,
    "text_recognition": true
  }
}
```

## 6. 响应处理

普通模式沿用原有逻辑：读取 `data[].url` / `revised_prompt` 并转存到 IndexedDB。

图层模式会额外读取并持久化以下字段：

| 响应字段 | 前端字段 | 用途 |
| --- | --- | --- |
| `z_index` | `layerIndex` | 图层顺序，底图为 0，数值越大越靠上 |
| `name` | `layerName` | 图层名称 |
| `description` | `layerDescription` | 图层内容描述 |
| `bounding_box` | `boundingBox` | 图层在原图中的位置和缩放比例 |
| `text_recognition` | `textRecognition` | 富文本 OCR 内容与样式 |
| `size` | `imageSize` | 实际输出尺寸 |
| `output_format` | `outputFormat` | 实际输出格式 |
| `background` | `transparent` | 是否含透明通道 |

透明图与图层的缩略图、预览图会以 PNG 重新编码，避免 Alpha 通道在本地转存时被 JPEG 压成黑色；结果区图片下方增加了棋盘格背景和图层信息展示。

## 7. 限制与校验

前端已增加以下校验：

1. **图层拆分只允许 1 张图片**，多于 1 张会直接提示错误。
2. **`output_format=jpeg` 与 `background=transparent` 不能同时使用**，提交前会提示。
3. **5.5 不发送** `sequential_image_generation` / `sequential_image_generation_options`，避免请求报错。
4. **图层模式不发送** `background`，避免请求报错。
5. 图层模式提示词可留空。
6. `layer_decomposition_options.max_images` 会被限制在 `[2, 100]`。

官方其他限制：

- 图层拆分输入图片需为 PNG / JPEG，且只支持单张。
- 任一图层生成失败会导致整个请求失败，不支持部分成功。
- 图层拆分模式下 `max_images` 会按上限预扣 IPM，实际生成较少时会返还差额。
- 参考图单张最大 30 MB，宽高需大于 14 px，总像素不超过 3600 万。
- 5.5 的 `size` 分辨率档位只支持 `1K` / `1.5K` / `2K`；图层模式才支持 `auto`。
- `auto` 会跟随原图尺寸：低于 1K 按 1K 输出，高于 2K 按 2K 输出，中间范围保持原尺寸。
- 5.5 不支持流式输出和连续生图。

## 8. 本次代码改动

| 文件 | 改动 |
| --- | --- |
| `src/App.vue` | 新增 5.5 模型选项、尺寸档位、参考图上限 10 张 |
| `src/App.vue` | 新增“SeedReam 5.5 新能力”设置区：图层拆分、OCR、输出格式、透明度、`safety_identifier` |
| `src/App.vue` | `buildImageRequestData` 适配新参数，并处理 5.5 不支持连续生图的限制 |
| `src/App.vue` | 新增图层拆分校验、JPEG + 透明背景冲突校验 |
| `src/App.vue` | 结果区展示图层名称 / 描述 / `z_index` / 尺寸 / 格式 / OCR，并按 `z_index` 排序 |
| `src/App.vue` | 生成表单与历史任务的读写增加新字段 |
| `src/utils/taskDb.js` | 缩略图 / 预览图支持保留 Alpha；收藏快照持久化图层元数据 |
| `src/style.css` | 新增透明图预览棋盘格样式 `.bg-checkerboard` |

## 9. 测试建议

1. 文生图：`1K` / `1.5K` / `2K` 各生成一次，确认尺寸与格式。
2. 透明背景：`png + transparent` 生成后用图片查看器确认 Alpha 通道；结果区应显示棋盘格。
3. 格式冲突：选择 `jpeg + transparent`，确认提交被拦截并提示。
4. 参考图上限：确认可添加至 10 张，第 11 张入口不出现。
5. 图层拆分：
   - 不填提示词生成一次，确认返回底图 + 多图层。
   - 填提示词生成一次，确认按描述拆分。
   - 传 2 张图片，确认前端拦截。
   - 修改 `max_images` 为 2 与 100，确认结果数量与预扣逻辑正常。
6. 富文本 OCR：开启后确认结果区出现“富文本 OCR”折叠面板，文字与样式正常展示。
7. 历史记录：刷新页面后确认图层信息、透明预览图和收藏任务仍然完整。
