export const deepClone = (obj) => {
    // 处理基本类型和 null
    if (obj === null || typeof obj !== 'object') {
      return obj
    }
  
    // 处理日期对象
    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }
  
    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item))
    }
  
    // 处理普通对象
    const clonedObj = {}
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key])
    })
    return clonedObj
  }