<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElCollapse, ElCollapseItem, ElButton, ElInput } from 'element-plus'
import 'element-plus/dist/index.css'

const imgUrl = ref('')
const canvasRef = ref(null)
const cropBoxRef = ref(null)
const activeNames = ref([])
const ctx = ref(null)
const originalImage = ref(null)
const cropArea = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isDragging: false,
  isResizing: false
})

// 添加 editor-container 的引用
const containerRef = ref(null)

// 移除配置组定义，直接使用尺寸输入
const sizeInputs = computed(() => ({
  width: cropArea.value?.width?.toFixed(0) || '',
  height: cropArea.value?.height?.toFixed(0) || ''
}))

// 添加旋转角度状态
const rotateAngle = ref(0)

// 添加旋转处理方法
const handleRotate = (value) => {
  if (!cropArea.value || !canvasRef.value) return
  
  // 如果是点击按钮传入的值，直接加到当前角度上
  if (typeof value === 'number') {
    rotateAngle.value = ((rotateAngle.value + value) % 360 + 360) % 360
  } else {
    // 如果是输入框输入的值，直接设置角度
    const angle = parseInt(value)
    if (isNaN(angle)) return
    rotateAngle.value = ((angle % 360) + 360) % 360
  }
  
  // 获取画布上下文
  const ctx = canvasRef.value.getContext('2d')
  const canvas = canvasRef.value
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 保存当前状态
  ctx.save()
  
  // 移动到画布中心
  ctx.translate(canvas.width / 2, canvas.height / 2)
  
  // 旋转
  ctx.rotate((rotateAngle.value * Math.PI) / 180)
  
  // 绘制图片
  if (originalImage.value) {
    const scale = Math.min(
      canvas.width / originalImage.value.width,
      canvas.height / originalImage.value.height
    )
    
    ctx.drawImage(
      originalImage.value,
      -originalImage.value.width * scale / 2,
      -originalImage.value.height * scale / 2,
      originalImage.value.width * scale,
      originalImage.value.height * scale
    )
  }
  
  // 恢复状态
  ctx.restore()
}

// 监听 canvas 挂载
onMounted(() => {
  if (originalImage.value) {
    nextTick(() => {
      initCanvas(originalImage.value)
    })
  }
})

// 修改初始化画布方法
const initCanvas = (image) => {
  if (!canvasRef.value || !containerRef.value) return
  
  const canvas = canvasRef.value
  const container = containerRef.value
  
  // 设置画布大小
  canvas.width = container.offsetWidth
  canvas.height = container.offsetHeight
  
  // 绘制图片
  const ctx = canvas.getContext('2d')
  
  // 计算图片缩放和位置
  const scale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height
  )
  
  const scaledWidth = image.width * scale
  const scaledHeight = image.height * scale
  const x = (canvas.width - scaledWidth) / 2
  const y = (canvas.height - scaledHeight) / 2
  
  // 绘制图片
  ctx.drawImage(
    image,
    x, y,
    scaledWidth,
    scaledHeight
  )
  
  // 初始化裁剪框位置 - 居中显示
  const cropWidth = Math.min(scaledWidth * 0.8, canvas.width * 0.8) // 取图片宽度和画布宽度的80%中较小的值
  const cropHeight = cropWidth * 9 / 16 // 默认16:9比例
  
  cropArea.value = {
    x: (canvas.width - cropWidth) / 2,
    y: (canvas.height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
    isDragging: false,
    isResizing: false
  }
  
  // 更新裁剪框位置
  updateCropBoxPosition()
}

// 绘制图片
const drawImage = (image) => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 计算图片缩放和位置
  const scale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height
  )
  
  const x = (canvas.width - image.width * scale) / 2
  const y = (canvas.height - image.height * scale) / 2
  
  // 绘制图片
  ctx.drawImage(
    image,
    x, y,
    image.width * scale,
    image.height * scale
  )
}

