import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createNoise3D } from 'simplex-noise'

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function weldVerticesByPosition(
  geom: THREE.BufferGeometry,
  tolerance = 1e-6,
): THREE.BufferGeometry {
  const pos = geom.getAttribute('position')

  if (!(pos instanceof THREE.BufferAttribute) || pos.itemSize !== 3) {
    throw new Error('Blob geometry is missing a valid position attribute')
  }

  const quantize = (value: number) => Math.round(value / tolerance)
  const uniquePositions: number[] = []
  const indices: number[] = []
  const vertexMap = new Map<string, number>()

  const getVertexIndex = (sourceIndex: number) => {
    const x = pos.getX(sourceIndex)
    const y = pos.getY(sourceIndex)
    const z = pos.getZ(sourceIndex)
    const key = `${quantize(x)},${quantize(y)},${quantize(z)}`
    const existingIndex = vertexMap.get(key)

    if (existingIndex !== undefined) {
      return existingIndex
    }

    const nextIndex = uniquePositions.length / 3
    uniquePositions.push(x, y, z)
    vertexMap.set(key, nextIndex)
    return nextIndex
  }

  if (geom.index) {
    for (let i = 0; i < geom.index.count; i++) {
      indices.push(getVertexIndex(geom.index.getX(i)))
    }
  } else {
    for (let i = 0; i < pos.count; i++) {
      indices.push(getVertexIndex(i))
    }
  }

  const welded = new THREE.BufferGeometry()
  welded.setAttribute('position', new THREE.Float32BufferAttribute(uniquePositions, 3))
  welded.setIndex(indices)
  return welded
}

function displaceGeometry(
  geom: THREE.BufferGeometry,
  opts: {
    amplitude: number
    frequency: number
    octaves: number
    noise3D: (x: number, y: number, z: number) => number
  },
) {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.copy(v).normalize()

    let sum = 0
    let amp = 1
    let freq = opts.frequency

    for (let o = 0; o < opts.octaves; o++) {
      sum += amp * opts.noise3D(v.x * freq, v.y * freq, v.z * freq)
      amp *= 0.5
      freq *= 2
    }

    const displacement = sum * opts.amplitude
    v.addScaledVector(n, displacement)
    pos.setXYZ(i, v.x, v.y, v.z)
  }

  pos.needsUpdate = true
  geom.computeVertexNormals()
}

export type BlobSceneOptions = {
  /**
   * Container element or CSS selector where the canvas should be attached.
   * - HTMLElement: used directly
   * - string: `document.querySelector` is used
   * - omitted: falls back to `#app`
   */
  container?: HTMLElement | string
  appearance?: BlobAppearanceOptions
  draggable?: boolean
}

export type BlobSceneHandle = {
  destroy: () => void
}

export type BlobAppearanceOptions = {
  backgroundColor?: THREE.ColorRepresentation
  blobColor?: THREE.ColorRepresentation
  metalness?: number
  roughness?: number
  envMapIntensity?: number
  blobScale?: number
  cameraZ?: number
  cameraFov?: number
  ambientLightIntensity?: number
  keyLightIntensity?: number
  rimLightIntensity?: number
  spinSpeedY?: number
  wobbleSpeedX?: number
  wobbleAmountX?: number
  bobSpeedY?: number
  bobAmountY?: number
  textureAmountTop?: number
  textureAmountBottom?: number
  textureFrequencyTop?: number
  textureFrequencyBottom?: number
  textureOctaves?: number
}

const defaultAppearance: Required<BlobAppearanceOptions> = {
  backgroundColor: '#0b0b0e',
  blobColor: '#ddd8cd',
  metalness: 1,
  roughness: 0.04,
  envMapIntensity: 1.75,
  blobScale: 0.6,
  cameraZ: 4.7,
  cameraFov: 32,
  ambientLightIntensity: 0.28,
  keyLightIntensity: 1.25,
  rimLightIntensity: 0.55,
  spinSpeedY: 0.22,
  wobbleSpeedX: 0.32,
  wobbleAmountX: 0.06,
  bobSpeedY: 0.65,
  bobAmountY: 0.015,
  textureAmountTop: 0.08,
  textureAmountBottom: 0.05,
  textureFrequencyTop: 1.45,
  textureFrequencyBottom: 1.55,
  textureOctaves: 4,
}

