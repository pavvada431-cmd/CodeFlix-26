import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const STAR_COUNT = 500

function normalizeVectorInput(value, fallback = [0, 0, 0]) {
  if (value instanceof THREE.Vector3) {
    return value.clone()
  }

  if (Array.isArray(value)) {
    return new THREE.Vector3(
      Number(value[0] ?? fallback[0]),
      Number(value[1] ?? fallback[1]),
      Number(value[2] ?? fallback[2]),
    )
  }

  if (typeof value === 'object' && value !== null) {
    return new THREE.Vector3(
      Number(value.x ?? fallback[0]),
      Number(value.y ?? fallback[1]),
      Number(value.z ?? fallback[2]),
    )
  }

  return new THREE.Vector3(...fallback)
}

function toArray(sceneConfig) {
  if (Array.isArray(sceneConfig)) {
    return sceneConfig
  }

  if (Array.isArray(sceneConfig?.objects)) {
    return sceneConfig.objects
  }

  return sceneConfig ? [sceneConfig] : []
}

function disposeMaterial(material) {
  if (!material) {
    return
  }

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }

  if (material.map) {
    material.map.dispose()
  }

  material.dispose()
}

function createRoundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function createTextSprite(label, color) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  const fontSize = 46
  const paddingX = 28
  const paddingY = 18

  context.font = `600 ${fontSize}px Space Mono`
  const measuredWidth = context.measureText(label).width
  canvas.width = Math.ceil(measuredWidth + paddingX * 2)
  canvas.height = fontSize + paddingY * 2

  context.font = `600 ${fontSize}px Space Mono`
  context.textBaseline = 'middle'
  context.textAlign = 'center'

  createRoundedRect(context, 4, 4, canvas.width - 8, canvas.height - 8, 24)
  context.fillStyle = 'rgba(10, 15, 30, 0.92)'
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  context.stroke()

  context.fillStyle = new THREE.Color(color).getStyle()
  context.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(canvas.width / 90, canvas.height / 90, 1)
  sprite.userData.texture = texture

  return sprite
}

function createGeometry(type, size) {
  if (type === 'sphere') {
    const radius =
      typeof size === 'number'
        ? size
        : Array.isArray(size)
          ? Number(size[0] ?? 1)
          : Number(size?.radius ?? 1)

    return new THREE.SphereGeometry(radius, 32, 32)
  }

  if (type === 'plane') {
    const width =
      typeof size === 'number'
        ? size
        : Array.isArray(size)
          ? Number(size[0] ?? 1)
          : Number(size?.width ?? 1)
    const height =
      typeof size === 'number'
        ? size
        : Array.isArray(size)
          ? Number(size[1] ?? width)
          : Number(size?.height ?? width)

    return new THREE.PlaneGeometry(width, height)
  }

  if (type === 'cylinder') {
    const radiusTop =
      typeof size === 'number'
        ? size
        : Array.isArray(size)
          ? Number(size[0] ?? 1)
          : Number(size?.radiusTop ?? size?.radius ?? 1)
    const radiusBottom =
      typeof size === 'number'
        ? size
        : Array.isArray(size)
          ? Number(size[1] ?? radiusTop)
          : Number(size?.radiusBottom ?? size?.radius ?? radiusTop)
    const height =
      typeof size === 'number'
        ? size * 2
        : Array.isArray(size)
          ? Number(size[2] ?? radiusTop * 2)
          : Number(size?.height ?? radiusTop * 2)
    const radialSegments =
      typeof size === 'object' && size !== null
        ? Number(size.radialSegments ?? 32)
        : 32

    return new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
    )
  }

  const width =
    typeof size === 'number'
      ? size
      : Array.isArray(size)
        ? Number(size[0] ?? 1)
        : Number(size?.width ?? 1)
  const height =
    typeof size === 'number'
      ? size
      : Array.isArray(size)
        ? Number(size[1] ?? width)
        : Number(size?.height ?? width)
  const depth =
    typeof size === 'number'
      ? size
      : Array.isArray(size)
        ? Number(size[2] ?? width)
        : Number(size?.depth ?? width)

  return new THREE.BoxGeometry(width, height, depth)
}

