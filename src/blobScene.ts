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

export function startBlobScene() {
  const root = document.getElementById('app')
  if (!root) throw new Error('Missing #app element')
  const rootEl = root as HTMLElement

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x0b0b0e, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  rootEl.appendChild(renderer.domElement)
  renderer.domElement.classList.add('webgl')

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0.35, 3.5)
  camera.lookAt(0, 0.2, 0)

  // Reflective "chrome room" environment
  const envScene = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(envScene).texture

  // Lights for extra contrast
  scene.add(new THREE.AmbientLight(0xffffff, 0.35))

  const key = new THREE.DirectionalLight(0xffffff, 1.25)
  key.position.set(2, 2.8, 1.2)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x8fb6ff, 0.65)
  rim.position.set(-2, 0.8, -2)
  scene.add(rim)

  const noise3D = createNoise3D(mulberry32(1337))

  const radius = 1.2
  const widthSeg = 140
  const heightSeg = 120

  // Build two hemispheres so the top can be "chrome" and the bottom can be "snow".
  const geomTop = new THREE.SphereGeometry(
    radius,
    widthSeg,
    heightSeg,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  )
  const geomBottom = new THREE.SphereGeometry(
    radius,
    widthSeg,
    heightSeg,
    0,
    Math.PI * 2,
    Math.PI / 2 - 0.02,
    Math.PI / 2 + 0.02,
  )

  displaceGeometry(geomTop, {
    amplitude: 0.08,
    frequency: 1.45,
    octaves: 4,
    noise3D,
  })
  displaceGeometry(geomBottom, {
    amplitude: 0.05,
    frequency: 1.55,
    octaves: 4,
    noise3D,
  })

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d6dee6'),
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.2,
  })
  const snowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f6f3ea'),
    metalness: 0.08,
    roughness: 0.92,
    envMapIntensity: 0.2,
  })

  const top = new THREE.Mesh(geomTop, chromeMat)
  const bottom = new THREE.Mesh(geomBottom, snowMat)
  scene.add(top, bottom)

  // Subtle "mount" to prevent the blob from floating forever.
  const pivot = new THREE.Group()
  pivot.add(top)
  pivot.add(bottom)
  scene.add(pivot)

  // Remove direct references from scene so we only animate through pivot.
  scene.remove(top)
  scene.remove(bottom)

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

  function animate() {
    const t = clock.getElapsedTime()

    // Slow spin + tiny bobbing to match the screenshot vibe.
    pivot.rotation.y = t * 0.22
    pivot.rotation.x = Math.sin(t * 0.32) * 0.08
    pivot.position.y = Math.sin(t * 0.65) * 0.03

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

