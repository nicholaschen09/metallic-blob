import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createNoise3D, createNoise4D } from 'simplex-noise'

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

type BlobSurfaceState = {
  baseDirections: Float32Array
  baseRadii: Float32Array
}

function createBlobSurfaceState(geom: THREE.BufferGeometry): BlobSurfaceState {
  const pos = geom.getAttribute('position')

  if (!(pos instanceof THREE.BufferAttribute) || pos.itemSize !== 3) {
    throw new Error('Blob geometry is missing a valid position attribute')
  }

  const baseDirections = new Float32Array(pos.count * 3)
  const baseRadii = new Float32Array(pos.count)

  for (let i = 0; i < pos.count; i++) {
    const offset = i * 3
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const radius = Math.hypot(x, y, z) || 1

    baseDirections[offset] = x / radius
    baseDirections[offset + 1] = y / radius
    baseDirections[offset + 2] = z / radius
    baseRadii[i] = radius
  }

  return { baseDirections, baseRadii }
}

function sampleFractalNoise3D(
  x: number,
  y: number,
  z: number,
  frequency: number,
  octaves: number,
  noise3D: (x: number, y: number, z: number) => number,
) {
  let sum = 0
  let amp = 1
  let freq = frequency
  let ampSum = 0

  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3D(x * freq, y * freq, z * freq)
    ampSum += amp
    amp *= 0.55
    freq *= 1.9
  }

  return ampSum > 0 ? sum / ampSum : 0
}

function sampleFractalNoise4D(
  x: number,
  y: number,
  z: number,
  w: number,
  frequency: number,
  octaves: number,
  noise4D: (x: number, y: number, z: number, w: number) => number,
) {
  let sum = 0
  let amp = 1
  let freq = frequency
  let ampSum = 0

  for (let o = 0; o < octaves; o++) {
    sum += amp * noise4D(x * freq, y * freq, z * freq, w)
    ampSum += amp
    amp *= 0.55
    freq *= 1.9
  }

  return ampSum > 0 ? sum / ampSum : 0
}

function updateBlobSurface(
  geom: THREE.BufferGeometry,
  surfaceState: BlobSurfaceState,
  opts: {
    amplitude: number
    frequency: number
    octaves: number
    time: number
    noise3D: (x: number, y: number, z: number) => number
    noise4D: (x: number, y: number, z: number, w: number) => number
  },
) {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  const coarseFrequency = Math.max(0.35, opts.frequency * 1.15)
  const detailFrequency = coarseFrequency * 2.25
  const coarseOctaves = Math.max(2, opts.octaves)
  const detailOctaves = Math.max(2, opts.octaves + 1)
  const coarseAmplitude = opts.amplitude * 0.9
  const detailAmplitude = opts.amplitude * 0.55 + 0.02
  const pulseAmount = THREE.MathUtils.clamp(opts.amplitude * 0.24 + 0.03, 0.03, 0.12)
  const pulseSpeed = 1.15 + opts.frequency * 1.4
  const pulse =
    1 +
    Math.sin(opts.time * pulseSpeed) * pulseAmount +
    Math.sin(opts.time * (pulseSpeed * 2.05) - 0.7) * pulseAmount * 0.3
  const flowTime = opts.time * (1.4 + opts.frequency * 1.6)
  const swellTime = opts.time * (2.3 + opts.frequency * 1.8) + 3.1

  for (let i = 0; i < pos.count; i++) {
    const offset = i * 3
    const nx = surfaceState.baseDirections[offset]
    const ny = surfaceState.baseDirections[offset + 1]
    const nz = surfaceState.baseDirections[offset + 2]
    const baseRadius = surfaceState.baseRadii[i]

    const coarse = sampleFractalNoise3D(
      nx,
      ny,
      nz,
      coarseFrequency,
      coarseOctaves,
      opts.noise3D,
    )
    const detail = sampleFractalNoise4D(
      nx + coarse * 0.35,
      ny - coarse * 0.2,
      nz + coarse * 0.15,
      flowTime,
      detailFrequency,
      detailOctaves,
      opts.noise4D,
    )
    const swell = sampleFractalNoise4D(
      nx - 1.8,
      ny + 0.9,
      nz + 2.4,
      swellTime,
      coarseFrequency * 1.15,
      2,
      opts.noise4D,
    )
    const protrusion = Math.max(0, detail) * detailAmplitude * 1.4
    const recession = Math.min(0, detail) * detailAmplitude * 0.3
    const displacement =
      coarse * coarseAmplitude * pulse + protrusion + recession + swell * detailAmplitude * 0.4
    const radius = baseRadius * pulse + displacement

    pos.setXYZ(i, nx * radius, ny * radius, nz * radius)
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
  /**
   * Alpha for the renderer clear color.
   * Use `0` to make the canvas background transparent.
   */
  backgroundAlpha?: number
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
  backgroundAlpha: 1,
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
  textureAmountTop: 0.12,
  textureAmountBottom: 0.09,
  textureFrequencyTop: 1.75,
  textureFrequencyBottom: 1.95,
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
  renderer.setClearColor(new THREE.Color(appearance.backgroundColor), appearance.backgroundAlpha)
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
  const noise4D = createNoise4D(mulberry32(7331))

  const radius = 1.2
  const widthSeg = 140
  const heightSeg = 120

  const baseGeom = new THREE.SphereGeometry(radius, widthSeg, heightSeg)
  const geom = weldVerticesByPosition(baseGeom)
  baseGeom.dispose()

  const surfaceState = createBlobSurfaceState(geom)
  const textureAmount = (appearance.textureAmountTop + appearance.textureAmountBottom) * 0.5
  const textureFrequency =
    (appearance.textureFrequencyTop + appearance.textureFrequencyBottom) * 0.5

  updateBlobSurface(geom, surfaceState, {
    amplitude: textureAmount,
    frequency: textureFrequency,
    octaves: appearance.textureOctaves,
    time: 0,
    noise3D,
    noise4D,
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

    // Keep the large lobes stable while smaller bumps pulse and migrate.
    updateBlobSurface(geom, surfaceState, {
      amplitude: textureAmount,
      frequency: textureFrequency,
      octaves: appearance.textureOctaves,
      time: t,
      noise3D,
      noise4D,
    })

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
