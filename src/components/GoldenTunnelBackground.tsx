import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const RINGS = Array.from({ length: 10 }, (_, i) => ({
  radius: 1.3 + i * 0.64,
  z: -i * 0.48,
  speed: (i % 2 ? -1 : 1) * (0.025 + i * 0.004),
  phase: i * 0.58,
  tube: 0.012 + i * 0.0018,
}));

function Ring({ radius, z, speed, phase, tube, isDark }: (typeof RINGS)[number] & { isDark: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(isDark ? "#ffb347" : "#a96d20") },
        uPhase: { value: phase },
      },
      vertexShader: `varying vec2 vPosition;
        void main() {
          vPosition = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 uColor;
        uniform float uPhase;
        varying vec2 vPosition;
        void main() {
          float angle = atan(vPosition.y, vPosition.x);
          float crescent = pow(0.5 + 0.5 * cos(angle - uPhase), 3.0);
          float shimmer = pow(0.5 + 0.5 * cos(angle - uPhase + 1.5), 12.0);
          float alpha = 0.018 + crescent * 0.82 + shimmer * 0.18;
          gl_FragColor = vec4(uColor * (0.6 + shimmer * 0.75), alpha);
        }`,
    }),
    [phase, isDark],
  );

  useEffect(() => () => material.dispose(), [material]);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    const delta = Math.min(rawDelta, 0.05);
    ref.current.rotation.z += speed * delta;
    ref.current.scale.setScalar(1 + 0.025 * Math.sin(state.clock.elapsedTime * 0.5 + phase));
  });

  return (
    <mesh ref={ref} position={[0, 0, z]} material={material}>
      <torusGeometry args={[radius, tube, 8, 192]} />
    </mesh>
  );
}

function Sparks({ count = 120, isDark }: { count?: number; isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Stable pseudo-random distribution so React never has render-time randomness.
      const hash = (n: number) => (Math.sin(n * 127.1) * 43758.5453) % 1;
      const fraction = (n: number) => (hash(n) + 1) % 1;
      values[i * 3] = (fraction(i + 1) - 0.5) * 15;
      values[i * 3 + 1] = (fraction(i + 401) - 0.5) * 9;
      values[i * 3 + 2] = -fraction(i + 801) * 7;
    }
    return values;
  }, [count]);

  useFrame((_, rawDelta) => {
    const geometry = ref.current?.geometry;
    if (!geometry) return;
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const delta = Math.min(rawDelta, 0.05);
    for (let i = 0; i < count; i++) {
      const y = attribute.getY(i) + delta * 0.1;
      attribute.setY(i, y > 4.5 ? -4.5 : y);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={isDark ? "#ffd27a" : "#aa762b"} size={0.028} transparent opacity={isDark ? 0.68 : 0.35} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export default function GoldenTunnelBackground({ inline = false }: { inline?: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    updateTheme();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <div aria-hidden="true" className={`dashboard-tunnel-canvas pointer-events-none inset-0 z-0 ${inline ? "absolute" : "fixed"}`}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: false }} frameloop={reducedMotion ? "demand" : "always"}>
        <color attach="background" args={[isDark ? "#050302" : "#f9f5ed"]} />
        {RINGS.map((ring, index) => <Ring key={index} {...ring} isDark={isDark} />)}
        <Sparks isDark={isDark} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.8} luminanceThreshold={0.24} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}