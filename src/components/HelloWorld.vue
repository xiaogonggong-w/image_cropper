<script setup>
import { ref, nextTick } from 'vue'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { ElCollapse, ElCollapseItem, ElButton, ElInput } from 'element-plus'
import 'element-plus/dist/index.css'

const imgUrl = ref('')
const cropperRef = ref(null)
const activeNames = ref([]) // 用于控制当前展开的面板

// 修改配置选项，设置默认为自由裁剪
const cropOptions = ref({
  // 基础配置
  autoCrop: true,        // 是否自动生成裁剪框
  autoCropWidth: 480,    // 裁剪框默认宽度
  autoCropHeight: 270,   // 裁剪框默认高度
  
  // 裁剪框行为
  fixed: false,          // 默认不固定比例
  fixedNumber: [1, 1],   // 默认 1:1 比例（自由裁剪时不生效）
  fixedBox: false,       // 不固定裁剪框大小
  canMove: true,         
  canMoveBox: true,      
  centerBox: true,       
  
  // 高级功能
  original: false,       // 上传图片按照原始比例渲染
  full: true,           // 是否输出原图比例的截图
  enlarge: 1,           // 裁剪图片输出比例
  high: true,           // 是否照设计dpr 输出等比例图片
  maxImgSize: 3000,     // 限制图片最大宽度和高度
  
  // 界面设置
  info: true,           // 裁剪框的大小信息
  infoTrue: true,       // true 为展示真实输出图片宽高
  outputSize: 1,        // 裁剪生成图片的质量(0.1-1)
  outputType: 'jpeg',   // 裁剪生成图片的格式
  
  // 辅助功能
  background: true,     // 是否显示背景
  guides: true,         // 是否显示裁剪框辅助线
  highlight: true,      // 是否高亮裁剪框
  modal: true,          // 是否显示蒙层
  
  // 缩放控制
  zoom: true,           // 图片是否可以缩放
  zoomRate: 1.1,        // 缩放比例
  rotatable: true,      // 是否可以旋转
  scalable: true,       // 是否可以调整大小
})

// 添加裁剪框大小变化处理
const handleCropBoxData = (data) => {
  const cropBox = cropperRef.value.getCropBoxData()
  const newData = { ...cropBox }

  // 如果是横向拖动，保持高度不变
  if (Math.abs(cropBox.width - data.width) > Math.abs(cropBox.height - data.height)) {
    newData.height = cropBox.height
  }
  // 如果是纵向拖动，保持宽度不变
  else {
    newData.width = cropBox.width
  }

  // 更新裁剪框数据
  cropperRef.value.setCropBoxData(newData)
}

// 修改裁剪比例的方
const setAspectRatio = (ratio) => {
  console.log('setAspectRatio', ratio)
  if (cropperRef.value) {
    // 先清除现有的裁剪框
    cropperRef.value.clearCrop()
    
    // 设置新的比例
    if (ratio === 0) {
      // 自由裁剪
      cropOptions.value.fixed = false
      cropOptions.value.fixedNumber = [1, 1]
    } else if (ratio === 16/9) {
      // 16:9 比例
      cropOptions.value.fixed = true
      cropOptions.value.fixedNumber = [16, 9]
    } else if (ratio === 4/3) {
      // 4:3 比例
      cropOptions.value.fixed = true
      cropOptions.value.fixedNumber = [4, 3]
    } else {
      // 其他比例
      cropOptions.value.fixed = true
      cropOptions.value.fixedNumber = [ratio, 1]
    }
    
    // 刷新裁剪器
    nextTick(() => {
      if (cropperRef.value) {
        cropperRef.value.refresh()
        cropperRef.value.startCrop()
      }
    })
  }
}

// 自定义旋转角度
const customRotation = ref(45)

// 修改旋转图片的方法
const rotateImage = (angle) => {
  if (cropperRef.value) {
    // 获取当前旋转角度
    const currentRotate = cropperRef.value.$refs.cropper.rotate || 0
    // 计算新的旋转角度
    const newRotate = currentRotate + angle
    // 设置新的旋转角度
    cropperRef.value.$refs.cropper.rotate = newRotate
    // 刷新裁剪器
    cropperRef.value.refresh()
  }
}

// 修改翻转图片的方法
const flipImage = (direction) => {
console.log(cropperRef.value);

  if (direction === 'horizontal') {
    // 水平翻转
    cropperRef.value.value.scale(-1, 1)
  } else {
    // 垂直翻转
    cropperRef.value.value.scale(1, -1)
  }
}

