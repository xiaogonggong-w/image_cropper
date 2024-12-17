<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted, reactive, watch } from 'vue'
import { ElCollapse, ElCollapseItem, ElButton, ElInput, ElTooltip, ElColorPicker, ElSlider, ElScrollbar, ElRadioGroup, ElRadio, ElSelect, ElOption } from 'element-plus'
import 'element-plus/dist/index.css'
import hb from '../assets/hb.svg'
import msk from '../assets/msk.svg'
import redo from '../assets/redo.svg'
import undo from '../assets/undo.svg'

const canvasRef = ref(null)
const cropBoxRef = ref(null)
const originalImage = ref(null)
const cropArea = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isDragging: false,
  isResizing: false
})
// 添加画笔相关状态
const brushColor = ref('#FF0000') // 默认色
const brushSize = ref(5) // 默认大小
// 尺寸、旋转、缩放、位置
const config = reactive({
  rotateAngle: 0,
  scale: 100,
  watermark: {
    text: '',
    size: 24,
    color: '#000000',
    opacity: 50,
    mode: 'single',
    position: {
      x: 0,
      y: 0
    }
  }
})

// 撤销恢复的历史状态
const redoHistory = ref([])

// 添加历史记录状态
const drawHistory = ref([])
const maxHistoryLength = 20 // 限制历史记录数量

// 添加 editor-container 的引用
const containerRef = ref(null)

// 添加形状相关的响应式变量
const cropShape = ref('rect') // 默认矩形
const shapeOptions = [
  { label: '矩形', value: 'rect' },
  { label: '圆形', value: 'circle' }
]

// 添加背景颜色状态
const backgroundColor = ref('#FFFFFF') // 默认白色背景

function handleCanvasDraw() {
  if (!canvasRef.value || !originalImage.value) return

  const ctx = canvasRef.value.getContext('2d')
  const canvas = canvasRef.value

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 保存当前状态
  ctx.save()

  // 旋转
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((config.rotateAngle * Math.PI) / 180)

  // 缩放
  const baseScale = Math.min(
    canvas.width / originalImage.value.width,
    canvas.height / originalImage.value.height
  )
  const finalScale = baseScale * (config.scale / 100)

  // 绘制图片
  ctx.drawImage(
    originalImage.value,
    -originalImage.value.width * finalScale / 2,
    -originalImage.value.height * finalScale / 2,
    originalImage.value.width * finalScale,
    originalImage.value.height * finalScale
  )

  // 恢复状态
  ctx.restore()

  // 恢复水印
  drawWatermark()

  // ��复马赛克和画笔
  restoreToolsOperations()
}

// 修改旋转处理方法
const handleRotate = (value) => {
  if (!cropArea.value || !canvasRef.value || !originalImage.value) return

  // 如果是点击按钮入的值，直接加到当前角度上
  if (typeof value === 'number') {
    config.rotateAngle = ((config.rotateAngle + value) % 360 + 360) % 360
  } else {
    // 如果是输入框输入的值，直接设置角度
    const angle = parseInt(value)
    if (isNaN(angle)) return
    config.rotateAngle = ((angle % 360) + 360) % 360
  }

  // 更新图片位置和尺寸
  updateImagePosition()
  handleCanvasDraw()
}

// 修改缩放处理方法
const handleScale = (value) => {
  if (!canvasRef.value || !originalImage.value) return

  let newScale
  if (typeof value === 'number') {
    // 按钮点击，增加或减少缩放
    newScale = Math.min(200, Math.max(10, config.scale + value))
  } else {
    // 输入框输入
    newScale = Math.min(200, Math.max(10, parseInt(value) || 100))
  }

  config.scale = newScale

  // 更新图片位置和尺寸
  updateImagePosition()
  handleCanvasDraw()
}

// 添加更新图片位置和尺寸的方法
const updateImagePosition = () => {
  if (!canvasRef.value || !originalImage.value) return

  const canvas = canvasRef.value
  const image = originalImage.value

  // 计算基础缩放比例
  const baseScale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height
  )
  const finalScale = baseScale * (config.scale / 100)

  // 计算旋转后的尺寸
  const angle = (config.rotateAngle * Math.PI) / 180
  const rotatedWidth = Math.abs(Math.cos(angle) * image.width * finalScale) + 
                      Math.abs(Math.sin(angle) * image.height * finalScale)
  const rotatedHeight = Math.abs(Math.sin(angle) * image.width * finalScale) + 
                       Math.abs(Math.cos(angle) * image.height * finalScale)

  // 更新图片位置信息
  imagePosition.value = {
    x: (canvas.width - rotatedWidth) / 2,
    y: (canvas.height - rotatedHeight) / 2,
    width: rotatedWidth,
    height: rotatedHeight,
    scale: finalScale
  }
}

