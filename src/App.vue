<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-3xl font-bold text-gray-900">SeedHub</h1>
        <p class="text-gray-600 mt-1">基于火山引擎SeedDream的AI图片生成工具</p>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 左侧：输入表单 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">图片生成设置</h2>
          
          <form @submit.prevent="generateImages" class="space-y-6">
            <!-- API Key -->
            <div>
              <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="apiKey"
                v-model="form.apiKey"
                type="password"
                placeholder="请输入火山引擎ARK API Key"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
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
                placeholder="描述你想要生成的图片..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              ></textarea>
            </div>

            <!-- 参考图片URL -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                参考图片URL（可选）
              </label>
              <div class="space-y-2">
                <input
                  v-for="(url, index) in form.imageUrls"
                  :key="index"
                  v-model="form.imageUrls[index]"
                  type="url"
                  :placeholder="`参考图片 ${index + 1} URL`"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  @click="addImageUrl"
                  class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  + 添加更多参考图片
                </button>
              </div>
            </div>

            <!-- 高级设置 -->
            <div class="border-t pt-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">高级设置</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- 图片尺寸 -->
                <div>
                  <label for="size" class="block text-sm font-medium text-gray-700 mb-2">
                    图片尺寸
                  </label>
                  <select
                    id="size"
                    v-model="form.size"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="1K">1K (1024x1024)</option>
                    <option value="2K">2K (2048x2048)</option>
                    <option value="4K">4K (4096x4096)</option>
                  </select>
                </div>

                <!-- 最大图片数量 -->
                <div>
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
                生成中...
              </span>
              <span v-else>生成图片</span>
            </button>
          </form>
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
                class="w-full h-auto"
                @load="onImageLoad"
                @error="onImageError"
              />
              <div class="p-3 bg-gray-50">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">图片 {{ index + 1 }}</span>
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

          <!-- 空状态 -->
          <div v-else-if="!loading" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">暂无生成结果</h3>
            <p class="mt-1 text-sm text-gray-500">填写左侧表单开始生成图片</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import axios from 'axios'

export default {
  name: 'App',
  setup() {
    const loading = ref(false)
    const error = ref('')
    const generatedImages = ref([])

    const form = reactive({
      apiKey: '',
      prompt: 'Generate 3 images of a girl and a cow plushie happily riding a roller coaster in an amusement park, depicting morning, noon, and night.',
      imageUrls: ['', ''],
      size: '2K',
      maxImages: 3,
      watermark: true
    })

    const addImageUrl = () => {
      if (form.imageUrls.length < 5) {
        form.imageUrls.push('')
      }
    }

    const generateImages = async () => {
      if (!form.apiKey.trim()) {
        error.value = '请输入API Key'
        return
      }

      if (!form.prompt.trim()) {
        error.value = '请输入提示词'
        return
      }

      loading.value = true
      error.value = ''
      generatedImages.value = []

      try {
        // 过滤掉空的图片URL
        const validImageUrls = form.imageUrls.filter(url => url.trim())

        const requestData = {
          model: "doubao-seedream-4-0-250828",
          prompt: form.prompt,
          sequential_image_generation: "auto",
          sequential_image_generation_options: {
            max_images: form.maxImages
          },
          response_format: "url",
          size: form.size,
          stream: false,
          watermark: form.watermark
        }

        // 只有在有有效图片URL时才添加image字段
        if (validImageUrls.length > 0) {
          requestData.image = validImageUrls
        }

        // 使用环境变量配置的API地址
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v3/images/generations'
        const response = await axios.post(
          apiUrl,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${form.apiKey}`
            }
          }
        )

        if (response.data && response.data.data) {
          generatedImages.value = response.data.data.map(item => ({
            url: item.url,
            revised_prompt: item.revised_prompt
          }))
        } else {
          throw new Error('API响应格式不正确')
        }

      } catch (err) {
        console.error('生成图片失败:', err)
        
        if (err.response) {
          const errorData = err.response.data
          if (errorData && errorData.error) {
            error.value = `API错误: ${errorData.error.message || '未知错误'}`
          } else {
            error.value = `HTTP错误: ${err.response.status} ${err.response.statusText}`
          }
        } else if (err.request) {
          error.value = '网络请求失败，请检查网络连接'
        } else {
          error.value = err.message || '生成图片时发生未知错误'
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

    return {
      form,
      loading,
      error,
      generatedImages,
      addImageUrl,
      generateImages,
      onImageLoad,
      onImageError
    }
  }
}
</script>