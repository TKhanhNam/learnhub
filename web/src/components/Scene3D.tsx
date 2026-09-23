import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  className?: string
  accent?: string
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Lightweight Three.js stage — pauses off-screen, capped FPS / DPR. */
export default function Scene3D({ className = '', accent = '#2563eb' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowPower =
      reduce ||
      window.matchMedia('(prefers-reduced-data: reduce)').matches ||
      (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory != null &&
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4)

    const { r, g, b } = hexToRgb(accent)
    const color = new THREE.Color(accent)
    const soft = new THREE.Color(`rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 80)})`)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.15, 4.2)

    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      alpha: true,
      powerPreference: 'low-power',
      stencil: false,
      depth: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.25))
    renderer.setClearColor(0x000000, 0)
    renderer.outputEncoding = THREE.sRGBEncoding
    host.appendChild(renderer.domElement)
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    })

    const root = new THREE.Group()
    scene.add(root)

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    const key = new THREE.DirectionalLight(0xffffff, 0.95)
    key.position.set(2.5, 3.2, 4)
    const fill = new THREE.PointLight(color.getHex(), 0.85, 10)
    fill.position.set(-2.2, 0.4, 2.4)
    scene.add(ambient, key, fill)

    // Standard materials (no transmission/clearcoat — much cheaper than MeshPhysical)
    const icoGeo = new THREE.IcosahedronGeometry(1.05, lowPower ? 0 : 1)
    const icoShell = new THREE.Mesh(
      icoGeo,
      new THREE.MeshStandardMaterial({
        color: soft,
        metalness: 0.25,
        roughness: 0.35,
        transparent: true,
        opacity: 0.5,
      }),
    )
    const icoWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(icoGeo),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
    )
    const core = new THREE.Group()
    core.add(icoShell, icoWire)
    root.add(core)

    const cards: THREE.Mesh[] = []
    const cardGeo = new THREE.BoxGeometry(1.1, 1.45, 0.05)
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.25,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    })
    const placements = lowPower
      ? [
          { x: -1.45, y: 0.3, z: -0.35, ry: 0.5 },
          { x: 1.5, y: -0.1, z: -0.5, ry: -0.45 },
        ]
      : [
          { x: -1.55, y: 0.35, z: -0.35, ry: 0.55 },
          { x: 1.6, y: -0.15, z: -0.55, ry: -0.48 },
          { x: 0.15, y: 1.15, z: -1.1, ry: 0.12 },
        ]
    placements.forEach((p, i) => {
      const mesh = new THREE.Mesh(cardGeo, cardMat)
      mesh.position.set(p.x, p.y, p.z)
      mesh.rotation.y = p.ry
      mesh.rotation.x = i === 2 ? -0.35 : 0.08
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.07),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      )
      strip.position.set(0, 0.5, 0.03)
      mesh.add(strip)
      cards.push(mesh)
      root.add(mesh)
    })

    const count = lowPower ? 36 : 64
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 1.4 + Math.random() * 1.6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.55
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    const pointsGeo = new THREE.BufferGeometry()
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(
      pointsGeo,
      new THREE.PointsMaterial({
        color,
        size: 0.04,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    )
    root.add(points)

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let visible = true
    let pageVisible = !document.hidden
    let raf = 0
    let t = 0
    let lastFrame = 0
    const targetMs = lowPower ? 1000 / 24 : 1000 / 30
    const clock = new THREE.Clock()

    const onMove = (e: PointerEvent) => {
      if (!visible) return
      const box = host.getBoundingClientRect()
      mouse.tx = ((e.clientX - box.left) / box.width - 0.5) * 2
      mouse.ty = ((e.clientY - box.top) / box.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const resize = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const tick = (now: number) => {
      raf = 0
      if (!visible || !pageVisible || reduce) return
      raf = requestAnimationFrame(tick)
      if (now - lastFrame < targetMs) return
      lastFrame = now

      const dt = Math.min(clock.getDelta(), 0.05)
      t += dt
      mouse.x += (mouse.tx - mouse.x) * 0.08
      mouse.y += (mouse.ty - mouse.y) * 0.08

      core.rotation.y = t * 0.28 + mouse.x * 0.4
      core.rotation.x = 0.22 + mouse.y * 0.2
      core.position.y = Math.sin(t * 0.8) * 0.06
      points.rotation.y = t * 0.1
      cards.forEach((card, i) => {
        card.position.y = placements[i].y + Math.sin(t * 0.7 + i * 1.2) * 0.05
        card.rotation.y = placements[i].ry + mouse.x * 0.12
      })
      root.rotation.y = mouse.x * 0.14
      root.rotation.x = mouse.y * 0.08
      camera.position.x = mouse.x * 0.2
      camera.position.y = 0.15 - mouse.y * 0.12
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    const start = () => {
      if (!raf && visible && pageVisible && !reduce) raf = requestAnimationFrame(tick)
    }

    if (reduce) renderer.render(scene, camera)
    else start()

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
        else if (raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      { rootMargin: '80px', threshold: 0.05 },
    )
    io.observe(host)

    const onVisibility = () => {
      pageVisible = !document.hidden
      if (pageVisible) start()
      else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      io.disconnect()
      ro.disconnect()
      renderer.dispose()
      icoGeo.dispose()
      cardGeo.dispose()
      pointsGeo.dispose()
      cardMat.dispose()
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            if (m && m !== cardMat) m.dispose?.()
          })
        }
      })
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [accent])

  return (
    <div
      ref={hostRef}
      className={`scene-3d scene-3d-webgl ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