// 添加预定义颜色
const predefineColors = [
  '#ff4500',
  '#ff8c00',
  '#ffd700',
  '#90ee90',
  '#00ced1',
  '#1e90ff',
  '#c71585',
  '#000000',
  '#ffffff'
]

// 修改水印颜色处理方法
const handleWatermarkColorChange = (color) => {
  config.watermark.color = color
  updateWatermark()
}


// 修改水印位置处理方法
const handleWatermarkPosition = (position) => {
  if (!cropArea.value) return

  const area = cropArea.value
  const padding = config.watermark.size // 使用文字大小作为距

  switch (position) {
    case 'left-top':
      config.watermark.position = {
        x: area.x + padding,
        y: area.y + padding
      }
      break
    case 'center-top':
      config.watermark.position = {
        x: area.x + area.width / 2,
        y: area.y + padding
      }
      break
    case 'right-top':
      config.watermark.position = {
        x: area.x + area.width - padding,
        y: area.y + padding
      }
      break
    case 'center':
      config.watermark.position = {
        x: area.x + area.width / 2,
        y: area.y + area.height / 2
      }
      break
    case 'left-bottom':
      config.watermark.position = {
        x: area.x + padding,
        y: area.y + area.height - padding
      }
      break
    case 'center-bottom':
      config.watermark.position = {
        x: area.x + area.width / 2,
        y: area.y + area.height - padding
      }
      break
    case 'right-bottom':
      config.watermark.position = {
        x: area.x + area.width - padding,
        y: area.y + area.height - padding
      }
      break
  }

  updateWatermark()
}

// 添加水印默认位置初始
const initWatermarkPosition = () => {
  if (!cropArea.value) return

  // 设置水印位置为裁剪框中心
  config.watermark.position = {
    x: cropArea.value.x + cropArea.value.width / 2,
    y: cropArea.value.y + cropArea.value.height / 2
  }
}


// 分离水印绘制为独立方法
const drawWatermark = () => {
  if (!canvasRef.value || !config.watermark.text || !cropArea.value) return

  const ctx = canvasRef.value.getContext('2d')
  const area = cropArea.value

  // 保存当前状态
  ctx.save()

  // 设置裁剪区域为裁剪框大小
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.width, area.height)
  ctx.clip()

  // 设置水印样式
  ctx.font = `${config.watermark.size}px Arial`

  // 处理颜色和透明度
  const opacity = config.watermark.opacity / 100
  if (config.watermark.color.startsWith('#')) {
    const r = parseInt(config.watermark.color.slice(1, 3), 16)
    const g = parseInt(config.watermark.color.slice(3, 5), 16)
    const b = parseInt(config.watermark.color.slice(5, 7), 16)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  } else {
    ctx.fillStyle = config.watermark.color.replace(/[\d.]+\)$/, `${opacity})`)
  }

  if (config.watermark.mode === 'single') {
    // 单个水印
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      config.watermark.text,
      config.watermark.position.x,
      config.watermark.position.y
    )
  } else {
    // 满屏水印
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const textWidth = ctx.measureText(config.watermark.text).width
    const gap = textWidth + 50

    // 设置旋转中心点为裁剪框中心
    const centerX = area.x + area.width / 2
    const centerY = area.y + area.height / 2

    ctx.translate(centerX, centerY)
    ctx.rotate(-30 * Math.PI / 180)
    ctx.translate(-centerX, -centerY)

    // 计算需要绘制的范围
    const startX = area.x - gap
    const startY = area.y - gap
    const endX = area.x + area.width + gap
    const endY = area.y + area.height + gap

    // 绘制水印网格
    for (let y = startY; y < endY; y += gap) {
      for (let x = startX; x < endX; x += gap) {
        ctx.fillText(config.watermark.text, x, y)
      }
    }
  }

  // 恢复状态
  ctx.restore()
}

// 修改更新水印方法
const updateWatermark = () => {
  // 重绘图片和水印
  if (originalImage.value) {
    handleCanvasDraw()
  }
}



// 修改尺寸修改处方法
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

}



// 修改位置控制方法
const handlePositionChange = (axis, value) => {
  if (!cropArea.value || !canvasRef.value) return

  const newValue = Math.round(parseInt(value))
  if (isNaN(newValue)) return

  const img = imagePosition.value

  // 直接使用相对坐标，不需要虑负值
  if (axis === 'x') {
    cropArea.value.x = img.x + Math.min(newValue, img.width - cropArea.value.width)
  } else {
    cropArea.value.y = img.y + Math.min(newValue, img.height - cropArea.value.height)
  }

  updateCropBoxPosition()
}

