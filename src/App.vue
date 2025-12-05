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
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900">图片生成设置</h2>
            <button
              v-if="hasFormData()"
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
                <div
                  v-for="(url, index) in form.imageUrls"
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    v-model="form.imageUrls[index]"
                    type="url"
                    :placeholder="`参考图片 ${index + 1} URL`"
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
                  </select>
                </div>

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
                class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                @load="onImageLoad"
                @error="onImageError"
                @click="openImageModal(image.url, `生成的图片 ${index + 1}`)"
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
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { saveFormData, loadFormData, clearFormData, hasFormData } from './utils/storage.js'

export default {
  name: 'App',
  setup() {
    const loading = ref(false)
    const error = ref('')
    const generatedImages = ref([])
    
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
      apiEndpoint: 'ark.cn-beijing.volces.com',
      model: 'doubao-seedream-4-0-250828',
      prompt: '',
      imageUrls: ['', ''],
      size: '2K',
      maxImages: 3,
      watermark: true
    })

    // 防抖定时器
    let saveTimeout = null

    // 监听表单变化，自动保存到Cookie（包含apiKey）
    watch(
      () => form,
      (newForm) => {
        // 使用防抖，避免频繁保存
        clearTimeout(saveTimeout)
        saveTimeout = setTimeout(() => {
          saveFormData(newForm)
        }, 1000)
      },
      { deep: true }
    )

    // 页面加载时从Cookie恢复表单数据，并添加键盘事件监听
    onMounted(() => {
      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeydown)
      
      const savedData = loadFormData()
      if (savedData) {
        // 确保imageUrls至少有两个空字符串，如果保存的数据少于2个则补充
        const imageUrls = savedData.imageUrls || []
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
          watermark: savedData.watermark !== undefined ? savedData.watermark : form.watermark
        })
        console.log('🔄 已从Cookie恢复表单数据（包含API Key）')
      }
    })

    const addImageUrl = () => {
      if (form.imageUrls.length < 5) {
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

    // 清除历史输入数据
    const clearHistoryData = () => {
      if (confirm('确定要清除所有保存的历史输入数据吗？')) {
        clearFormData()
        // 重置表单到默认值（除了apiKey）
        Object.assign(form, {
          apiEndpoint: 'ark.ap-southeast.bytepluses.com',
          model: 'doubao-seedream-4-0-250828',
          prompt: '',
          imageUrls: ['', ''],
          size: '2K',
          maxImages: 3,
          watermark: true
        })
      }
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
          model: form.model,
          prompt: form.prompt,
          sequential_image_generation: form.maxImages > 1 ? "auto" : "disabled",
          sequential_image_generation_options: {
            max_images: form.maxImages
          },
          response_format: "url",
          size: form.size,
          watermark: form.watermark
        }

        // 只有在有有效图片URL时才添加image字段
        if (validImageUrls.length > 0) {
          requestData.image = validImageUrls
        }

        // 使用代理路径避免CORS问题
        const apiUrl = '/api/v3/images/generations'
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${form.apiKey}`,
          'X-Target-Host': form.apiEndpoint
        };
        
        const response = await axios.post(
          apiUrl,
          requestData,
          { headers }
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
        if (err.response) {
          if (err.response.data && err.response.data.error) {
            error.value = `API错误: ${err.response.data.error.message || err.response.data.error}`
          } else {
            error.value = `请求失败: ${err.response.status} ${err.response.statusText}`
          }
        } else if (err.request) {
          error.value = '网络错误: 无法连接到服务器'
        } else {
          error.value = `请求配置错误: ${err.message}`
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
      // 确保在组件卸载时恢复背景滚动
      document.body.style.overflow = 'auto'
    })

    return {
      form,
      loading,
      error,
      generatedImages,
      modalImage,
      uploadingIndex,
      addImageUrl,
      uploadImage,
      clearHistoryData,
      generateImages,
      onImageLoad,
      onImageError,
      openImageModal,
      closeImageModal,
      hasFormData
    }
  }
}
</script>