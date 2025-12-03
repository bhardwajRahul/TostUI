"use client"

import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface GLBPreviewProps {
  file: File
  onThumbnailGenerated: (thumbnail: HTMLImageElement) => void
  onClose: () => void
}

export function GLBPreview({ file, onThumbnailGenerated, onClose }: GLBPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [yaw, setYaw] = useState([0])
  const [pitch, setPitch] = useState([0])
  const [roll, setRoll] = useState([0])
  const [zoom, setZoom] = useState([1])
  const [focalLength, setFocalLength] = useState([50]) // Default 50mm equivalent
  const [initialCameraDistance, setInitialCameraDistance] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    scene.background = null // Transparent background
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, 800 / 400, 0.1, 1000)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(800, 400) // Match the container height for better fit
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Better pixel ratio
    renderer.shadowMap.enabled = false // Disable shadows completely
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 2.0
    rendererRef.current = renderer

    const canvas = renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.top = '50%'
    canvas.style.left = '50%'
    canvas.style.transform = 'translate(-50%, -50%)'
    mountRef.current.appendChild(canvas)

    // Add enhanced lighting setup with brighter illumination
    const ambientLight = new THREE.AmbientLight(0x606060, 0.8)
    scene.add(ambientLight)

    // Main directional light (key light) - brighter, no shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight.position.set(2, 2, 1)
    scene.add(directionalLight)

    // Fill light from the opposite side - brighter
    const fillLight = new THREE.DirectionalLight(0xa0d8ff, 0.8)
    fillLight.position.set(-1, 1, -1)
    scene.add(fillLight)

    // Rim light for definition - brighter
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
    rimLight.position.set(0, -2, -2)
    scene.add(rimLight)

    // Additional point lights for more illumination
    const pointLight1 = new THREE.PointLight(0xffd700, 1.0, 15)
    pointLight1.position.set(-3, 3, 3)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff69b4, 0.6, 12)
    pointLight2.position.set(3, -1, 3)
    scene.add(pointLight2)

    // Additional directional light from above
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6)
    topLight.position.set(0, 3, 0)
    scene.add(topLight)

    // Load GLB file
    const loader = new GLTFLoader()
    loader.load(
      URL.createObjectURL(file),
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model

        // Center the model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)

        // Move model to origin
        model.position.sub(center)

        // Scale to fit in a reasonable size
        const scale = 3 / maxDim
        model.scale.setScalar(scale)

        // Replace all materials with unlit materials (no lighting/shadows)
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false
            child.receiveShadow = false

            // Replace materials with unlit versions
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material = child.material.map(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                    // Create unlit material with same color/texture
                    const unlitMat = new THREE.MeshBasicMaterial({
                      color: mat.color,
                      map: mat.map,
                      transparent: mat.transparent,
                      opacity: mat.opacity,
                      alphaMap: mat.alphaMap,
                      side: mat.side
                    })
                    return unlitMat
                  }
                  return mat // Keep non-PBR materials as-is
                })
              } else if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
                // Replace single PBR material with unlit
                const mat = child.material
                child.material = new THREE.MeshBasicMaterial({
                  color: mat.color,
                  map: mat.map,
                  transparent: mat.transparent,
                  opacity: mat.opacity,
                  alphaMap: mat.alphaMap,
                  side: mat.side
                })
              }
            }
          }
        })

        // Position camera to fit the model
        const camera = cameraRef.current
        if (camera) {
          // Calculate optimal distance based on model size and camera FOV
          const fovRadians = (camera.fov * Math.PI) / 180
          const distance = (maxDim * scale) / (2 * Math.tan(fovRadians / 2)) * 1.5
          camera.position.set(0, 0, distance)
          camera.lookAt(0, 0, 0)
          setInitialCameraDistance(distance)
        }

        scene.add(model)
        setYaw([0]) // Reset controls to default
        setPitch([0])
        setRoll([0])
        setZoom([1])
        setFocalLength([50]) // Reset focal length to default
        setIsLoading(false)
      },
      undefined,
      (error) => {
        console.error('Error loading GLB:', error)
        setError('Failed to load GLB file')
        setIsLoading(false)
      }
    )

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [file])

  // Update model rotation when controls change
  useEffect(() => {
    if (modelRef.current && !isLoading && rendererRef.current && sceneRef.current && cameraRef.current) {
      try {
        // Use Euler angles for more predictable rotation
        // Order: YXZ (Yaw, Pitch, Roll) - common aviation order
        const euler = new THREE.Euler(
          THREE.MathUtils.degToRad(Math.max(-90, Math.min(90, pitch[0]))), // Pitch (X-axis) clamped
          THREE.MathUtils.degToRad(yaw[0]),   // Yaw (Y-axis)
          THREE.MathUtils.degToRad(roll[0]),  // Roll (Z-axis)
          'YXZ' // Rotation order
        )

        modelRef.current.rotation.copy(euler)

        // Force update to ensure the change is rendered
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      } catch (error) {
        console.error('Error updating rotation:', error)
      }
    }
  }, [yaw, pitch, roll, isLoading])

  // Update camera zoom and focal length when controls change
  useEffect(() => {
    if (cameraRef.current && initialCameraDistance > 0 && !isLoading) {
      // Update zoom
      const newDistance = initialCameraDistance / zoom[0]
      cameraRef.current.position.setLength(newDistance)

      // Update focal length (FOV)
      // Convert focal length to FOV: FOV = 2 * atan(sensor_size / (2 * focal_length))
      // For 35mm equivalent, sensor size is 36mm height
      const sensorHeight = 36 // 35mm sensor height in mm
      const fovRadians = 2 * Math.atan(sensorHeight / (2 * focalLength[0]))
      const fovDegrees = THREE.MathUtils.radToDeg(fovRadians)
      cameraRef.current.fov = fovDegrees
      cameraRef.current.updateProjectionMatrix()

      cameraRef.current.lookAt(0, 0, 0)

      // Force render to ensure changes are visible
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
  }, [zoom, focalLength, initialCameraDistance, isLoading])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'r' && !isLoading && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        resetView()
      }
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault()
        generateThumbnail()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading])

  const resetView = () => {
    setYaw([0])
    setPitch([0])
    setRoll([0])
    setZoom([1])
    setFocalLength([50])
  }

  const generateThumbnail = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

    // Render the current view
    rendererRef.current.render(sceneRef.current, cameraRef.current)

    // Create a canvas to capture the render with correct aspect ratio
    const rendererCanvas = rendererRef.current.domElement
    const aspectRatio = rendererCanvas.width / rendererCanvas.height

    // Create thumbnail with same aspect ratio, target height 1024px
    let thumbWidth, thumbHeight
    if (aspectRatio > 1) {
      // Landscape - fit to height 1024
      thumbHeight = 1024
      thumbWidth = 1024 * aspectRatio
    } else {
      // Portrait or square - fit to height 1024
      thumbHeight = 1024
      thumbWidth = 1024 * aspectRatio
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(thumbWidth)
    canvas.height = Math.round(thumbHeight)
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Copy the WebGL canvas content maintaining aspect ratio
      ctx.drawImage(rendererCanvas, 0, 0, thumbWidth, thumbHeight)

      // Create image from canvas
      const img = new Image()
      img.onload = () => {
        // Close modal first, then generate thumbnail
        onClose()
        // Small delay to ensure modal is closed before adding to canvas
        setTimeout(() => onThumbnailGenerated(img), 50)
      }
      img.src = canvas.toDataURL('image/png')
    }
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>GLB Preview Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>GLB Preview - {file.name}</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Use sliders to adjust view • Press R to reset • Enter to generate thumbnail • Esc to cancel
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div
            ref={mountRef}
            className="w-full bg-transparent rounded border relative overflow-hidden"
            style={{
              height: '400px', // Reduced from 600px to fit better on screen
              backgroundImage: `
                linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            {isLoading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading 3D model...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Yaw (Horizontal Rotation): {yaw[0]}°</Label>
            <Slider
              value={yaw}
              onValueChange={setYaw}
              min={-180}
              max={180}
              step={5}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Pitch (Vertical Rotation): {pitch[0]}°</Label>
            <Slider
              value={pitch}
              onValueChange={setPitch}
              min={-90}
              max={90}
              step={5}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Roll (Tilt Rotation): {roll[0]}°</Label>
            <Slider
              value={roll}
              onValueChange={setRoll}
              min={-180}
              max={180}
              step={5}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Zoom: {zoom[0].toFixed(1)}x</Label>
            <Slider
              value={zoom}
              onValueChange={setZoom}
              min={0.1}
              max={3}
              step={0.1}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Focal Length: {focalLength[0]}mm</Label>
            <Slider
              value={focalLength}
              onValueChange={setFocalLength}
              min={20}
              max={200}
              step={10}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={resetView} disabled={isLoading} variant="outline" className="flex-1">
            Reset View
          </Button>
          <Button onClick={generateThumbnail} disabled={isLoading} className="flex-1">
            Generate Thumbnail
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}