// 修改快捷置处理方法
const handleQuickPosition = (position) => {
  if (!cropArea.value || !canvasRef.value) return

  const img = imagePosition.value
  const area = cropArea.value

  switch (position) {
    case 'left-top':
      area.x = img.x
      area.y = img.y
      break
    case 'center-top':
      area.x = img.x + (img.width - area.width) / 2
      area.y = img.y
      break
    case 'right-top':
      area.x = img.x + img.width - area.width
      area.y = img.y
      break
    case 'center':
      area.x = img.x + (img.width - area.width) / 2
      area.y = img.y + (img.height - area.height) / 2
      break
    case 'left-bottom':
      area.x = img.x
      area.y = img.y + img.height - area.height
      break
    case 'center-bottom':
      area.x = img.x + (img.width - area.width) / 2
      area.y = img.y + img.height - area.height
      break
    case 'right-bottom':
      area.x = img.x + img.width - area.width
      area.y = img.y + img.height - area.height
      break
  }

  updateCropBoxPosition()
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

  // 置画布大小
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

  // 记录图片位置
  imagePosition.value = {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight,
    scale
  }

  // 绘制图片
  ctx.drawImage(
    image,
    x, y,
    scaledWidth,
    scaledHeight
  )

  // 初始化裁剪框位置 - 居中显示，基于图片位置
  const cropWidth = Math.min(scaledWidth * 0.8, canvas.width * 0.8)
  const cropHeight = cropWidth * 9 / 16

  cropArea.value = {
    x: x + (scaledWidth - cropWidth) / 2,  // 基于图片位置居中
    y: y + (scaledHeight - cropHeight) / 2, // 基于图片位置居中
    width: cropWidth,
    height: cropHeight,
    isDragging: false,
    isResizing: false
  }

  // 更新裁剪框位置
  updateCropBoxPosition()

  // 初始化水印位置
  initWatermarkPosition()
}

// 添加图片位置状态
const imagePosition = ref({ x: 0, y: 0, width: 0, height: 0 })

watch(() => imagePosition.value, (newVal) => {
  console.log('imagePosition', newVal)
})

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