export class SceneManager {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.canvasElement = null
    this.hostElement = null
    this.createdCanvas = false
    this.animationFrameId = null
    this.meshGroup = null
    this.arrowGroup = null
    this.starfield = null
    this.gridHelper = null
    this.meshMap = new Map()
    this.meshList = []
    this.backgroundColor = '#0a0f1e'
    this.gridEnabled = false
    this.handleResize = this.handleResize.bind(this)
    this.animate = this.animate.bind(this)
  }

  init(canvasRef) {
    this.destroy()

    const target = canvasRef?.current ?? canvasRef

    if (!(target instanceof HTMLElement)) {
      throw new Error('SceneManager.init requires a canvas element or ref')
    }

    this.hostElement = target
    this.canvasElement =
      target instanceof HTMLCanvasElement
        ? target
        : document.createElement('canvas')
    this.createdCanvas = !(target instanceof HTMLCanvasElement)

    if (this.createdCanvas) {
      this.canvasElement.style.width = '100%'
      this.canvasElement.style.height = '100%'
      this.canvasElement.style.display = 'block'
      this.hostElement.appendChild(this.canvasElement)
    }

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000)
    this.camera.position.set(8, 6, 10)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasElement,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true

    this.meshGroup = new THREE.Group()
    this.arrowGroup = new THREE.Group()
    this.scene.add(this.meshGroup)
    this.scene.add(this.arrowGroup)

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.78)
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.35)
    directionalLight.position.set(10, 14, 8)
    directionalLight.castShadow = true
    this.scene.add(ambientLight)
    this.scene.add(directionalLight)

    this.controls = new OrbitControlsImpl(
      this.camera,
      this.renderer.domElement,
    )
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(0, 0, 0)

    this.setBackground(this.backgroundColor)
    this.createStarfield()
    this.handleResize()
    window.addEventListener('resize', this.handleResize)
    this.animate()

    return this
  }

  loadScene(sceneConfig) {
    this.ensureInitialized()
    this.clearSceneObjects()

    const objects = toArray(sceneConfig)

    objects.forEach((config, index) => {
      const geometry = createGeometry(config.type, config.size)
      const material = new THREE.MeshStandardMaterial({
        color: config.color ?? '#9ca3af',
        roughness: 0.42,
        metalness: 0.08,
        side: config.type === 'plane' ? THREE.DoubleSide : THREE.FrontSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      const position = normalizeVectorInput(config.position, [0, 0, 0])
      const rotation = normalizeVectorInput(config.rotation, [0, 0, 0])
      const physicsId = config.id ?? config.bodyId ?? index

      mesh.position.copy(position)
      mesh.rotation.set(rotation.x, rotation.y, rotation.z)
      mesh.castShadow = config.type !== 'plane'
      mesh.receiveShadow = true
      mesh.userData.physicsId = physicsId
      mesh.userData.baseRotation = rotation.clone()

      this.meshGroup.add(mesh)
      this.meshMap.set(physicsId, mesh)
      this.meshList.push(mesh)
    })

    return this
  }

  updatePositions(bodyStates) {
    if (!Array.isArray(bodyStates)) {
      return
    }

    bodyStates.forEach((state, index) => {
      const mesh = this.meshMap.get(state.id) ?? this.meshList[index]

      if (!mesh) {
        return
      }

      const baseRotation = mesh.userData.baseRotation ?? new THREE.Vector3()
      mesh.position.x = state.x
      mesh.position.y = state.y
      mesh.rotation.set(
        baseRotation.x ?? 0,
        baseRotation.y ?? 0,
        (baseRotation.z ?? 0) + (state.angle ?? 0),
      )
    })
  }

  addForceArrow(origin, direction, color = '#00f5ff', label = '') {
    this.ensureInitialized()

    const originVector = normalizeVectorInput(origin, [0, 0, 0])
    const directionVector = normalizeVectorInput(direction, [0, 1, 0])
    const length = Math.max(directionVector.length(), 0.001)
    const normalizedDirection = directionVector.clone().normalize()

    const arrow = new THREE.ArrowHelper(
      normalizedDirection,
      originVector,
      length,
      color,
      Math.max(length * 0.18, 0.35),
      Math.max(length * 0.12, 0.2),
    )

    this.arrowGroup.add(arrow)

    if (label) {
      const labelSprite = createTextSprite(label, color)

      if (labelSprite) {
        labelSprite.position.copy(
          originVector.clone().add(normalizedDirection.clone().multiplyScalar(length * 1.16)),
        )
        this.arrowGroup.add(labelSprite)
      }
    }

    return arrow
  }

  clearArrows() {
    if (!this.arrowGroup) {
      return
    }

    while (this.arrowGroup.children.length > 0) {
      const child = this.arrowGroup.children[0]
      this.arrowGroup.remove(child)

      if (child instanceof THREE.ArrowHelper) {
        child.line.geometry.dispose()
        disposeMaterial(child.line.material)
        child.cone.geometry.dispose()
        disposeMaterial(child.cone.material)
      }

      if (child instanceof THREE.Sprite) {
        child.userData.texture?.dispose()
        disposeMaterial(child.material)
      }
    }
  }

  setBackground(color) {
    this.backgroundColor = color

    if (this.scene) {
      this.scene.background = new THREE.Color(color)
    }

    if (this.renderer) {
      this.renderer.setClearColor(color, 1)
    }

    return this
  }

  enableGrid(enabled) {
    this.gridEnabled = Boolean(enabled)

    if (!this.scene) {
      return this
    }

    if (this.gridEnabled && !this.gridHelper) {
      this.gridHelper = new THREE.GridHelper(40, 40, '#1e90ff', '#23395b')
      this.gridHelper.position.y = -0.01
      this.scene.add(this.gridHelper)
    }

    if (!this.gridEnabled && this.gridHelper) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.geometry.dispose()
      disposeMaterial(this.gridHelper.material)
      this.gridHelper = null
    }

    return this
  }

  destroy() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    window.removeEventListener('resize', this.handleResize)
    this.clearArrows()
    this.clearSceneObjects()

    if (this.gridHelper && this.scene) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.geometry.dispose()
      disposeMaterial(this.gridHelper.material)
      this.gridHelper = null
    }

    if (this.starfield && this.scene) {
      this.scene.remove(this.starfield)
      this.starfield.geometry.dispose()
      disposeMaterial(this.starfield.material)
      this.starfield = null
    }

    if (this.controls) {
      this.controls.dispose()
      this.controls = null
    }

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.forceContextLoss()
      this.renderer = null
    }

    if (this.createdCanvas && this.canvasElement?.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement)
    }

    this.scene = null
    this.camera = null
    this.canvasElement = null
    this.hostElement = null
    this.createdCanvas = false
  }

  animate() {
    if (!this.renderer || !this.scene || !this.camera) {
      return
    }

    this.controls?.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrameId = window.requestAnimationFrame(this.animate)
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.canvasElement) {
      return
    }

    const bounds = (this.createdCanvas ? this.hostElement : this.canvasElement)
      ?.getBoundingClientRect?.()
    const width = Math.max(Math.floor(bounds?.width ?? this.canvasElement.clientWidth ?? 1), 1)
    const height = Math.max(
      Math.floor(bounds?.height ?? this.canvasElement.clientHeight ?? 1),
      1,
    )

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  createStarfield() {
    if (!this.scene) {
      return
    }

    const positions = new Float32Array(STAR_COUNT * 3)

    for (let index = 0; index < STAR_COUNT; index += 1) {
      const baseIndex = index * 3
      const radius = 120 + Math.random() * 180
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[baseIndex] = radius * Math.sin(phi) * Math.cos(theta)
      positions[baseIndex + 1] = radius * Math.cos(phi)
      positions[baseIndex + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })

    this.starfield = new THREE.Points(geometry, material)
    this.scene.add(this.starfield)
  }

  clearSceneObjects() {
    if (!this.meshGroup) {
      return
    }

    while (this.meshGroup.children.length > 0) {
      const child = this.meshGroup.children[0]
      this.meshGroup.remove(child)

      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        disposeMaterial(child.material)
      }
    }

    this.meshMap.clear()
    this.meshList = []
  }

  ensureInitialized() {
    if (!this.scene || !this.camera || !this.renderer) {
      throw new Error('SceneManager must be initialized before use')
    }
  }
}
