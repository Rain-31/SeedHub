<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-3xl font-bold text-gray-900">SeedHub</h1>
        <p class="text-gray-600 mt-1">基于火山引擎 SeedDream / Seedance 的 AI 图片与视频生成工具</p>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 左侧：输入表单 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900">{{ settingsTitle }}</h2>
            <button
              v-if="hasSavedData"
              @click="clearHistoryData"
              type="button"
              class="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
              title="清除保存的历史输入数据"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              清除历史
            </button>
          </div>
          
          <form @submit.prevent="generateImages" class="space-y-6">
            <!-- API Key -->
            <div>
              <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="apiKey"
                v-model="form.apiKey"
                type="text"
                placeholder="请输入火山引擎ARK API Key"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <!-- API Endpoint -->
            <div>
              <label for="apiEndpoint" class="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint
              </label>
              <input
                id="apiEndpoint"
                v-model="form.apiEndpoint"
                type="text"
                placeholder="例如: ark.ap-southeast.bytepluses.com"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p class="mt-1 text-sm text-gray-500">请输入火山引擎ARK API的域名部分</p>
            </div>
            <!-- 提示词 -->
            <div>
              <label for="prompt" class="block text-sm font-medium text-gray-700 mb-2">
                提示词
              </label>
              <textarea
                id="prompt"
                v-model="form.prompt"
                rows="4"
                :placeholder="promptPlaceholder"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              ></textarea>
            </div>

            <!-- 参考图片URL -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ mediaFieldLabel }}
              </label>
              <p class="mb-2 text-sm text-gray-500">{{ mediaFieldHint }}</p>
              <div class="space-y-2">
                <div
                  v-for="(url, index) in form.imageUrls"
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    v-model="form.imageUrls[index]"
                    type="url"
                    :placeholder="isVideoModel ? `图片 ${index + 1} URL` : `参考图片 ${index + 1} URL`"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    @click="uploadImage(index)"
                    :disabled="uploadingIndex === index"
                    class="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    title="上传图片"
                  >
                    <svg v-if="uploadingIndex === index" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    {{ uploadingIndex === index ? '上传中' : '上传' }}
                  </button>
                </div>
                <button
                  v-if="form.imageUrls.length < maxImageInputs"
                  type="button"
                  @click="addImageUrl"
                  class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  {{ addImageButtonText }}
                </button>
              </div>
            </div>

            <!-- 高级设置 -->
            <div class="border-t pt-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">高级设置</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- 模型选择 -->
                <div>
                  <label for="model" class="block text-sm font-medium text-gray-700 mb-2">
                    AI模型
                  </label>
                  <select
                    id="model"
                    v-model="form.model"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="doubao-seedream-4-0-250828">Doubao SeedReam 4.0</option>
                    <option value="seedream-4-0-250828">SeedReam 4.0</option>
                    <option value="seedream-4-5-251128">SeedReam 4.5</option>
                    <option value="doubao-seedream-4-5-251128">Doubao SeedReam 4.5</option>
                    <option value="seedream-5-0-260128">SeedReam 5.0 Lite</option>
                    <option value="dola-seedream-5-0-pro-260628">SeedReam 5.0 Pro</option>
                    <option value="dola-seedream-5-0-flash-260915">SeedReam 5.0 Flash</option>
                    <option value="dreamina-seedance-2-0-260128">Seedance 2.0</option>
                    <option value="seedance-1-5-pro-251215">Seedance 1.5 Pro</option>
                    <option value="seedance-1-0-pro-250528">Seedance 1.0 Pro</option>
                  </select>
                </div>

                <!-- 尺寸 / 分辨率 -->
                <div>
                  <label for="size" class="block text-sm font-medium text-gray-700 mb-2">
                    {{ sizeFieldLabel }}
                  </label>
                  <select
                    id="size"
                    v-model="form.size"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option
                      v-for="sizeOption in availableSizes"
                      :key="sizeOption.value"
                      :value="sizeOption.value"
                    >
                      {{ sizeOption.label }}
                    </option>
                  </select>
                </div>

                <!-- 最大图片数量 -->
                <div v-if="!isVideoModel">
                  <label for="maxImages" class="block text-sm font-medium text-gray-700 mb-2">
                    最大图片数量
                  </label>
                  <input
                    id="maxImages"
                    v-model.number="form.maxImages"
                    type="number"
                    min="1"
                    max="10"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div v-if="isVideoModel">
                  <label for="ratio" class="block text-sm font-medium text-gray-700 mb-2">
                    视频比例
                  </label>
                  <select
                    id="ratio"
                    v-model="form.ratio"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option
                      v-for="ratioOption in videoRatioOptions"
                      :key="ratioOption"
                      :value="ratioOption"
                    >
                      {{ ratioOption }}
                    </option>
                  </select>
                </div>

                <div v-if="isVideoModel">
                  <label for="duration" class="block text-sm font-medium text-gray-700 mb-2">
                    视频时长
                  </label>
                  <select
                    id="duration"
                    v-model.number="form.duration"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option
                      v-for="durationOption in videoDurationOptions"
                      :key="durationOption"
                      :value="durationOption"
                    >
                      {{ formatDurationOption(durationOption) }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- 水印选项 -->
              <div class="mt-4">
                <label class="flex items-center">
                  <input
                    v-model="form.watermark"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">添加水印</span>
                </label>
              </div>

              <div v-if="isVideoModel && supportsVideoAudio" class="mt-4">
                <label class="flex items-center">
                  <input
                    v-model="form.generateAudio"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">生成同步音频</span>
                </label>
              </div>

              <p v-else-if="isVideoModel" class="mt-4 text-sm text-gray-500">
                当前模型不支持生成同步音频。
              </p>
            </div>

            <!-- 提交按钮 -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loadingText }}
              </span>
              <span v-else>{{ submitButtonText }}</span>
            </button>
          </form>

          <div class="border-t pt-6 mt-6">
            <button
              type="button"
              @click="toggleTaskHistory"
              :aria-expanded="String(!isTaskHistoryCollapsed)"
              class="flex w-full items-start justify-between gap-4 rounded-lg px-1 py-1 text-left transition-colors hover:bg-gray-50"
            >
              <div>
                <h3 class="text-lg font-medium text-gray-900">历史任务</h3>
                <p class="mt-1 text-sm text-gray-500">
                  共 {{ historyTasks.length }} 条记录 · 点击条目查看生成结果
                </p>
              </div>
              <div class="flex items-center gap-2 pt-1 text-sm text-gray-500">
                <span>{{ isTaskHistoryCollapsed ? '展开' : '折叠' }}</span>
                <svg
                  class="h-5 w-5 transition-transform"
                  :class="isTaskHistoryCollapsed ? '-rotate-90' : 'rotate-0'"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </button>

            <div v-show="!isTaskHistoryCollapsed" class="mt-3">
              <div class="mb-3 inline-flex rounded-lg bg-gray-100 p-1 text-sm">
                <button
                  v-for="tab in historyTabs"
                  :key="tab.value"
                  type="button"
                  @click="switchHistoryTab(tab.value)"
                  class="rounded-md px-3 py-1.5 font-medium transition-colors"
                  :class="activeHistoryTab === tab.value ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                >
                  {{ tab.label }} ({{ tab.value === 'favorites' ? favoriteTasks.length : historyTasks.length }})
                </button>
              </div>

              <div v-if="displayedTasks.length > 0" class="space-y-2 max-h-96 overflow-y-auto pr-1">
                <div
                  v-for="task in displayedTasks"
                  :key="task.id"
                  role="button"
                  tabindex="0"
                  @click="selectHistoryTask(task)"
                  @keydown.enter="selectHistoryTask(task)"
                  class="w-full cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors"
                  :class="selectedTaskId === task.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex shrink-0 gap-1">
                      <template v-if="task.thumbnailUrls.length > 0">
                        <img
                          v-for="(thumb, thumbIndex) in task.thumbnailUrls"
                          :key="thumbIndex"
                          :src="thumb"
                          alt=""
                          class="h-14 w-14 rounded-md bg-gray-100 object-cover"
                        />
                      </template>
                      <div v-else class="flex h-14 w-14 items-center justify-center rounded-md bg-gray-100 text-gray-400">
                        <svg v-if="task.type === 'video'" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg v-else class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm text-gray-700" :title="task.prompt || '未填写提示词'">
                        {{ task.prompt || '未填写提示词' }}
                      </p>
                      <p class="mt-0.5 truncate text-xs text-gray-400">
                        {{ task.type === 'video' ? '视频' : `${task.imageCount} 张图片` }} · {{ task.modelLabel }}
                      </p>
                      <p class="mt-0.5 text-xs text-gray-400">{{ formatTaskTime(task.createdAt) }}</p>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        @click.stop="toggleFavoriteTask(task)"
                        class="rounded p-1 transition-colors"
                        :class="task.favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-500'"
                        :title="task.favorite ? '取消收藏' : '收藏任务'"
                      >
                        <svg class="h-5 w-5" :fill="task.favorite ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        @click.stop="removeHistoryTask(task)"
                        class="rounded p-1 text-gray-300 transition-colors hover:text-red-500"
                        title="删除记录"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                {{ activeHistoryTab === 'favorites' ? '还没有收藏任务，点击历史任务条目右侧的星标即可收藏。' : '提交生成任务后，生成结果会自动保存到这里。' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：结果展示 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">生成结果</h2>
          
          <!-- 错误信息 -->
          <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">生成失败</h3>
                <p class="mt-1 text-sm text-red-700">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- 当前查看的历史任务 -->
          <div v-if="activeResultTask" class="mb-4 rounded-md border border-primary-100 bg-primary-50 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-primary-700">
                历史任务 · {{ formatTaskTime(activeResultTask.createdAt) }}
              </p>
              <button
                type="button"
                @click="clearActiveResultTask"
                class="text-xs text-primary-600 transition-colors hover:text-primary-700"
              >
                关闭
              </button>
            </div>
            <p class="mt-1 truncate text-sm text-gray-600" :title="activeResultTask.prompt">
              {{ activeResultTask.prompt || '未填写提示词' }}
            </p>
          </div>

          <!-- 生成的图片 -->
          <div v-if="generatedImages.length > 0" class="space-y-4">
            <div
              v-for="(image, index) in generatedImages"
              :key="index"
              class="border border-gray-200 rounded-lg overflow-hidden"
            >
              <img
                :src="image.url"
                :alt="`生成的图片 ${index + 1}`"
                class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                @load="onImageLoad"
                @error="onImageError"
                @click="openImageModal(image.url, `生成的图片 ${index + 1}`)"
              />
              <div class="p-3 bg-gray-50">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">图片 {{ index + 1 }}</span>
                  <div class="flex items-center gap-3">
                    <button
                      v-if="image.fromIndexedDb"
                      type="button"
                      @click="saveImageToLocal(image, index)"
                      class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      保存到本地
                    </button>
                    <a
                      :href="image.url"
                      target="_blank"
                      class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      查看原图
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 生成的视频 -->
          <div v-else-if="generatedVideo" class="space-y-4">
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <video
                :src="generatedVideo.url"
                controls
                playsinline
                class="w-full bg-black"
              ></video>

              <div class="p-4 bg-gray-50 space-y-4">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm font-medium text-gray-900">视频生成完成</p>
                    <p v-if="videoTask.id" class="text-xs text-gray-500">任务 ID: {{ videoTask.id }}</p>
                  </div>
                  <a
                    :href="generatedVideo.url"
                    target="_blank"
                    class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    打开视频
                  </a>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                    <p class="text-gray-400">状态</p>
                    <p class="mt-1 text-gray-700">{{ videoStatusText }}</p>
                  </div>
                  <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                    <p class="text-gray-400">分辨率</p>
                    <p class="mt-1 text-gray-700">{{ generatedVideo.resolution || '-' }}</p>
                  </div>
                  <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                    <p class="text-gray-400">比例</p>
                    <p class="mt-1 text-gray-700">{{ generatedVideo.ratio || '-' }}</p>
                  </div>
                  <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                    <p class="text-gray-400">时长</p>
                    <p class="mt-1 text-gray-700">{{ generatedVideo.duration ?? '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 视频任务状态 -->
          <div v-else-if="videoTask.id" class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-900">视频任务进行中</p>
                <p class="text-xs text-gray-500">任务 ID: {{ videoTask.id }}</p>
              </div>
              <span class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {{ videoStatusText }}
              </span>
            </div>

            <p class="text-sm text-gray-600">
              已提交到 {{ videoModelLabel }}，页面会每 5 秒自动刷新一次任务状态。
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                <p class="text-gray-400">分辨率</p>
                <p class="mt-1 text-gray-700">{{ videoTask.resolution || '-' }}</p>
              </div>
              <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                <p class="text-gray-400">比例</p>
                <p class="mt-1 text-gray-700">{{ videoTask.ratio || '-' }}</p>
              </div>
              <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                <p class="text-gray-400">时长</p>
                <p class="mt-1 text-gray-700">{{ videoTask.duration ?? '-' }}</p>
              </div>
              <div class="rounded-md bg-white border border-gray-200 px-3 py-2">
                <p class="text-gray-400">音频</p>
                <p class="mt-1 text-gray-700">{{ videoAudioStatusText }}</p>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!loading" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">暂无生成结果</h3>
            <p class="mt-1 text-sm text-gray-500">{{ emptyStateText }}</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 图片放大模态框 -->
    <div
      v-if="modalImage.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
      @click="closeImageModal"
    >
      <div class="relative max-w-7xl max-h-full p-4">
        <!-- 关闭按钮 -->
        <button
          @click="closeImageModal"
          class="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <!-- 放大的图片 -->
        <img
          :src="modalImage.url"
          :alt="modalImage.alt"
          class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          @click.stop
        />
        
        <!-- 图片信息 -->
        <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-md text-sm">
          {{ modalImage.alt }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'
import {
  saveFormData,
  loadFormData,
  clearFormData,
  hasFormData,
  saveVideoTaskId,
  loadVideoTaskId,
  clearVideoTaskId
} from './utils/storage.js'
import {
  getHistoryTasks,
  getTaskImages,
  saveImageTask,
  saveVideoTask,
  toggleTaskFavorite,
  deleteHistoryTask,
  clearHistoryTasks
} from './utils/historyDb.js'
import { fetchImageBlob, createThumbnailBlob, downloadBlob } from './utils/image.js'

const IMAGE_DEFAULT_ENDPOINT = 'ark.ap-southeast.bytepluses.com'
const VIDEO_DEFAULT_ENDPOINT = 'ark.ap-southeast.bytepluses.com'
// Seedream 5.0 pro / flash 仅支持单图生成，不支持批量（sequential）生图，
// 传入 sequential_image_generation 会导致请求报错。
const MODELS_WITHOUT_SEQUENTIAL_GENERATION = [
  'dola-seedream-5-0-pro-260628',
  'dola-seedream-5-0-flash-260915'
]
const VIDEO_POLL_INTERVAL = 5000
const VIDEO_MAX_POLL_ATTEMPTS = 60

const ALL_VIDEO_RATIOS = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9']
const STANDARD_VIDEO_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9']

function createDurationOptions(start, end, includeAuto = false) {
  const options = []

  if (includeAuto) {
    options.push(-1)
  }

  for (let value = start; value <= end; value += 1) {
    options.push(value)
  }

  return options
}

const VIDEO_MODELS = [
  {
    id: 'dreamina-seedance-2-0-260128',
    label: 'Seedance 2.0',
    resolutions: ['720p', '480p', '1080p'],
    defaultResolution: '720p',
    durationOptions: createDurationOptions(4, 15, true),
    defaultDuration: 5,
    ratioOptions: ALL_VIDEO_RATIOS,
    defaultRatio: '16:9',
    supportsGenerateAudio: true
  },
  {
    id: 'seedance-1-5-pro-251215',
    label: 'Seedance 1.5 Pro',
    resolutions: ['720p', '480p', '1080p'],
    defaultResolution: '720p',
    durationOptions: createDurationOptions(4, 12, true),
    defaultDuration: 5,
    ratioOptions: ALL_VIDEO_RATIOS,
    defaultRatio: '16:9',
    supportsGenerateAudio: true
  },
  {
    id: 'seedance-1-0-pro-250528',
    label: 'Seedance 1.0 Pro',
    resolutions: ['1080p', '720p', '480p'],
    defaultResolution: '1080p',
    durationOptions: createDurationOptions(2, 12),
    defaultDuration: 5,
    ratioOptions: STANDARD_VIDEO_RATIOS,
    defaultRatio: '16:9',
    supportsGenerateAudio: false
  }
]

const VIDEO_MODEL_MAP = Object.fromEntries(VIDEO_MODELS.map(model => [model.id, model]))

function getVideoModelConfig(modelId) {
  return VIDEO_MODEL_MAP[modelId] || null
}

function isVideoModelId(modelId) {
  return Boolean(getVideoModelConfig(modelId))
}

const VIDEO_STATUS_LABELS = {
  idle: '未开始',
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
  expired: '已过期',
  cancelled: '已取消'
}

const MODEL_LABELS = {
  'doubao-seedream-4-0-250828': 'Doubao Seedream 4.0',
  'seedream-4-0-250828': 'Seedream 4.0',
  'seedream-4-5-251128': 'Seedream 4.5',
  'doubao-seedream-4-5-251128': 'Doubao Seedream 4.5',
  'seedream-5-0-260128': 'Seedream 5.0 Lite',
  'dola-seedream-5-0-pro-260628': 'Seedream 5.0 Pro',
  'dola-seedream-5-0-flash-260915': 'Seedream 5.0 Flash',
  'dreamina-seedance-2-0-260128': 'Seedance 2.0',
  'seedance-1-5-pro-251215': 'Seedance 1.5 Pro',
  'seedance-1-0-pro-250528': 'Seedance 1.0 Pro'
}

function getModelLabel(modelId) {
  return MODEL_LABELS[modelId] || modelId || '未知模型'
}

export default {
  name: 'App',
  setup() {
    const loading = ref(false)
    const error = ref('')
    const generatedImages = ref([])
    const generatedVideo = ref(null)
    const historyTasks = ref([])
    const activeHistoryTab = ref('history')
    const selectedTaskId = ref('')
    const activeResultTask = ref(null)
    const isTaskHistoryCollapsed = ref(false)
    const hasSavedFormData = ref(hasFormData())

    const historyTabs = [
      { value: 'history', label: '历史' },
      { value: 'favorites', label: '收藏' }
    ]

    // 防止较早的保存任务覆盖用户当前正在查看的结果
    let generationToken = 0
    let thumbnailObjectUrls = []
    let resultObjectUrls = []
    
    // 图片上传状态
    const uploadingIndex = ref(-1)

    // 图片放大模态框状态
    const modalImage = reactive({
      show: false,
      url: '',
      alt: ''
    })

    const form = reactive({
      apiKey: '',
      apiEndpoint: IMAGE_DEFAULT_ENDPOINT,
      model: 'doubao-seedream-4-0-250828',
      prompt: '',
      imageUrls: ['', ''],
      size: '2K',
      maxImages: 3,
      watermark: true,
      ratio: '16:9',
      duration: 5,
      generateAudio: true
    })

    const videoTask = reactive({
      id: '',
      status: 'idle',
      resolution: '',
      ratio: '',
      duration: null,
      videoUrl: '',
      lastFrameUrl: '',
      framespersecond: null
    })

    const selectedVideoModel = computed(() => getVideoModelConfig(form.model))
    const isVideoModel = computed(() => Boolean(selectedVideoModel.value))
    const supportsVideoAudio = computed(() => Boolean(selectedVideoModel.value && selectedVideoModel.value.supportsGenerateAudio))
    const videoModelLabel = computed(() => selectedVideoModel.value ? selectedVideoModel.value.label : '视频模型')
    const videoRatioOptions = computed(() => selectedVideoModel.value ? selectedVideoModel.value.ratioOptions : [])
    const videoDurationOptions = computed(() => selectedVideoModel.value ? selectedVideoModel.value.durationOptions : [])
    const settingsTitle = computed(() => isVideoModel.value ? '视频生成设置' : '图片生成设置')
    const promptPlaceholder = computed(() => {
      return isVideoModel.value
        ? '描述你想要生成的视频场景，或仅上传图片作为首帧...'
        : '描述你想要生成的图片...'
    })
    const mediaFieldLabel = computed(() => {
      return isVideoModel.value ? '首帧 / 尾帧图片URL（可选）' : '参考图片URL（可选）'
    })
    const mediaFieldHint = computed(() => {
      return isVideoModel.value
        ? '可只填 1 张作为首帧，或填 2 张作为首帧和尾帧；也支持仅用提示词生成视频。'
        : '可直接输入图片 URL，或点击上传按钮上传本地图片。'
    })
    const addImageButtonText = computed(() => {
      return isVideoModel.value ? '+ 添加尾帧图片' : '+ 添加更多参考图片'
    })
    const sizeFieldLabel = computed(() => isVideoModel.value ? '视频分辨率' : '图片尺寸')
    const submitButtonText = computed(() => isVideoModel.value ? '生成视频' : '生成图片')
    const loadingText = computed(() => {
      return isVideoModel.value ? '生成中，正在轮询任务状态...' : '生成中...'
    })
    const emptyStateText = computed(() => isVideoModel.value ? '填写左侧表单开始生成视频' : '填写左侧表单开始生成图片')
    const maxImageInputs = computed(() => isVideoModel.value ? 2 : 5)
    const videoStatusText = computed(() => {
      return VIDEO_STATUS_LABELS[videoTask.status] || videoTask.status || VIDEO_STATUS_LABELS.idle
    })
    const videoAudioStatusText = computed(() => {
      if (!supportsVideoAudio.value) {
        return '不支持'
      }

      return form.generateAudio ? '开启' : '关闭'
    })

    // 计算可用的尺寸选项
    const availableSizes = computed(() => {
      if (isVideoModel.value) {
        return selectedVideoModel.value.resolutions.map(value => ({
          value,
          label: value
        }))
      }

      // 各图片模型支持的分辨率档位（参考火山引擎官方文档）
      // - Seedream 5.0 Pro: 1K、2K
      // - Seedream 5.0 Flash: 1K、1.5K、2K
      // - Seedream 5.0 Lite: 2K、3K、4K
      // - Seedream 4.5: 2K、4K
      // - Seedream 4.0: 1K、2K、4K
      if (form.model === 'dola-seedream-5-0-pro-260628') {
        return [
          { value: '1K', label: '1K (1024x1024)' },
          { value: '2K', label: '2K (2048x2048)' }
        ]
      } else if (form.model === 'dola-seedream-5-0-flash-260915') {
        return [
          { value: '1K', label: '1K (1024x1024)' },
          { value: '1.5K', label: '1.5K (1536x1536)' },
          { value: '2K', label: '2K (2048x2048)' }
        ]
      } else if (form.model === 'seedream-5-0-260128') {
        return [
          { value: '2K', label: '2K (2048x2048)' },
          { value: '3K', label: '3K (3072x3072)' },
          { value: '4K', label: '4K (4096x4096)' }
        ]
      } else if (form.model === 'seedream-4-5-251128' || form.model === 'doubao-seedream-4-5-251128') {
        return [
          { value: '2K', label: '2K (2048x2048)' },
          { value: '4K', label: '4K (4096x4096)' }
        ]
      } else {
        // Seedream 4.0 等其他模型支持 1K、2K、4K
        return [
          { value: '1K', label: '1K (1024x1024)' },
          { value: '2K', label: '2K (2048x2048)' },
          { value: '4K', label: '4K (4096x4096)' }
        ]
      }
    })

    const favoriteTasks = computed(() => historyTasks.value.filter(task => task.favorite))
    const displayedTasks = computed(() => {
      return activeHistoryTab.value === 'favorites' ? favoriteTasks.value : historyTasks.value
    })

    const hasSavedData = computed(() => {
      return hasSavedFormData.value || historyTasks.value.length > 0
    })

    // 防抖定时器
    let saveTimeout = null
    let pollTimer = null

    const revokeObjectUrls = (urls) => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.length = 0
    }

    const resetVideoTask = () => {
      Object.assign(videoTask, {
        id: '',
        status: 'idle',
        resolution: '',
        ratio: '',
        duration: null,
        videoUrl: '',
        lastFrameUrl: '',
        framespersecond: null
      })
    }

    const resetGenerationState = () => {
      generationToken += 1
      error.value = ''
      generatedImages.value = []
      generatedVideo.value = null
      activeResultTask.value = null
      selectedTaskId.value = ''
      revokeObjectUrls(resultObjectUrls)
      resetVideoTask()
    }

    const ensureMinimumImageInputs = () => {
      if (!Array.isArray(form.imageUrls)) {
        form.imageUrls = ['', '']
        return
      }

      while (form.imageUrls.length < 2) {
        form.imageUrls.push('')
      }
    }

    const applyModelDefaults = (model) => {
      const videoModelConfig = getVideoModelConfig(model)

      if (videoModelConfig) {
        form.imageUrls = Array.isArray(form.imageUrls) ? form.imageUrls.slice(0, 2) : []
        ensureMinimumImageInputs()

        if (!videoModelConfig.resolutions.includes(form.size)) {
          form.size = videoModelConfig.defaultResolution
        }

        if (!videoModelConfig.ratioOptions.includes(form.ratio)) {
          form.ratio = videoModelConfig.defaultRatio
        }

        if (!videoModelConfig.durationOptions.includes(form.duration)) {
          form.duration = videoModelConfig.defaultDuration
        }

        if (!videoModelConfig.supportsGenerateAudio) {
          form.generateAudio = false
        }

        if (!form.apiEndpoint.trim() || form.apiEndpoint === IMAGE_DEFAULT_ENDPOINT) {
          form.apiEndpoint = VIDEO_DEFAULT_ENDPOINT
        }

        return
      }

      ensureMinimumImageInputs()

      if (!availableSizes.value.map(item => item.value).includes(form.size)) {
        form.size = '2K'
      }
    }

    const getApiErrorMessage = (err) => {
      if (err.response) {
        const apiError = err.response.data && err.response.data.error

        if (typeof apiError === 'string') {
          return `API错误: ${apiError}`
        }

        if (apiError && apiError.message) {
          return `API错误: ${apiError.message}`
        }

        return `请求失败: ${err.response.status} ${err.response.statusText}`
      }

      if (err.request) {
        return '网络错误: 无法连接到服务器'
      }

      return err.message || '请求失败'
    }

    const buildRequestHeaders = () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${form.apiKey.trim()}`,
      'X-Target-Host': form.apiEndpoint.trim()
    })

    const applyVideoTaskData = (taskData) => {
      videoTask.id = taskData.id || videoTask.id
      videoTask.status = taskData.status || videoTask.status
      videoTask.resolution = taskData.resolution || videoTask.resolution
      videoTask.ratio = taskData.ratio || videoTask.ratio
      videoTask.duration = taskData.duration ?? videoTask.duration
      videoTask.videoUrl = taskData.content && taskData.content.video_url ? taskData.content.video_url : videoTask.videoUrl
      videoTask.lastFrameUrl = taskData.content && (taskData.content.last_frame_image_url || taskData.content.last_frame_url)
        ? (taskData.content.last_frame_image_url || taskData.content.last_frame_url)
        : videoTask.lastFrameUrl
      videoTask.framespersecond = taskData.framespersecond ?? videoTask.framespersecond
    }

    const waitForDelay = (duration) => {
      return new Promise(resolve => {
        pollTimer = window.setTimeout(resolve, duration)
      })
    }

    const setGeneratedVideo = (taskData) => {
      if (!taskData.content || !taskData.content.video_url) {
        throw new Error('视频结果中缺少 video_url')
      }

      generatedVideo.value = {
        url: taskData.content.video_url,
        resolution: taskData.resolution || form.size,
        ratio: taskData.ratio || form.ratio,
        duration: taskData.duration ?? form.duration,
        framespersecond: taskData.framespersecond ?? null
      }
    }

    const pollVideoTask = async (taskId, headers, attempt = 0) => {
      const response = await axios.get(`/api/v3/contents/generations/tasks/${taskId}`, {
        headers
      })

      const taskData = response.data
      applyVideoTaskData(taskData)

      if (taskData.status === 'succeeded') {
        clearVideoTaskId()
        return taskData
      }

      if (['failed', 'expired', 'cancelled'].includes(taskData.status)) {
        clearVideoTaskId()
        throw new Error(taskData.error && taskData.error.message ? taskData.error.message : `视频任务${videoStatusText.value}`)
      }

      if (attempt >= VIDEO_MAX_POLL_ATTEMPTS) {
        throw new Error('视频任务仍在处理中，请稍后刷新页面后重试')
      }

      await waitForDelay(VIDEO_POLL_INTERVAL)
      return pollVideoTask(taskId, headers, attempt + 1)
    }

    const resumeSavedVideoTask = async () => {
      const savedTaskId = loadVideoTaskId()
      if (!savedTaskId) {
        return
      }

      videoTask.id = savedTaskId
      videoTask.status = videoTask.status === 'idle' ? 'queued' : videoTask.status

      if (!form.apiKey.trim() || !form.apiEndpoint.trim()) {
        error.value = '检测到未完成的视频任务，但缺少 API Key 或 API Endpoint，无法自动恢复轮询'
        return
      }

      clearTimeout(pollTimer)
      error.value = ''
      generatedImages.value = []
      generatedVideo.value = null
      loading.value = true
      const token = generationToken

      try {
        const taskData = await pollVideoTask(savedTaskId, buildRequestHeaders())
        if (token !== generationToken) {
          return
        }

        setGeneratedVideo(taskData)

        persistVideoResult({
          token: generationToken,
          taskData,
          prompt: form.prompt.trim(),
          model: form.model,
          modelLabel: getModelLabel(form.model),
          settings: { size: form.size, ratio: form.ratio, duration: form.duration, watermark: form.watermark }
        }).catch(persistError => {
          console.error('❌ 保存视频历史任务失败:', persistError)
        })
      } catch (err) {
        if (err.response || err.request) {
          error.value = getApiErrorMessage(err)
        } else {
          error.value = `生成失败: ${err.message}`
        }
      } finally {
        loading.value = false
      }
    }

    const buildImageRequestData = (prompt, validImageUrls) => {
      const requestData = {
        model: form.model,
        prompt,
        response_format: 'url',
        size: form.size,
        watermark: form.watermark
      }

      if (!MODELS_WITHOUT_SEQUENTIAL_GENERATION.includes(form.model)) {
        requestData.sequential_image_generation = form.maxImages > 1 ? 'auto' : 'disabled'
        requestData.sequential_image_generation_options = {
          max_images: form.maxImages
        }
      }

      if (validImageUrls.length > 0) {
        requestData.image = validImageUrls
      }

      return requestData
    }

    const buildVideoRequestData = (prompt, validImageUrls) => {
      const content = []
      const requestData = {
        model: form.model,
        content,
        resolution: form.size,
        ratio: form.ratio,
        duration: form.duration,
        watermark: form.watermark
      }

      if (prompt) {
        content.push({
          type: 'text',
          text: prompt
        })
      }

      validImageUrls.slice(0, maxImageInputs.value).forEach((url, index, items) => {
        content.push({
          type: 'image_url',
          image_url: { url },
          role: items.length > 1 ? (index === 0 ? 'first_frame' : 'last_frame') : 'first_frame'
        })
      })

      if (supportsVideoAudio.value) {
        requestData.generate_audio = form.generateAudio
      }

      return requestData
    }

    const formatDurationOption = (value) => {
      return value === -1 ? '自动' : `${value} 秒`
    }

    // 监听模型变化，调整尺寸选项
    watch(
      () => form.model,
      (newModel) => {
        applyModelDefaults(newModel)
        resetGenerationState()
      }
    )

    // 监听表单变化，自动保存到 localStorage（包含 apiKey）
    watch(
      () => form,
      (newForm) => {
        // 使用防抖，避免频繁保存
        clearTimeout(saveTimeout)
        saveTimeout = setTimeout(() => {
          saveFormData(newForm)
          hasSavedFormData.value = hasFormData()
        }, 1000)
      },
      { deep: true }
    )

    // 页面加载时恢复表单数据和历史任务，并添加键盘事件监听
    onMounted(() => {
      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeydown)
      refreshHistoryTasks()

      const savedData = loadFormData()
      if (savedData) {
        const savedModel = savedData.model || form.model
        const imageUrls = Array.isArray(savedData.imageUrls)
          ? savedData.imageUrls.slice(0, isVideoModelId(savedModel) ? 2 : 5)
          : []

        while (imageUrls.length < 2) {
          imageUrls.push('')
        }
        
        // 恢复所有保存的数据，包括apiKey
        Object.assign(form, {
          apiKey: savedData.apiKey || form.apiKey,
          apiEndpoint: savedData.apiEndpoint || form.apiEndpoint,
          model: savedData.model || form.model,
          prompt: savedData.prompt || form.prompt,
          imageUrls: imageUrls,
          size: savedData.size || form.size,
          maxImages: savedData.maxImages || form.maxImages,
          watermark: savedData.watermark !== undefined ? savedData.watermark : form.watermark,
          ratio: savedData.ratio || form.ratio,
          duration: savedData.duration ?? form.duration,
          generateAudio: savedData.generateAudio !== undefined ? savedData.generateAudio : form.generateAudio
        })
        applyModelDefaults(form.model)
        hasSavedFormData.value = true
        console.log('🔄 已从 localStorage 恢复表单数据（包含 API Key）')
      } else {
        applyModelDefaults(form.model)
      }

      resumeSavedVideoTask()
    })

    const formatTaskTime = (timestamp) => {
      if (!timestamp) {
        return ''
      }

      const date = new Date(timestamp)
      const now = new Date()
      const pad = value => String(value).padStart(2, '0')
      const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const startOfTaskDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const dayDiff = Math.round((startOfToday - startOfTaskDay) / (24 * 60 * 60 * 1000))

      if (dayDiff === 0) {
        return `今天 ${time}`
      }

      if (dayDiff === 1) {
        return `昨天 ${time}`
      }

      return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`
    }

    /**
     * 从 IndexedDB 读取历史任务，并为缩略图创建 Object URL
     */
    const refreshHistoryTasks = async () => {
      try {
        const tasks = await getHistoryTasks()
        revokeObjectUrls(thumbnailObjectUrls)

        historyTasks.value = tasks.map(task => {
          const thumbnailUrls = []

          if (task.type === 'video') {
            if (task.video && task.video.thumbnail) {
              const url = URL.createObjectURL(task.video.thumbnail)
              thumbnailObjectUrls.push(url)
              thumbnailUrls.push(url)
            } else if (task.video && task.video.thumbnailUrl) {
              thumbnailUrls.push(task.video.thumbnailUrl)
            }
          } else {
            (task.images || []).slice(0, 3).forEach(image => {
              if (image.thumbnail) {
                const url = URL.createObjectURL(image.thumbnail)
                thumbnailObjectUrls.push(url)
                thumbnailUrls.push(url)
              } else if (image.url) {
                thumbnailUrls.push(image.url)
              }
            })
          }

          return { ...task, thumbnailUrls }
        })
      } catch (error) {
        console.error('❌ 读取历史任务失败:', error)
      }
    }

    const switchHistoryTab = (tab) => {
      activeHistoryTab.value = tab
    }

    const toggleTaskHistory = () => {
      isTaskHistoryCollapsed.value = !isTaskHistoryCollapsed.value
    }

    /**
     * 点击历史任务，在右侧「生成结果」中展示
     */
    const selectHistoryTask = async (task) => {
      generationToken += 1
      const token = generationToken
      loading.value = false
      clearTimeout(pollTimer)
      error.value = ''
      resetVideoTask()
      generatedVideo.value = null
      revokeObjectUrls(resultObjectUrls)

      selectedTaskId.value = task.id
      activeResultTask.value = task

      try {
        if (task.type === 'video') {
          generatedImages.value = []

          if (!task.video || !task.video.url) {
            error.value = '该历史任务没有可用的视频地址'
            return
          }

          generatedVideo.value = {
            url: task.video.url,
            resolution: task.video.resolution || '',
            ratio: task.video.ratio || '',
            duration: task.video.duration ?? null,
            framespersecond: task.video.framespersecond ?? null
          }
          return
        }

        const imageRecords = await getTaskImages(task.id)
        if (token !== generationToken) {
          return
        }

        const recordMap = new Map(imageRecords.map(record => [record.index, record]))

        generatedImages.value = (task.images || []).map((meta, index) => {
          const record = recordMap.get(index)

          if (record && record.blob) {
            const url = URL.createObjectURL(record.blob)
            resultObjectUrls.push(url)
            return {
              url,
              blob: record.blob,
              fromIndexedDb: true,
              alt: `历史图片 ${index + 1}`
            }
          }

          return {
            url: meta.url,
            blob: null,
            fromIndexedDb: false,
            alt: `历史图片 ${index + 1}`
          }
        }).filter(image => image.url)

        if (generatedImages.value.length === 0) {
          error.value = '该历史任务的图片数据不可用'
        }
      } catch (err) {
        console.error('❌ 加载历史任务失败:', err)
        error.value = '加载历史任务失败'
      }
    }

    const clearActiveResultTask = () => {
      generationToken += 1
      activeResultTask.value = null
      selectedTaskId.value = ''
      generatedImages.value = []
      generatedVideo.value = null
      resetVideoTask()
      revokeObjectUrls(resultObjectUrls)
    }

    const toggleFavoriteTask = async (task) => {
      try {
        const favorite = await toggleTaskFavorite(task.id)
        await refreshHistoryTasks()

        if (activeResultTask.value && activeResultTask.value.id === task.id) {
          activeResultTask.value = { ...activeResultTask.value, favorite }
        }
      } catch (error) {
        console.error('❌ 更新收藏状态失败:', error)
      }
    }

    const removeHistoryTask = async (task) => {
      if (!confirm('确定要删除这条历史任务吗？')) {
        return
      }

      try {
        await deleteHistoryTask(task.id)

        if (selectedTaskId.value === task.id) {
          clearActiveResultTask()
        }

        await refreshHistoryTasks()
      } catch (error) {
        console.error('❌ 删除历史任务失败:', error)
      }
    }

    const getImageExtension = (image) => {
      const mimeType = image.blob && image.blob.type ? image.blob.type : ''
      if (mimeType.includes('png')) return 'png'
      if (mimeType.includes('webp')) return 'webp'
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'

      const matched = (image.url || '').split('?')[0].match(/\.(png|jpe?g|webp)$/i)
      return matched ? matched[1].toLowerCase().replace('jpeg', 'jpg') : 'png'
    }

    /**
     * IndexedDB 中已缓存原图的，直接从 Blob 保存，不再发起网络下载
     */
    const saveImageToLocal = (image, index) => {
      if (image.blob) {
        downloadBlob(image.blob, `seedhub-${Date.now()}-${index + 1}.${getImageExtension(image)}`)
        return
      }

      if (image.url) {
        window.open(image.url, '_blank')
      }
    }

    const addImageUrl = () => {
      if (form.imageUrls.length < maxImageInputs.value) {
        form.imageUrls.push('')
      }
    }

    // 图片上传功能
    const uploadImage = async (index) => {
      // 创建文件输入元素
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'image/*'
      
      fileInput.onchange = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          alert('请选择图片文件')
          return
        }
        
        // 检查文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('图片文件大小不能超过10MB')
          return
        }
        
        uploadingIndex.value = index
        
        try {
          // 创建FormData
          const formData = new FormData()
          formData.append('file', file)
          
          // 使用本地代理API上传
          const response = await axios.post('/api/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          
          if (response.data && response.data.length > 0) {
            const imageData = response.data[0]
            const imageUrl = `https://telegraph-image-92x.pages.dev${imageData.src}`
            
            // 将图片URL填入对应的输入框
            form.imageUrls[index] = imageUrl
            
            console.log('✅ 图片上传成功:', imageUrl)
          } else {
            throw new Error('上传响应格式不正确')
          }
          
        } catch (error) {
          console.error('❌ 图片上传失败:', error)
          let errorMessage = '图片上传失败'
          
          if (error.response) {
            errorMessage = `上传失败: ${error.response.status} ${error.response.statusText}`
          } else if (error.request) {
            errorMessage = '网络错误: 无法连接到上传服务器'
          } else {
            errorMessage = `上传错误: ${error.message}`
          }
          
          alert(errorMessage)
        } finally {
          uploadingIndex.value = -1
        }
      }
      
      // 触发文件选择对话框
      fileInput.click()
    }

    // 清除历史输入数据（收藏任务会保留）
    const clearHistoryData = async () => {
      if (confirm('确定要清除保存的表单数据和历史任务吗？收藏的任务会保留。')) {
        clearFormData()
        clearVideoTaskId()
        hasSavedFormData.value = false

        try {
          await clearHistoryTasks()
        } catch (error) {
          console.error('❌ 清除历史任务失败:', error)
        }

        // 重置表单到默认值（除了apiKey）
        Object.assign(form, {
          apiEndpoint: IMAGE_DEFAULT_ENDPOINT,
          model: 'doubao-seedream-4-0-250828',
          prompt: '',
          imageUrls: ['', ''],
          size: '2K',
          maxImages: 3,
          watermark: true,
          ratio: '16:9',
          duration: 5,
          generateAudio: true
        })
        resetGenerationState()
        await refreshHistoryTasks()
      }
    }

    /**
     * 把生成的图片抓取为 Blob 写入 IndexedDB，并生成缩略图
     */
    const persistImageResult = async ({ token, sourceUrls, prompt, model, modelLabel, settings }) => {
      const images = []

      for (const url of sourceUrls) {
        let blob = null
        let thumbnail = null

        try {
          blob = await fetchImageBlob(url)
          thumbnail = await createThumbnailBlob(blob)
        } catch (error) {
          // 跨域等情况下无法缓存原图，仍保留远程链接作为缩略图
          console.warn('⚠️ 图片无法缓存到 IndexedDB，仅保存远程链接:', error)
        }

        images.push({
          url,
          blob,
          thumbnail,
          mimeType: blob ? blob.type : ''
        })
      }

      const taskId = await saveImageTask({
        prompt,
        model,
        modelLabel,
        settings,
        images
      })

      if (!taskId) {
        return
      }

      // 用户仍停留在本次生成结果时，把展示中的图片切换为 IndexedDB 中的 Blob，
      // 后续「保存到本地」可直接写盘，无需再发起网络下载。
      if (token === generationToken) {
        const records = await getTaskImages(taskId)
        const recordMap = new Map(records.map(record => [record.index, record]))
        revokeObjectUrls(resultObjectUrls)

        generatedImages.value = images.map((image, index) => {
          const record = recordMap.get(index)

          if (record && record.blob) {
            const url = URL.createObjectURL(record.blob)
            resultObjectUrls.push(url)
            return {
              url,
              blob: record.blob,
              fromIndexedDb: true,
              alt: `生成的图片 ${index + 1}`
            }
          }

          return {
            url: image.url,
            blob: null,
            fromIndexedDb: false,
            alt: `生成的图片 ${index + 1}`
          }
        })

        selectedTaskId.value = taskId
      }

      await refreshHistoryTasks()
    }

    /**
     * 把视频任务写入 IndexedDB，并缓存尾帧缩略图
     */
    const persistVideoResult = async ({ token, taskData, prompt, model, modelLabel, settings }) => {
      const videoUrl = taskData.content && taskData.content.video_url
      if (!videoUrl) {
        return
      }

      const lastFrameUrl = taskData.content.last_frame_image_url || taskData.content.last_frame_url || ''
      let thumbnail = null

      if (lastFrameUrl) {
        try {
          const thumbnailSource = await fetchImageBlob(lastFrameUrl)
          thumbnail = await createThumbnailBlob(thumbnailSource)
        } catch (error) {
          console.warn('⚠️ 视频缩略图缓存失败:', error)
        }
      }

      const taskId = await saveVideoTask({
        prompt,
        model,
        modelLabel,
        settings,
        video: {
          url: videoUrl,
          resolution: taskData.resolution || (settings && settings.size) || '',
          ratio: taskData.ratio || (settings && settings.ratio) || '',
          duration: taskData.duration ?? (settings ? settings.duration : null),
          framespersecond: taskData.framespersecond ?? null,
          thumbnail,
          thumbnailUrl: lastFrameUrl
        }
      })

      if (taskId && token === generationToken) {
        selectedTaskId.value = taskId
      }

      await refreshHistoryTasks()
    }

    const generateImages = async () => {
      if (!form.apiKey.trim()) {
        error.value = '请输入API Key'
        return
      }

      if (!form.apiEndpoint.trim()) {
        error.value = '请输入API Endpoint'
        return
      }

      const normalizedPrompt = form.prompt.trim()
      const validImageUrls = form.imageUrls
        .map(url => url.trim())
        .filter(Boolean)
        .slice(0, maxImageInputs.value)

      if (isVideoModel.value) {
        if (!normalizedPrompt && validImageUrls.length === 0) {
          error.value = '请输入提示词或至少提供一张图片'
          return
        }
      } else if (!normalizedPrompt) {
        error.value = '请输入提示词'
        return
      }

      form.prompt = normalizedPrompt

      loading.value = true
      resetGenerationState()
      const token = generationToken

      try {
        const headers = buildRequestHeaders()

        if (isVideoModel.value) {
          const createResponse = await axios.post(
            '/api/v3/contents/generations/tasks',
            buildVideoRequestData(normalizedPrompt, validImageUrls),
            { headers }
          )

          const taskId = createResponse.data && createResponse.data.id
          if (!taskId) {
            throw new Error('视频任务创建响应格式不正确')
          }

          saveVideoTaskId(taskId)
          videoTask.id = taskId
          videoTask.status = 'queued'

          const taskData = await pollVideoTask(taskId, headers)
          if (token !== generationToken) {
            return
          }

          setGeneratedVideo(taskData)

          persistVideoResult({
            token,
            taskData,
            prompt: normalizedPrompt,
            model: form.model,
            modelLabel: getModelLabel(form.model),
            settings: { size: form.size, ratio: form.ratio, duration: form.duration, watermark: form.watermark }
          }).catch(error => {
            console.error('❌ 保存视频历史任务失败:', error)
          })

          return
        }

        clearVideoTaskId()

        const response = await axios.post(
          '/api/v3/images/generations',
          buildImageRequestData(normalizedPrompt, validImageUrls),
          { headers }
        )

        if (!response.data || !response.data.data) {
          throw new Error('API响应格式不正确')
        }

        const sourceUrls = response.data.data
          .map(item => item.url)
          .filter(Boolean)

        if (sourceUrls.length === 0) {
          throw new Error('API未返回图片地址')
        }

        generatedImages.value = sourceUrls.map((url, index) => ({
          url,
          blob: null,
          fromIndexedDb: false,
          alt: `生成的图片 ${index + 1}`
        }))

        persistImageResult({
          token,
          sourceUrls,
          prompt: normalizedPrompt,
          model: form.model,
          modelLabel: getModelLabel(form.model),
          settings: {
            size: form.size,
            ratio: form.ratio,
            maxImages: form.maxImages,
            watermark: form.watermark
          }
        }).catch(error => {
          console.error('❌ 保存图片历史任务失败:', error)
        })

      } catch (err) {
        if (err.response || err.request) {
          error.value = getApiErrorMessage(err)
        } else {
          error.value = `生成失败: ${err.message}`
        }
      } finally {
        loading.value = false
      }
    }

    const onImageLoad = () => {
      console.log('图片加载成功')
    }

    const onImageError = (event) => {
      console.error('图片加载失败:', event.target.src)
    }

    // 图片模态框相关方法
    const openImageModal = (url, alt) => {
      modalImage.show = true
      modalImage.url = url
      modalImage.alt = alt
      // 防止背景滚动
      document.body.style.overflow = 'hidden'
    }

    const closeImageModal = () => {
      modalImage.show = false
      modalImage.url = ''
      modalImage.alt = ''
      // 恢复背景滚动
      document.body.style.overflow = 'auto'
    }

    // 键盘事件处理
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && modalImage.show) {
        closeImageModal()
      }
    }

    // 组件卸载时移除键盘事件监听
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      clearTimeout(saveTimeout)
      clearTimeout(pollTimer)
      revokeObjectUrls(thumbnailObjectUrls)
      revokeObjectUrls(resultObjectUrls)
      // 确保在组件卸载时恢复背景滚动
      document.body.style.overflow = 'auto'
    })

    return {
      form,
      loading,
      error,
      generatedImages,
      generatedVideo,
      isVideoModel,
      settingsTitle,
      promptPlaceholder,
      mediaFieldLabel,
      mediaFieldHint,
      addImageButtonText,
      sizeFieldLabel,
      submitButtonText,
      loadingText,
      emptyStateText,
      maxImageInputs,
      videoTask,
      videoStatusText,
      videoModelLabel,
      videoRatioOptions,
      videoDurationOptions,
      videoAudioStatusText,
      supportsVideoAudio,
      formatDurationOption,
      modalImage,
      uploadingIndex,
      availableSizes,
      historyTasks,
      historyTabs,
      activeHistoryTab,
      selectedTaskId,
      activeResultTask,
      favoriteTasks,
      displayedTasks,
      isTaskHistoryCollapsed,
      hasSavedData,
      addImageUrl,
      uploadImage,
      toggleTaskHistory,
      switchHistoryTab,
      selectHistoryTask,
      clearActiveResultTask,
      toggleFavoriteTask,
      removeHistoryTask,
      formatTaskTime,
      saveImageToLocal,
      clearHistoryData,
      generateImages,
      onImageLoad,
      onImageError,
      openImageModal,
      closeImageModal
    }
  }
}
</script>