// 修改裁剪框拖动处理
const handleCropBoxMouseDown = (e) => {
  if (['mosaic', 'brush'].includes(currentTool.value)) return // 马赛克和画笔模式下都禁止拖动裁剪框

  e.preventDefault()
  cropArea.value.isDragging = true

  const startX = e.clientX - cropArea.value.x
  const startY = e.clientY - cropArea.value.y

  const handleMouseMove = (e) => {
    if (!cropArea.value.isDragging) return

    const newX = e.clientX - startX
    const newY = e.clientY - startY
    const canvas = canvasRef.value

    // 制在画布范围内
    cropArea.value.x = Math.min(canvas.width - cropArea.value.width, Math.max(0, newX))
    cropArea.value.y = Math.min(canvas.height - cropArea.value.height, Math.max(0, newY))

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

// 确认裁剪
const confirmCrop = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const area = cropArea.value

  // 设置输出画布大小
  canvas.width = area.width
  canvas.height = area.height

  // 先填充背景色
  ctx.fillStyle = backgroundColor.value
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 根据不同形状进行裁剪
  ctx.beginPath()
  switch (cropShape.value) {
    case 'circle':
      const radius = Math.min(area.width, area.height) / 2
      ctx.arc(area.width / 2, area.height / 2, radius, 0, Math.PI * 2)
      break
    case 'ellipse':
      ctx.ellipse(
        area.width / 2,
        area.height / 2,
        area.width / 2,
        area.height / 2,
        0,
        0,
        Math.PI * 2
      )
      break
    default: // rect
      ctx.rect(0, 0, area.width, area.height)
  }
  ctx.clip()

  // 计算图片在裁剪框中的相对位置
  const img = imagePosition.value
  const sourceX = Math.max(0, area.x - img.x)
  const sourceY = Math.max(0, area.y - img.y)
  const sourceWidth = Math.min(img.width - sourceX, area.width)
  const sourceHeight = Math.min(img.height - sourceY, area.height)

  // 计算图片在画布上的绘制位置
  const destX = Math.max(0, img.x - area.x)
  const destY = Math.max(0, img.y - area.y)

  // 绘制图片
  ctx.drawImage(
    canvasRef.value,
    sourceX + img.x, sourceY + img.y, sourceWidth, sourceHeight,
    destX, destY, sourceWidth, sourceHeight
  )

  // 下载裁剪后的图片
  const link = document.createElement('a')
  link.download = `cropped_${Date.now()}.png`
  link.href = canvas.toDataURL()
  link.click()
}

// 处控制点拖动
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
          // 只处理边界
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
          // 只理下边界
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

// 添加工具相关状态
const currentTool = ref(null)
const isDrawing = ref(false)
const lastPos = ref({ x: 0, y: 0 })

// 修改切换工具方法
const toggleTool = (tool) => {
  console.log('toggleTool', tool, currentTool.value);

  if (currentTool.value === tool) {
    currentTool.value = null
    canvasRef.value.style.cursor = 'default'
    cropBoxRef.value.style.pointerEvents = 'auto'
  } else {
    currentTool.value = tool
    if (['mosaic', 'brush'].includes(tool)) {  // 马赛克和画笔工具都需禁用裁剪框
      console.log('来来没')
      canvasRef.value.style.cursor = 'crosshair'
      cropBoxRef.value.style.pointerEvents = 'none'

      // 设置画笔样式
      if (tool === 'brush') {
        const ctx = canvasRef.value.getContext('2d')
        ctx.strokeStyle = brushColor.value
        ctx.lineWidth = brushSize.value
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }
}

// 修改检查点是否在裁剪区域内的方法
const isPointInCropArea = (x, y) => {
  const area = cropArea.value
  const image = imagePosition.value
  const mosaicSize = 10 // 马赛克块大小

  // 考虑马赛克块大小的边界检查
  return (
    x >= area.x &&
    x <= area.x + area.width &&
    y >= area.y &&
    y <= area.y + area.height &&
    x >= image.x + mosaicSize/2 &&
    x <= image.x + image.width - mosaicSize/2 &&
    y >= image.y + mosaicSize/2 &&
    y <= image.y + image.height - mosaicSize/2
  )
}

// 修改马赛克绘制方法
const drawMosaic = (x, y) => {
  if (!isPointInCropArea(x, y)) return

  const ctx = canvasRef.value.getContext('2d')
  const size = 10 // 马赛克块大小

  // 获取起点和终点之间的所有点
  const points = getLinePoints(lastPos.value.x, lastPos.value.y, x, y)

  // 过滤掉靠近边缘的点
  const validPoints = points.filter(point => {
    const img = imagePosition.value
    return (
      point.x >= img.x + size/2 &&
      point.x <= img.x + img.width - size/2 &&
      point.y >= img.y + size/2 &&
      point.y <= img.y + img.height - size/2
    )
  })

  drawMosaicOperation(ctx, size, validPoints)

  // 保存马赛克操作
  const len = drawHistory.value.length;
  drawHistory.value[len - 1].data.push({
    size: size,
    points: validPoints
  })
}
// 制马赛克
const drawMosaicOperation = (ctx, size, points) => {
  points.forEach(point => {
    if (!isPointInCropArea(point.x, point.y)) return

    // 对齐到网格
    const gridX = Math.floor(point.x / size) * size
    const gridY = Math.floor(point.y / size) * size

    // 获取区域的平均颜色
    const imageData = ctx.getImageData(gridX, gridY, size, size)
    const color = getAverageColor(imageData.data)

    // 填充马赛克块
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    ctx.fillRect(gridX, gridY, size, size)
  })
}

// 恢复马赛克和画笔
const restoreToolsOperations = () => {
  const ctx = canvasRef.value.getContext('2d')

  drawHistory.value.forEach(item => {
    if (item.type === 'mosaic') {
      item.data.forEach(data => {
        drawMosaicOperation(ctx, data.size, data.points)
      })
    } else if (item.type === 'brush') {
      item.data.forEach(data => {
        drawBrushOperation(ctx, data.points)
      })
    }
  })
}

// 修改画笔绘制方法
const drawBrush = (x, y) => {
  if (!isPointInCropArea(x, y)) return
  // 在绘制前保存当前状态
  // if (!lastPos.value.x && !lastPos.value.y) {
  //   saveDrawState()
  // }
  const ctx = canvasRef.value.getContext('2d')

  // 使用裁剪区域限制绘制范围
  // ctx.save()
  ctx.beginPath()
  ctx.rect(cropArea.value.x, cropArea.value.y, cropArea.value.width, cropArea.value.height)
  ctx.clip()
  drawBrushOperation(ctx, {
    x1: lastPos.value.x,
    y1: lastPos.value.y,
    x2: x,
    y2: y
  })


  // ctx.restore()

  // 保存画笔操作
  const len = drawHistory.value.length;
  drawHistory.value[len - 1].data.push({
    size: brushSize.value,
    points: {
      x1: lastPos.value.x,
      y1: lastPos.value.y,
      x2: x,
      y2: y
    }
  })
}
// 绘制画笔操作
const drawBrushOperation = (ctx, point) => {
  // 绘制线条
  ctx.beginPath()
  ctx.moveTo(point.x1, point.y1)
  ctx.lineTo(point.x2, point.y2)
  ctx.strokeStyle = brushColor.value
  ctx.lineWidth = brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// 鼠标按下
const handleCanvasMouseDown = (e) => {
  if (!currentTool.value || !['mosaic', 'brush'].includes(currentTool.value)) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 检查起始点是否在裁剪框内
  if (!isPointInCropArea(x, y)) return

  isDrawing.value = true
  lastPos.value = { x, y }
  // 开始绘制前保存状态
  saveDrawState()
  // 开始新的路径
  if (currentTool.value === 'brush') {
    drawBrush(x, y);
  } else if (currentTool.value === 'mosaic') {
    drawMosaic(x, y)
  }
}

// 鼠标移动
const handleCanvasMouseMove = (e) => {
  if (!isDrawing.value || !currentTool.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (currentTool.value === 'brush') {
    drawBrush(x, y)
  } else if (currentTool.value === 'mosaic') {
    drawMosaic(x, y)
  }

  lastPos.value = { x, y }
}

// 鼠标抬起
const handleCanvasMouseUp = () => {
  isDrawing.value = false
  console.log('drawHistory', drawHistory.value)
}

// 获取两点之间的所有点
const getLinePoints = (x1, y1, x2, y2) => {
  const points = []
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  const sx = x1 < x2 ? 1 : -1
  const sy = y1 < y2 ? 1 : -1
  let err = dx - dy

  let x = x1
  let y = y1

  while (true) {
    points.push({ x, y })
    if (x === x2 && y === y2) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

// 获区域平均颜色
const getAverageColor = (data) => {
  let r = 0, g = 0, b = 0
  const count = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  }
}





// 添加保存历史记录的方法
const saveDrawState = () => {
  if (!canvasRef.value) return

  // 保存状态是保存数据
  drawHistory.value.push({
    type: currentTool.value,
    data: []
  })
}

// 修改撤销方法
const undoDraw = () => {
  if (!drawHistory.value.length || !canvasRef.value) return

  // 获取当前状态并保存到恢复历史
  const previousState = drawHistory.value.pop()

  console.log('previousState', previousState)
  redoHistory.value.push(previousState)

  // 恢复马赛克和画笔
  const ctx = canvasRef.value.getContext('2d')
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 重新绘制原图
  handleCanvasDraw()
}

// 添加恢复方法
const redoDraw = () => {
  if (!redoHistory.value.length || !canvasRef.value) return
  // 获取下一个状态
  const nextState = redoHistory.value.pop()
  // 获取当前状态并保存到撤销历史
  drawHistory.value.push(nextState)
  // 恢复马赛克和画笔
  // 清除上面的马赛克
  const ctx = canvasRef.value.getContext('2d')
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 重新绘制原图
  handleCanvasDraw()


}

// 修改键快捷键支持
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    // Ctrl+Z 撤销
    if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
      e.preventDefault()
      undoDraw()
    }
    // Ctrl+Shift+Z 或 Ctrl+Y 恢复
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault()
      redoDraw()
    }
  })
})

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste)
})