// 更新裁剪框位置
const updateCropBoxPosition = () => {
  if (!cropBoxRef.value) return
  
  const area = cropArea.value
  // 确保所有值都是整数
  cropBoxRef.value.style.left = `${Math.round(area.x)}px`
  cropBoxRef.value.style.top = `${Math.round(area.y)}px`
  cropBoxRef.value.style.width = `${Math.round(area.width)}px`
  cropBoxRef.value.style.height = `${Math.round(area.height)}px`
}

// 处理裁剪框拖动
const handleCropBoxMouseDown = (e) => {
  e.preventDefault()
  cropArea.value.isDragging = true
  
  const startX = e.clientX - cropArea.value.x
  const startY = e.clientY - cropArea.value.y
  
  const handleMouseMove = (e) => {
    if (!cropArea.value.isDragging) return
    
    const newX = e.clientX - startX
    const newY = e.clientY - startY
    
    // 限制在画布范围内
    cropArea.value.x = Math.max(0, Math.min(canvasRef.value.width - cropArea.value.width, newX))
    cropArea.value.y = Math.max(0, Math.min(canvasRef.value.height - cropArea.value.height, newY))
    
    updateCropBoxPosition()
  }
  
  const handleMouseUp = () => {
    cropArea.value.isDragging = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 修改文件选择处理
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        originalImage.value = img
        nextTick(() => {
          initCanvas(img)
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 修改 handleMouseDown 方法以支持调整大小
const handleMouseDown = (e) => {
  const { offsetX, offsetY } = e
  const area = cropArea.value
  const handleSize = 8

  // 检查是否点击在制点上
  const handles = [
    { x: area.x, y: area.y, cursor: 'nw-resize' },
    { x: area.x + area.width / 2, y: area.y, cursor: 'n-resize' },
    { x: area.x + area.width, y: area.y, cursor: 'ne-resize' },
    { x: area.x + area.width, y: area.y + area.height / 2, cursor: 'e-resize' },
    { x: area.x + area.width, y: area.y + area.height, cursor: 'se-resize' },
    { x: area.x + area.width / 2, y: area.y + area.height, cursor: 's-resize' },
    { x: area.x, y: area.y + area.height, cursor: 'sw-resize' },
    { x: area.x, y: area.y + area.height / 2, cursor: 'w-resize' }
  ]

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i]
    if (
      offsetX >= handle.x - handleSize / 2 &&
      offsetX <= handle.x + handleSize / 2 &&
      offsetY >= handle.y - handleSize / 2 &&
      offsetY <= handle.y + handleSize / 2
    ) {
      area.isResizing = true
      area.resizeHandle = i
      canvasRef.value.style.cursor = handle.cursor
      return
    }
  }

  // 如果不是点击在制点上，检查是否点击在裁剪框内
  if (
    offsetX >= area.x &&
    offsetX <= area.x + area.width &&
    offsetY >= area.y &&
    offsetY <= area.y + area.height
  ) {
    area.isDragging = true
    canvasRef.value.style.cursor = 'move'
  }
}

// 修改 handleMouseMove 方法以支持调整大小
const handleMouseMove = (e) => {
  const { movementX, movementY } = e
  const area = cropArea.value
  const canvas = canvasRef.value

  if (area.isResizing) {
    // 根据不同的控制点调整大小
    switch (area.resizeHandle) {
      case 0: // 左上
        area.x = Math.min(area.x + movementX, area.x + area.width)
        area.y = Math.min(area.y + movementY, area.y + area.height)
        area.width -= movementX
        area.height -= movementY
        break
      case 4: // 右下
        area.width = Math.max(10, area.width + movementX)
        area.height = Math.max(10, area.height + movementY)
        break
      // ... 可以添加其他控制点的处理
    }
  } else if (area.isDragging) {
    // 移动裁剪框
    area.x = Math.max(0, Math.min(canvas.width - area.width, area.x + movementX))
    area.y = Math.max(0, Math.min(canvas.height - area.height, area.y + movementY))
  }

  // 重新绘制
  if (area.isResizing || area.isDragging) {
    drawImage(originalImage.value)
    drawCropArea()
  }
}

// 修改 handleMouseUp 方法
const handleMouseUp = () => {
  cropArea.value.isDragging = false
  cropArea.value.isResizing = false
  canvasRef.value.style.cursor = 'crosshair'
}

// 确认裁剪
const confirmCrop = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const area = cropArea.value
  
  // 设置输出画布大小
  canvas.width = area.width
  canvas.height = area.height
  
  // 裁剪并绘制
  ctx.drawImage(
    canvasRef.value,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height
  )
  
  // 下载裁剪后的图片
  const link = document.createElement('a')
  link.download = `cropped_${Date.now()}.png`
  link.href = canvas.toDataURL()
  link.click()
}

// 处理控制点拖动
const handleResizeMouseDown = (e, position) => {
  e.preventDefault()
  e.stopPropagation()
  
  cropArea.value.isResizing = true
  const startX = e.clientX
  const startY = e.clientY
  const startWidth = cropArea.value.width
  const startHeight = cropArea.value.height
  const startLeft = cropArea.value.x
  const startTop = cropArea.value.y

  const handleMouseMove = (e) => {
    if (!cropArea.value.isResizing) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY
    const minSize = 50
    const canvas = canvasRef.value

    let newX = cropArea.value.x
    let newY = cropArea.value.y
    let newWidth = cropArea.value.width
    let newHeight = cropArea.value.height

    switch (position) {
      case 'top-left':
        if (deltaX < startWidth - minSize) {
          // 只处理左边界
          newX = Math.max(0, startLeft + deltaX)
          newWidth = startWidth - (newX - startLeft)
        }
        if (deltaY < startHeight - minSize) {
          // 只处理上边界
          newY = Math.max(0, startTop + deltaY)
          newHeight = startHeight - (newY - startTop)
        }
        break

      case 'top-right':
        if (startLeft + startWidth + deltaX <= canvas.width) {
          // 只处理右边界
          newWidth = Math.max(minSize, startWidth + deltaX)
        }
        if (deltaY < startHeight - minSize) {
          // 只处理上边界
          newY = Math.max(0, startTop + deltaY)
          newHeight = startHeight - (newY - startTop)
        }
        break

      case 'bottom-left':
        if (deltaX < startWidth - minSize) {
          // 只处理左边界
          newX = Math.max(0, startLeft + deltaX)
          newWidth = startWidth - (newX - startLeft)
        }
        if (startTop + startHeight + deltaY <= canvas.height) {
          // 只处理下边界
          newHeight = Math.max(minSize, startHeight + deltaY)
        }
        break

      case 'bottom-right':
        if (startLeft + startWidth + deltaX <= canvas.width) {
          // 只处理右边界
          newWidth = Math.max(minSize, startWidth + deltaX)
        }
        if (startTop + startHeight + deltaY <= canvas.height) {
          // 只处理下边界
          newHeight = Math.max(minSize, startHeight + deltaY)
        }
        break

      case 'top':
        if (deltaY < startHeight - minSize) {
          newY = Math.max(0, startTop + deltaY)
          newHeight = startHeight - (newY - startTop)
        }
        break
        
      case 'right':
        if (startLeft + startWidth + deltaX <= canvas.width) {
          newWidth = Math.max(minSize, startWidth + deltaX)
        }
        break
        
      case 'bottom':
        if (startTop + startHeight + deltaY <= canvas.height) {
          newHeight = Math.max(minSize, startHeight + deltaY)
        }
        break
        
      case 'left':
        if (deltaX < startWidth - minSize) {
          newX = Math.max(0, startLeft + deltaX)
          newWidth = startWidth - (newX - startLeft)
        }
        break
    }

    cropArea.value.x = newX
    cropArea.value.y = newY
    cropArea.value.width = newWidth
    cropArea.value.height = newHeight
    
    updateCropBoxPosition()
  }

  const handleMouseUp = () => {
    cropArea.value.isResizing = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 修改尺寸修改处理方法
const handleSizeChange = (type, value) => {
  if (!cropArea.value || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const newValue = Math.round(parseInt(value)) // 确保是整数
  
  if (isNaN(newValue)) return
  
  if (type === 'width') {
    // 只限制最大宽度
    const maxWidth = canvas.width - Math.round(cropArea.value.x)
    cropArea.value.width = Math.round(Math.min(newValue, maxWidth))
    
    // 如果超出画布，调整位置
    if (cropArea.value.x + newValue > canvas.width) {
      cropArea.value.x = Math.round(canvas.width - newValue)
    }
  } else if (type === 'height') {
    // 只限制最大高度
    const maxHeight = canvas.height - Math.round(cropArea.value.y)
    cropArea.value.height = Math.round(Math.min(newValue, maxHeight))
    
    // 如果超出画布，调整位置
    if (cropArea.value.y + newValue > canvas.height) {
      cropArea.value.y = Math.round(canvas.height - newValue)
    }
  }
  
  updateCropBoxPosition()
  
  if (originalImage.value) {
    drawImage(originalImage.value)
  }
}
</script>

<template>
  <div class="container">
    <!-- 工具面板 -->
    <div class="tools-panel">
      <!-- 尺寸调整输入框 -->
      <div class="size-panel">
        <div class="panel-title">尺寸调整</div>
        <div class="size-inputs">
          <div class="size-input-group">
            <span class="size-label">宽度</span>
            <el-input
              v-model.number="cropArea.width"
              type="number"
              :max="canvasRef?.width || 0"
              @input="value => handleSizeChange('width', value)"
            >
              <template #append>px</template>
            </el-input>
          </div>
          <div class="size-input-group">
            <span class="size-label">高度</span>
            <el-input
              v-model.number="cropArea.height"
              type="number"
              :max="canvasRef?.height || 0"
              @input="value => handleSizeChange('height', value)"
            >
              <template #append>px</template>
            </el-input>
          </div>
        </div>
      </div>

      <!-- 旋转控制面板 -->
      <div class="size-panel">
        <div class="panel-title">旋转控制</div>
        <div class="size-inputs">
          <div class="size-input-group">
            <span class="size-label">角度</span>
            <el-input
              v-model.number="rotateAngle"
              type="number"
              :min="-360"
              :max="360"
              @input="handleRotate"
            >
              <template #append>°</template>
            </el-input>
          </div>
          <!-- 快捷旋转按钮 -->
          <div class="rotate-buttons">
            <el-button @click="handleRotate(-90)">左转90°</el-button>
            <el-button @click="handleRotate(90)">右转90°</el-button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button 
          type="danger" 
          :disabled="!originalImage"
          @click="originalImage = null"
        >
          取消编辑
        </el-button>
        <el-button 
          type="primary"
          :disabled="!originalImage"
          @click="confirmCrop"
        >
          确认裁剪
        </el-button>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="content-panel">
      <div 
        ref="containerRef"
        class="editor-container"
        @drop="handleDrop"
        @dragover.prevent
      >
        <div v-if="!originalImage" class="upload-area">
          <input 
            type="file" 
            accept="image/*" 
            @change="handleFileChange"
            class="file-input"
            id="file-input"
          >
          <label for="file-input" class="upload-content">
            <div class="upload-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="upload-text">
              <h3>上传图片</h3>
              <p>点击选择或拖拽图片到此处</p>
              <span class="upload-hint">持 JPG、PNG、GIF 等格式</span>
            </div>
          </label>
        </div>

        <template v-else>
          <canvas
            ref="canvasRef"
            class="editor-canvas"
          ></canvas>
          
          <!-- 裁剪框 -->
          <div 
            ref="cropBoxRef"
            class="crop-box"
            @mousedown="handleCropBoxMouseDown"
          >
            <!-- 四角的控制点 -->
            <div 
              class="resize-handle corner top-left"
              @mousedown="(e) => handleResizeMouseDown(e, 'top-left')"
            ></div>
            <div 
              class="resize-handle corner top-right"
              @mousedown="(e) => handleResizeMouseDown(e, 'top-right')"
            ></div>
            <div 
              class="resize-handle corner bottom-left"
              @mousedown="(e) => handleResizeMouseDown(e, 'bottom-left')"
            ></div>
            <div 
              class="resize-handle corner bottom-right"
              @mousedown="(e) => handleResizeMouseDown(e, 'bottom-right')"
            ></div>

            <!-- 边的中点控制点 -->
            <div 
              class="resize-handle edge top"
              @mousedown="(e) => handleResizeMouseDown(e, 'top')"
            ></div>
            <div 
              class="resize-handle edge right"
              @mousedown="(e) => handleResizeMouseDown(e, 'right')"
            ></div>
            <div 
              class="resize-handle edge bottom"
              @mousedown="(e) => handleResizeMouseDown(e, 'bottom')"
            ></div>
            <div 
              class="resize-handle edge left"
              @mousedown="(e) => handleResizeMouseDown(e, 'left')"
            ></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基础布局样式 */
.container {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.tools-panel {
  width: 250px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}

.content-panel {
  flex: 1;
  min-width: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

/* 图标样式 */
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

/* 作按钮器 */
.action-buttons {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
}

/* 右侧上传区域样式保持不变 */
.image-upload-container {
  flex: 1;
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.upload-area {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cropper-container {
  height: 100%;
  width: 100%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ddd;
  margin: 16px;
  width: calc(100% - 32px);
  height: calc(100% - 32px);
  background: #fafafa;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.upload-icon {
  color: #666;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.upload-content:hover .upload-icon {
  color: #4CAF50;
  transform: translateY(-5px);
}

.upload-text {
  text-align: center;
}

.upload-text h3 {
  margin: 0;
  color: #333;
  font-size: 1.5em;
  font-weight: 500;
}

.upload-text p {
  margin: 8px 0;
  color: #666;
  font-size: 1em;
}

.upload-hint {
  display: block;
  margin-top: 8px;
  color: #999;
  font-size: 0.9em;
}

/* 拖拽状样式 */
.upload-area[data-dragging="true"] .upload-content {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.tool-hint {
  display: none;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;
}

.action-btn.cancel {
  background-color: #f44336;
  color: white;
}

.action-btn.cancel:hover {
  background-color: #d32f2f;
}

.action-btn.confirm {
  background-color: #4CAF50;
  color: white;
}

.action-btn.confirm:hover {
  background-color: #45a049;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }

  .tools-panel {
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .content-panel {
    height: auto;
    min-height: calc(100vh - 200px);
  }
}

/* 添加响应式样式 */
@media (max-width: 480px) {
  .upload-text h3 {
    font-size: 1.2em;
  }
  
  .upload-text p {
    font-size: 0.9em;
  }
  
  .upload-hint {
    font-size: 0.8em;
  }
}

.action-buttons {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }

  .tools-panel {
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .content-panel {
    height: auto;
    min-height: calc(100vh - 200px);
  }
}

/* 添加一些新的样式 */
.config-btn .icon {
  font-size: 16px;
  min-width: 24px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.config-btn.active .icon {
  transform: scale(1.1);
}

.config-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f5f5f5;
}

.config-btn.disabled:hover {
  background: #f5f5f5;
}

.config-btn.disabled .icon {
  opacity: 0.5;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.cancel:disabled {
  background-color: #ffcdd2;
}

.action-btn.confirm:disabled {
  background-color: #c8e6c9;
}

.ratio-group {
  position: relative;
}

.arrow {
  margin-left: auto;
  transition: transform 0.3s;
}

.arrow.open {
  transform: rotate(180deg);
}

.ratio-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.ratio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.ratio-option:hover {
  background: #f5f5f5;
}

.ratio-option.active {
  background: #4CAF50;
  color: white;
}

.ratio-option .icon {
  font-size: 16px;
  min-width: 24px;
  text-align: center;
}

/* 添加点击空白处关闭拉面的处理 */
@media (max-width: 768px) {
  .ratio-options {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 16px;
    top: auto;
    margin: 0;
    border-radius: 8px;
  }

  .ratio-option {
    padding: 14px 16px;
  }
}

.config-group {
  position: relative;
  display: flex;
  flex-direction: column;
}

.config-options {
  position: relative;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.config-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.config-option:hover {
  background: #f5f5f5;
}

.config-option.active {
  background: #4CAF50;
  color: white;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .config-options {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    margin: 4px 0;
  }

  .tools-panel {
    width: 100%;
    flex-direction: column;
    flex-wrap: nowrap;
    position: sticky;
    top: 0;
    z-index: 100;
  }
}

/* 调整样式以适配 Element Plus */
.tools-panel {
  width: 250px;
  background: #f5f5f5;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.action-buttons {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 覆盖 Element Plus 的一些默认样式 */
:deep(.el-collapse-item__header) {
  background-color: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

:deep(.el-collapse-item__content) {
  padding: 8px;
  background: white;
  border-radius: 6px;
  margin-top: 4px;
}

:deep(.el-button) {
  justify-content: flex-start;
  width: 100%;
}

/* 操作按钮样式优 */
:deep(.action-buttons .el-button) {
  flex: 1;
  justify-content: center;
}

/* 覆盖 Element Plus 的一些默认样式 */
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  border: none;
  padding: 8px;
  font-size: 14px;
  color: #333;
}

:deep(.el-collapse-item__content) {
  padding: 0 8px 8px;
}

:deep(.el-collapse-item__wrap) {
  border: none;
}

:deep(.el-button) {
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
}

:deep(.el-button:hover) {
  background-color: #f5f5f5;
}

:deep(.el-button.is-text) {
  padding: 8px;
}

.el-button+.el-button{
  margin-left: 0px;
}

/* 添加自定义旋转输入框样式 */
:deep(.el-input) {
  width: 100%;
}

:deep(.el-input-group__append) {
  padding: 0 8px;
}

/* 工具栏样式 */
.toolbar {
  position: relative;
  background: #f5f5f5;
  padding: 12px;
  display: flex;
  gap: 16px;
  border-top: 1px solid #eee;
  margin-top: 16px;
  border-radius: 8px;
}

.tool-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-item:hover {
  background: #f5f5f5;
}

.tool-item.active {
  background: #e3f2fd;
}

.tool-icon {
  font-size: 20px;
}

.tool-label {
  font-size: 14px;
  color: #333;
}

/* 滑块样式 */
:deep(.el-slider) {
  width: 120px;
  margin: 0 12px;
}

/* 添加马赛克画布样式 */
.cropper-container {
  position: relative;
}

.mosaic-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 1000;
  background: transparent;
}

/* 修改工具栏样式 */
.tool-item.active {
  background: #e3f2fd;
  border: 2px solid #1976d2;
}

.leafer-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 1000;
  background: transparent;
}

.editor-area {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

.editor-canvas {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  cursor: crosshair;
}

.editor-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.editor-canvas {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  cursor: crosshair;
}

/* 裁剪框样式 */
.crop-box {
  position: absolute;
  border: 2px solid #fff;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
}

/* 调整大的控制点 */
.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 1px solid #4CAF50;
  border-radius: 50%;
  z-index: 1;
}

.resize-handle:hover {
  background: #4CAF50;
  border-color: #fff;
}

.resize-handle.top-left {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}

.resize-handle.top-right {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.resize-handle.bottom-left {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

.resize-handle.bottom-right {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}

/* 调整控制点样式 */
.resize-handle.edge {
  width: 8px;
  height: 8px;
}

.resize-handle.top {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-handle.right {
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-handle.bottom {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-handle.left {
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: w-resize;
}

/* 添加尺寸输入框样式 */
.size-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}

.size-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-label {
  min-width: 42px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-input-group__append) {
  padding: 0 8px;
}

:deep(.el-input__inner) {
  text-align: center;
}

/* 修改尺寸面板样式 */
.size-panel {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.panel-title {
  padding: 12px 16px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
  border-bottom: 1px solid #eee;
}

.size-inputs {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.size-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-label {
  min-width: 42px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-input-group__append) {
  padding: 0 8px;
}

:deep(.el-input__inner) {
  text-align: center;
}

/* 添加旋转按钮样式 */
.rotate-buttons {
  display: flex;
  gap: 8px;
}

.rotate-buttons .el-button {
  flex: 1;
}

/* 确保输入框和按钮样式统一 */
:deep(.el-input-number) {
  width: 100%;
}
</style>