// 缩放控制
const setZoom = (scale) => {
  cropperRef.value.changeScale(scale)
}

// 切换选项
const toggleOption = (option) => {
  cropOptions.value[option] = !cropOptions.value[option]
  if (cropperRef.value) {
    cropperRef.value.refresh()
  }
}

// 修改配置组定义，调整比例选项的顺序
const configGroups = [
  {
    id: 'ratio',
    title: '裁剪比例',
    options: [
      { value: 0, label: '自由裁剪' },  // 将自由裁剪放在第一位
      { value: 16/9, label: '16:9' },
      { value: 4/3, label: '4:3' },
      { value: 1, label: '1:1' }
    ]
  },
  {
    id: 'transform',
    title: '旋转',
    options: [
      { value: 'rotateRight90', label: '顺时针90°', action: () => cropperRef.value.rotateRight() },
      { value: 'rotateLeft90', label: '逆时针90°', action: () => cropperRef.value.rotateLeft() },
      { value: 'rotate45', label: '顺时针45°', action: () => rotateImage(45) },
      { value: 'rotateLeft45', label: '逆时针45°', action: () => rotateImage(-45) }
    ]
  },
  {
    id: 'quality',
    title: '输出设置',
    options: [
      { value: 'high', label: '高清输出', toggle: true },
      { value: 'full', label: '原比例输出', toggle: true }
    ]
  }
]

// 处理选项点击
const handleOptionClick = (option, groupId) => {
  if (option.toggle) {
    toggleOption(option.value)
  } else if (option.action) {
    option.action()
  } else if (groupId === 'ratio') {
    setAspectRatio(option.value)
  }
}

// 处理文件拖拽
const handleDrop = (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (file && file.type.includes('image')) {
    handleImage(file)
  }
}

// 处理粘贴
const handlePaste = (e) => {
  const items = e.clipboardData.items
  for (let item of items) {
    if (item.type.includes('image')) {
      const file = item.getAsFile()
      handleImage(file)
    }
  }
}

// 处理文件选择
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    handleImage(file)
  }
}

// 处理图片文件
const handleImage = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    imgUrl.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 裁剪完成
const cropFinish = () => {
  cropperRef.value.getCropData((data) => {
    // data 为裁剪后的 base64 片数
    console.log('裁剪后的图片：', data)
    // 这里可以将裁剪后的图片上传到服务器或进行其他操作
  })
}

// 添加拖拽状态处理
const handleDragEnter = (e) => {
  e.preventDefault()
  e.currentTarget.setAttribute('data-dragging', 'true')
}

const handleDragLeave = (e) => {
  e.preventDefault()
  e.currentTarget.setAttribute('data-dragging', 'false')
}
</script>

<template>
  <div class="container">
    <div class="tools-panel">
      <el-collapse v-model="activeNames">
        <el-collapse-item 
          v-for="group in configGroups" 
          :key="group.id"
          :name="group.id"
          :disabled="!imgUrl"
        >
          <template #title>
            {{ group.title }}
          </template>
          
          <div class="config-options">
            <template v-for="option in group.options" :key="option.value">
              <el-button
                :type="option.toggle ? (cropOptions[option.value] ? 'primary' : '') : 
                       cropOptions.aspectRatio === option.value ? 'primary' : ''"
                text
                @click="handleOptionClick(option, group.id)"
              >
                {{ option.label }}
              </el-button>
              <!-- 自定义旋转角度输入框 -->
              <el-input
                v-if="option.custom"
                v-model="customRotation"
                type="number"
                :min="-360"
                :max="360"
                placeholder="输入旋转角度"
                style="margin-top: 8px;"
              >
                <template #append>°</template>
              </el-input>
            </template>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button 
          type="danger" 
          :disabled="!imgUrl"
          @click="imgUrl = ''"
        >
          取消编辑
        </el-button>
        <el-button 
          type="primary"
          :disabled="!imgUrl"
          @click="cropFinish"
        >
          确认裁剪
        </el-button>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="content-panel">
      <div 
        class="image-upload-container"
        @drop="handleDrop"
        @dragover.prevent
        @paste="handlePaste"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
      >
        <div v-if="!imgUrl" class="upload-area">
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

        <div v-else class="cropper-container">
          <vue-cropper
            ref="cropperRef"
            :img="imgUrl"
            v-bind="cropOptions"
            @cropend="handleCropBoxData"
            @realTime="cropFinish"
          />
        </div>
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

/* 操作按钮容器 */
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

/* 添加点击空白处关闭拉面板的处理 */
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

/* 操作按钮样式优化 */
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
</style>