// 处理粘贴事件
const handlePaste = (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      const reader = new FileReader()
      reader.onload = (e) => {
        // 将图像数据放置在预览区
        const img = new Image()
        img.onload = () => {
          originalImage.value = img
          // 这里可以调用绘制函数
          nextTick(() => {
            initCanvas(img)
          })
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }
  }
}

// 修改形状切换处理方法
const handleShapeChange = (shape) => {
  const area = cropArea.value
  cropShape.value = shape
  
  // 只在切换到圆形时进行调整
  if (shape === 'circle') {
    // 圆形需要保持正方形，以较小边为基准
    const size = Math.min(area.width, area.height)
    // 调整位置使其居中
    area.x += (area.width - size) / 2
    area.y += (area.height - size) / 2
    area.width = size
    area.height = size
  }
  // 切换到矩形时不需要特殊处理
  
  updateCropBoxPosition()
}

</script>

<template>
  <div class="container">
    <!-- 侧配置面板 -->
    <div class="tools-panel">
      <el-scrollbar :always="true">
       <!-- 在尺寸调整面板中添加形状选择 -->
        <div class="size-panel">
          <div class="panel-title">裁剪框形状选择</div>
          <div class="size-inputs">
            <div class="size-input-group">
              <span class="size-label">形状</span>
              <el-select v-model="cropShape" @change="handleShapeChange">
                <el-option
                  v-for="option in shapeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>
        </div>
        <!-- 尺寸调整输入框 -->
        <div class="size-panel">
          <div class="panel-title">尺寸调整</div>
          <div class="size-inputs">
            <div class="size-input-group">
              <span class="size-label">宽度</span>
              <el-input v-model.number="cropArea.width" type="number" :max="canvasRef?.width || 0"
                @input="value => handleSizeChange('width', value)">
                <template #append>px</template>
              </el-input>
            </div>
            <div class="size-input-group">
              <span class="size-label">高度</span>
              <el-input v-model.number="cropArea.height" type="number" :max="canvasRef?.height || 0"
                @input="value => handleSizeChange('height', value)">
                <template #append>px</template>
              </el-input>
            </div>
          </div>
        </div>

        <!-- 位置控制面板 -->
        <div class="size-panel">
          <div class="panel-title">位置控制</div>
          <div class="size-inputs">
            <div class="size-input-group">
              <span class="size-label">X轴</span>
              <el-input :model-value="Math.round(cropArea.x - imagePosition.x)" type="number" :min="0"
                :max="imagePosition.width - cropArea.width" @input="value => handlePositionChange('x', value)">
                <template #append>px</template>
              </el-input>
            </div>
            <div class="size-input-group">
              <span class="size-label">Y轴</span>
              <el-input :model-value="Math.round(cropArea.y - imagePosition.y)" type="number" :min="0"
                :max="imagePosition.height - cropArea.height" @input="value => handlePositionChange('y', value)">
                <template #append>px</template>
              </el-input>
            </div>
            <!-- 快捷位置按钮 -->
            <div class="position-buttons">
              <el-button @click="handleQuickPosition('left-top')">左上</el-button>
              <el-button @click="handleQuickPosition('center-top')">顶部居中</el-button>
              <el-button @click="handleQuickPosition('right-top')">右上</el-button>
            </div>
            <div class="position-buttons">
              <el-button @click="handleQuickPosition('center')">居中</el-button>
            </div>
            <div class="position-buttons">
              <el-button @click="handleQuickPosition('left-bottom')">左下</el-button>
              <el-button @click="handleQuickPosition('center-bottom')">底部居中</el-button>
              <el-button @click="handleQuickPosition('right-bottom')">右下</el-button>
            </div>
          </div>
        </div>

        <!-- 旋转控制面板 -->
        <div class="size-panel">
          <div class="panel-title">旋转控制</div>
          <div class="size-inputs">
            <div class="size-input-group">
              <span class="size-label">角度</span>
              <el-input v-model.number="config.rotateAngle" type="number" :min="-360" :max="360" @input="handleRotate">
                <template #append>°</template>
              </el-input>
            </div>
            <!-- 快捷��转按钮 -->
            <div class="rotate-buttons">
              <el-button @click="handleRotate(-90)">左转90°</el-button>
              <el-button @click="handleRotate(90)">右转90°</el-button>
            </div>
          </div>
        </div>

        <!-- 缩放控制面板 -->
        <div class="size-panel">
          <div class="panel-title">缩放控制</div>
          <div class="size-inputs">
            <div class="size-input-group">
              <span class="size-label">缩放</span>
              <el-input v-model.number="config.scale" type="number" :min="10" :max="200" @input="handleScale">
                <template #append>%</template>
              </el-input>
            </div>
            <!-- 快捷缩放按钮 -->
            <div class="scale-buttons">
              <el-button @click="handleScale(-10)">缩小10%</el-button>
              <el-button @click="handleScale(10)">放大10%</el-button>
            </div>
            <div class="scale-buttons">
              <el-button @click="handleScale(100 - config.scale)">重置(100%)</el-button>
            </div>
          </div>
        </div>

        <!-- 在位置控制面板后添加水印配置面板 -->
        <div class="size-panel">
          <div class="panel-title">水印设置</div>
          <div class="size-inputs">
            <!-- 水印文本输入 -->
            <div class="size-input-group">
              <span class="size-label">文本</span>
              <el-input v-model="config.watermark.text" placeholder="请输入水印文字" @change="updateWatermark" />
            </div>

            <!-- 水印模式 -->
            <div class="size-input-group">
              <span class="size-label">模式</span>
              <el-radio-group v-model="config.watermark.mode" @change="updateWatermark">
                <el-radio value="single" label="单个">单个</el-radio>
                <el-radio value="full" label="满屏">满屏</el-radio>
              </el-radio-group>
            </div>

            <!-- 单个水印位置控制 -->
            <template v-if="config.watermark.mode === 'single'">
              <div class="size-input-group">
                <span class="size-label">X轴</span>
                <el-input v-model.number="config.watermark.position.x" type="number" :min="0"
                  :max="canvasRef?.width || 0" @input="updateWatermark">
                  <template #append>px</template>
                </el-input>
              </div>
              <div class="size-input-group">
                <span class="size-label">Y轴</span>
                <el-input v-model.number="config.watermark.position.y" type="number" :min="0"
                  :max="canvasRef?.height || 0" @input="updateWatermark">
                  <template #append>px</template>
                </el-input>
              </div>
              <!-- 快捷位置按钮 -->
              <div class="position-buttons">
                <el-button @click="handleWatermarkPosition('left-top')">左上</el-button>
                <el-button @click="handleWatermarkPosition('center-top')">顶部居中</el-button>
                <el-button @click="handleWatermarkPosition('right-top')">右上</el-button>
              </div>
              <div class="position-buttons">
                <el-button @click="handleWatermarkPosition('center')">居中</el-button>
              </div>
              <div class="position-buttons">
                <el-button @click="handleWatermarkPosition('left-bottom')">左下</el-button>
                <el-button @click="handleWatermarkPosition('center-bottom')">底部居中</el-button>
                <el-button @click="handleWatermarkPosition('right-bottom')">右下</el-button>
              </div>
            </template>

            <!-- 其他印设置保持不变 -->
            <div class="size-input-group">
              <span class="size-label">大小</span>
              <el-input v-model.number="config.watermark.size" type="number" :min="12" :max="72"
                @input="updateWatermark">
                <template #append>px</template>
              </el-input>
            </div>

            <!-- 水印颜色 -->
            <div class="size-input-group color-picker-group">
              <span class="size-label">颜色</span>
              <el-color-picker v-model="config.watermark.color" :predefine="predefineColors" show-alpha
                @change="handleWatermarkColorChange" />
            </div>

            <!-- 水印透明度 -->
            <div class="size-input-group">
              <span class="size-label">透明度</span>
              <el-slider v-model="config.watermark.opacity" :min="0" :max="100" @input="updateWatermark" />
            </div>
          </div>
        </div>

        <!-- 在尺寸调整面板中添加背景颜色选择器 -->
        <div class="size-panel">
          <div class="panel-title">导出设置</div>
          <div class="size-inputs">
            <div class="size-input-group color-picker-group">
              <span class="size-label">背景色</span>
              <el-color-picker 
                v-model="backgroundColor"
                :predefine="predefineColors"
                show-alpha
              />
            </div>
          </div>
        </div>

      </el-scrollbar>



      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="danger" :disabled="!originalImage" @click="originalImage = null">
          取消编辑
        </el-button>
        <el-button type="primary" :disabled="!originalImage" @click="confirmCrop">
          确认裁剪
        </el-button>
      </div>
    </div>

    <!-- 右侧编辑区域 -->
    <div class="content-panel">
      <!-- 编辑器容器 -->
      <div ref="containerRef" class="editor-container">
        <div v-if="!originalImage" class="upload-area">
          <input type="file" accept="image/*" @change="handleFileChange" class="file-input" id="file-input">
          <label for="file-input" class="upload-content">
            <div class="upload-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div class="upload-text">
              <h3>上传图片</h3>
              <p>点击选择或拖拽图到此处</p>
              <span class="upload-hint">持 JPG、PNG、GIF 等格式</span>
            </div>
          </label>
        </div>

        <template v-else>
          <canvas ref="canvasRef" class="editor-canvas" :class="{ drawing: isDrawing }"
            @mousedown="handleCanvasMouseDown" @mousemove="handleCanvasMouseMove" @mouseup="handleCanvasMouseUp"
            @mouseleave="handleCanvasMouseUp"></canvas>

          <!-- 裁剪框 -->
          <div ref="cropBoxRef" class="crop-box" 
            :data-shape="cropShape"
            @mousedown="handleCropBoxMouseDown"
            :style="{ 
              pointerEvents: ['mosaic', 'brush'].includes(currentTool) ? 'none' : 'auto'
            }"
          >
            <!-- 四角的控制点 -->
            <div class="resize-handle corner top-left" @mousedown="(e) => handleResizeMouseDown(e, 'top-left')"></div>
            <div class="resize-handle corner top-right" @mousedown="(e) => handleResizeMouseDown(e, 'top-right')"></div>
            <div class="resize-handle corner bottom-left" @mousedown="(e) => handleResizeMouseDown(e, 'bottom-left')">
            </div>
            <div class="resize-handle corner bottom-right" @mousedown="(e) => handleResizeMouseDown(e, 'bottom-right')">
            </div>

            <!-- 边的中点控制点 -->
            <div class="resize-handle edge top" @mousedown="(e) => handleResizeMouseDown(e, 'top')"></div>
            <div class="resize-handle edge right" @mousedown="(e) => handleResizeMouseDown(e, 'right')"></div>
            <div class="resize-handle edge bottom" @mousedown="(e) => handleResizeMouseDown(e, 'bottom')"></div>
            <div class="resize-handle edge left" @mousedown="(e) => handleResizeMouseDown(e, 'left')"></div>
          </div>
        </template>
      </div>

      <!-- 底部工具栏 -->
      <div v-if="originalImage" class="bottom-toolbar">
        <el-tooltip content="马赛克" placement="top">
          <div class="tool-item" :class="{ active: currentTool === 'mosaic' }" @click="toggleTool('mosaic')">
            <img :src="msk" alt="马赛克" style="width: 1em; height: 1em;">
          </div>
        </el-tooltip>

        <el-tooltip content="画笔" placement="top">
          <div class="tool-item" :class="{ active: currentTool === 'brush' }" @click="toggleTool('brush')">
            <img :src="hb" alt="画笔" style="width: 1em; height: 1em;">
          </div>
        </el-tooltip>

        <el-tooltip content="撤销" placement="top">
          <div class="tool-item" :class="{ disabled: !drawHistory.length }" @click="drawHistory.length && undoDraw()">
            <img :src="undo" alt="撤销" style="width: 1em; height: 1em;">
          </div>
        </el-tooltip>

        <el-tooltip content="恢复" placement="top">
          <div class="tool-item" :class="{ disabled: !redoHistory.length }" @click="redoHistory.length && redoDraw()">
            <img :src="redo" alt="恢复" style="width: 1em; height: 1em;">
          </div>
        </el-tooltip>
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
  gap: 16px;
  height: 100%;
  background: #f5f5f5;
}

