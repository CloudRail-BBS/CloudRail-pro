const svgNamespace = 'http://www.w3.org/2000/svg'
let nextId = 0

/** 生成圆角矩形的法线位移图。只在尺寸 / 圆角变化时运行，不逐帧截图。 */
function displacementTexture(width: number, height: number, radius: number) {
  const ratio = Math.min(1, 512 / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * ratio))
  canvas.height = Math.max(1, Math.round(height * ratio))
  const context = canvas.getContext('2d')
  if (!context)
    return ''

  const pixels = context.createImageData(canvas.width, canvas.height)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const corner = Math.min(radius, halfWidth, halfHeight)
  const bevel = Math.max(1, Math.min(corner * 0.65, Math.min(width, height) * 0.3))

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const px = (x + 0.5) / ratio - halfWidth
      const py = (y + 0.5) / ratio - halfHeight
      const qx = Math.abs(px) - halfWidth + corner
      const qy = Math.abs(py) - halfHeight + corner
      const ox = Math.max(qx, 0)
      const oy = Math.max(qy, 0)
      const distance = Math.hypot(ox, oy)
      const depth = corner - distance - Math.min(Math.max(qx, qy), 0)
      const bend = depth >= 0 ? (Math.max(0, 1 - depth / bevel)) ** 2 : 0
      const nx = distance > 0 ? ox / distance : Number(qx > qy)
      const ny = distance > 0 ? oy / distance : Number(qy >= qx)
      const offset = (y * canvas.width + x) * 4
      pixels.data[offset] = 128 - Math.sign(px) * nx * bend * 127
      pixels.data[offset + 1] = 128 - Math.sign(py) * ny * bend * 127
      pixels.data[offset + 2] = 128
      pixels.data[offset + 3] = 255
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL()
}

/** 此模块只能在 H5 条件编译块内引入。 */
export function createGlassRefraction(host: HTMLElement, layer: HTMLElement) {
  const id = `fg-glass-optics-${++nextId}`
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.style.pointerEvents = 'none'
  const filter = document.createElementNS(svgNamespace, 'filter')
  filter.id = id
  filter.setAttribute('filterUnits', 'userSpaceOnUse')
  filter.setAttribute('color-interpolation-filters', 'sRGB')
  filter.setAttribute('x', '0')
  filter.setAttribute('y', '0')
  const texture = document.createElementNS(svgNamespace, 'feImage')
  texture.setAttribute('result', 'normalMap')
  texture.setAttribute('preserveAspectRatio', 'none')
  const displacement = document.createElementNS(svgNamespace, 'feDisplacementMap')
  displacement.setAttribute('in', 'SourceGraphic')
  displacement.setAttribute('in2', 'normalMap')
  displacement.setAttribute('xChannelSelector', 'R')
  displacement.setAttribute('yChannelSelector', 'G')
  filter.append(texture, displacement)
  svg.append(filter)
  host.append(svg)

  let strength = 0
  let geometry = ''
  let frame = 0

  function render() {
    frame = 0
    if (strength <= 0) {
      layer.style.backdropFilter = 'none'
      return
    }
    // offsetWidth / Height 不包含按压动画的 transform，避免按压时重绘纹理。
    const width = host.offsetWidth
    const height = host.offsetHeight
    if (!width || !height)
      return
    const cssRadius = getComputedStyle(host).borderTopLeftRadius
    const radius = cssRadius.endsWith('%')
      ? Number.parseFloat(cssRadius) / 100 * Math.min(width, height)
      : Number.parseFloat(cssRadius)
    const key = `${width}:${height}:${radius}`
    if (geometry !== key) {
      const source = displacementTexture(width, height, radius)
      if (!source)
        return
      texture.setAttribute('href', source)
      texture.setAttribute('width', `${width}`)
      texture.setAttribute('height', `${height}`)
      filter.setAttribute('width', `${width}`)
      filter.setAttribute('height', `${height}`)
      geometry = key
    }
    displacement.setAttribute('scale', `${strength}`)
    // Safari 不支持 SVG backdrop 时此透明层无效果，基础模糊层继续工作。
    layer.style.backdropFilter = `url("#${id}")`
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(render)
  }

  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
  observer?.observe(host)
  window.addEventListener('resize', schedule)

  return {
    update(value: number) {
      strength = value
      schedule()
    },
    dispose() {
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
      layer.style.backdropFilter = 'none'
      svg.remove()
    },
  }
}