export function startBlobScene(options: BlobSceneOptions = {}): BlobSceneHandle {
  const container = options.container
  const appearance = { ...defaultAppearance, ...(options.appearance ?? {}) }
  const draggable = options.draggable ?? true
  const rootMaybe =
    typeof container === 'string'
      ? (document.querySelector<HTMLElement>(container) as HTMLElement | null)
      : (container as HTMLElement | null) ?? document.getElementById('app')

  if (!rootMaybe) throw new Error('Missing container element for blob scene')
  const rootEl: HTMLElement = rootMaybe

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(new THREE.Color(appearance.backgroundColor), 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  rootEl.appendChild(renderer.domElement)
  renderer.domElement.classList.add('webgl')

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(appearance.cameraFov, 1, 0.1, 100)
  camera.position.set(0, 0, appearance.cameraZ)
  camera.lookAt(0, 0, 0)

  // Reflective "chrome room" environment
  const envScene = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(envScene).texture

  // Lights for extra contrast
  scene.add(new THREE.AmbientLight(0xffffff, appearance.ambientLightIntensity))

  const key = new THREE.DirectionalLight(0xffffff, appearance.keyLightIntensity)
  key.position.set(2, 2.8, 1.2)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0xf7f1e2, appearance.rimLightIntensity)
  rim.position.set(-2, 0.8, -2)
  scene.add(rim)

  const noise3D = createNoise3D(mulberry32(1337))

  const radius = 1.2
  const widthSeg = 140
  const heightSeg = 120

  const baseGeom = new THREE.SphereGeometry(radius, widthSeg, heightSeg)
  const geom = weldVerticesByPosition(baseGeom)
  baseGeom.dispose()

  displaceGeometry(geom, {
    amplitude: (appearance.textureAmountTop + appearance.textureAmountBottom) * 0.5,
    frequency: (appearance.textureFrequencyTop + appearance.textureFrequencyBottom) * 0.5,
    octaves: appearance.textureOctaves,
    noise3D,
  })

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.blobColor),
    metalness: appearance.metalness,
    roughness: appearance.roughness,
    envMapIntensity: appearance.envMapIntensity,
  })
  const blob = new THREE.Mesh(geom, chromeMat)
  scene.add(blob)

  const pivot = new THREE.Group()
  pivot.add(blob)
  pivot.scale.setScalar(appearance.blobScale)
  pivot.position.set(0, 0, 0)
  scene.add(pivot)

  scene.remove(blob)

  function resize() {
    const w = rootEl.clientWidth || window.innerWidth
    const h = rootEl.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const clock = new THREE.Clock()
  let raf = 0
  let destroyed = false
  let isDragging = false
  let dragPointerId: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0
  let dragRotateX = 0
  let dragRotateY = 0

  const onPointerDown = (event: PointerEvent) => {
    isDragging = true
    dragPointerId = event.pointerId
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    renderer.domElement.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging || dragPointerId !== event.pointerId) return
    const dx = event.clientX - lastPointerX
    const dy = event.clientY - lastPointerY
    lastPointerX = event.clientX
    lastPointerY = event.clientY

    dragRotateY += dx * 0.006
    dragRotateX += dy * 0.004
    dragRotateX = THREE.MathUtils.clamp(dragRotateX, -0.8, 0.8)
  }

  const stopDragging = (event: PointerEvent) => {
    if (dragPointerId !== event.pointerId) return
    isDragging = false
    dragPointerId = null
    renderer.domElement.releasePointerCapture(event.pointerId)
  }

  if (draggable) {
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', stopDragging)
    renderer.domElement.addEventListener('pointercancel', stopDragging)
  }

  function animate() {
    if (destroyed) return
    const t = clock.getElapsedTime()

    pivot.rotation.y = t * appearance.spinSpeedY + dragRotateY
    pivot.rotation.x =
      Math.sin(t * appearance.wobbleSpeedX) * appearance.wobbleAmountX + dragRotateX
    pivot.position.y = Math.sin(t * appearance.bobSpeedY) * appearance.bobAmountY

    renderer.render(scene, camera)
    raf = requestAnimationFrame(animate)
  }

  raf = requestAnimationFrame(animate)

  return {
    destroy: () => {
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (draggable) {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        renderer.domElement.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerup', stopDragging)
        renderer.domElement.removeEventListener('pointercancel', stopDragging)
      }

      geom.dispose()
      chromeMat.dispose()
      pmrem.dispose()
      envScene.dispose()

      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