/* 标样式 */
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

/* 操作按钮器 */
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

/* 添加禁用状态样式 */
.tool-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-item.disabled:hover {
  background: #f5f5f5;
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

/* 覆盖 Element Plus 的一些认样式 */
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



:deep(.el-button.is-text) {
  padding: 8px;
}

.el-button+.el-button {
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-item:hover {
  background: #e3f2fd;
}

.tool-item.active {
  background: #e3f2fd;
  border: 2px solid #1976d2;
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
  user-select: none;
  /* 防止拖动时选文本 */
}

.editor-canvas.drawing {
  cursor: none;
}

.editor-container {
  flex: 1;
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

/* 剪框式 */
.crop-box {
  position: absolute;
  border: 2px solid #fff;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
}

/* 圆形裁剪框 */
.crop-box[data-shape="circle"] {
  border-radius: 50%;
}

/* 椭圆形裁剪框 */
.crop-box[data-shape="ellipse"] {
  border-radius: 50% / 50%; /* 使用百分比值使其能够适应不同的宽高比 */
}

/* 确保选择器样式正确 */
:deep(.el-select) {
  width: 100%;
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

/* 调整制点样式 */
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

/* 确保输入框和按钮样式一 */
:deep(.el-input-number) {
  width: 100%;
}

/* 添加缩放按钮样式 */
.scale-buttons {
  display: flex;
  gap: 8px;
}

.scale-buttons .el-button {
  flex: 1;
}

/* 添加位置按钮样式 */
.position-buttons {
  display: flex;
  gap: 8px;
}

.position-buttons .el-button {
  flex: 1;
  padding: 6px;
  font-size: 12px;
}

/* 修改编辑区域布 */
.editor-wrapper {
  display: none;
}

.side-toolbar {
  display: none;
}

/* 底部工具栏样式 */
.bottom-toolbar {
  height: 48px;
  padding: 0 16px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  /* 增加工具之间间距 */
}

.tool-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f5f5f5;
  border-radius: 4px;
  transition: all 0.2s;
}

.tool-item:hover {
  background: #e3f2fd;
}

.tool-item.active {
  background: #e3f2fd;
  border: 2px solid #1976d2;
}

/* 修改颜色选择器样式 */
.color-picker-group {
  position: relative;
}

.color-picker-group :deep(.el-color-picker) {
  width: 100%;
}

.color-picker-group :deep(.el-color-picker__trigger) {
  width: 100%;
  height: 32px;
  padding: 2px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.color-picker-group :deep(.el-color-picker__color) {
  border: none;
}

/* 确保颜色面板显示在正确位置 */
:deep(.el-color-picker__panel) {
  position: fixed !important;
}
</style>
