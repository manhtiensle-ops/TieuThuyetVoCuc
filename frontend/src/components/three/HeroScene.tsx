'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// ── Floating Book ──────────────────────────────────────────────────────────────
interface FloatingBookProps {
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
  index: number
}

function FloatingBook({ position, rotation, color, index }: FloatingBookProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime() + index * 0.7
    meshRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.18
    meshRef.current.rotation.y = rotation[1] + Math.sin(t * 0.3) * 0.08
    meshRef.current.rotation.z = rotation[2] + Math.cos(t * 0.4) * 0.04
  })

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={meshRef} position={position} rotation={rotation} castShadow>
        {/* Book body */}
        <boxGeometry args={[0.7, 1.0, 0.12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.05}
          envMapIntensity={0.5}
        />
      </mesh>
      {/* Book spine accent */}
      <mesh position={[position[0] - 0.34, position[1], position[2]]}>
        <boxGeometry args={[0.02, 1.0, 0.12]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.6} />
      </mesh>
    </Float>
  )
}

// ── Particle Kanji ─────────────────────────────────────────────────────────────
function ParticleField() {
  const count = 160
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 18
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    return arr
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  const pointsRef = useRef<THREE.Points>(null)
  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.03
    }
  })

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        color="#C9A84C"
        size={0.03}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  )
}

// ── Camera Mouse Parallax ──────────────────────────────────────────────────────
function CameraRig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04
    camera.position.y += (pointer.y * 0.8 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Scene Config ───────────────────────────────────────────────────────────────
const BOOKS: FloatingBookProps[] = [
  { position: [-3.2, 0.5, -1],   rotation: [0.1, 0.3, -0.05],  color: '#4A2C1A', index: 0 },
  { position: [-1.5, -0.8, -0.5],rotation: [-0.05, -0.2, 0.08], color: '#1A2C4A', index: 1 },
  { position: [0.3,  1.2,  0],   rotation: [0.08, 0.5, 0.03],  color: '#2C1A4A', index: 2 },
  { position: [2.0, -0.4, -1],   rotation: [-0.1, -0.4, -0.06],color: '#1A3A2C', index: 3 },
  { position: [3.4,  0.9, -0.3], rotation: [0.05, 0.6, 0.04],  color: '#3A2C1A', index: 4 },
  { position: [-2.6,-1.2,  0.5], rotation: [-0.08, 0.1, -0.1], color: '#2C3A1A', index: 5 },
  { position: [1.0,  0.0,  1.0], rotation: [0.12, -0.3, 0.06], color: '#4A1A2C', index: 6 },
]

// ── Main Export ────────────────────────────────────────────────────────────────
export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 58, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      shadows
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Lighting — Academia Arcana warm gold */}
      <ambientLight intensity={0.25} color="#1a0f05" />
      <pointLight position={[2, 4, 3]} intensity={2.5} color="#C9A84C" castShadow />
      <pointLight position={[-4, -2, -2]} intensity={0.8} color="#4A2C8A" />
      <pointLight position={[4, -3, 2]} intensity={0.6} color="#1a3a5c" />

      {/* Fog */}
      <fog attach="fog" args={['#0D0F1A', 8, 22]} />

      {/* Stars */}
      <Stars radius={80} depth={40} count={1500} factor={3} fade speed={0.6} />

      {/* Particle field */}
      <ParticleField />

      {/* Floating books */}
      {BOOKS.map((book) => (
        <FloatingBook key={book.index} {...book} />
      ))}

      {/* Camera parallax rig */}
      <CameraRig />
    </Canvas>
  )
}
