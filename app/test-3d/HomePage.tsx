"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import "../globals.css";

import Garage from "./Garage";
import Customize from "./Customize";

type Page = "Home" | "Customize" | "Garage" | "Subscription" | "About Us";

const STORAGE_KEY = "selectedCarModelUrl";
const DEFAULT_CAR_URL = "/models/Lambo_Red_SpoilerA.glb";

type CarModelProps = { url: string };

function CarModel({ url }: CarModelProps) {
  const gltf = useGLTF(url);
  return (
    <group position={[0, -0.72, 0]} scale={0.88} dispose={null}>
      {}
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}


function NeonRing() {
  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#6EE7FF"),
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#6EE7FF"),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#6EE7FF"),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  return (
    <group position={[0, -1.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[2.15, 2.38, 256]} />
        <primitive object={coreMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <ringGeometry args={[2.05, 2.48, 256]} />
        <primitive object={glowMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[2.05, 256]} />
        <primitive object={haloMat} attach="material" />
      </mesh>
    </group>
  );
}

function useResponsiveTurntable() {
  const { size } = useThree();

  const { scale, y } = useMemo(() => {
    const w = size.width;
    const h = size.height;
    const minDim = Math.min(w, h);

    const t = THREE.MathUtils.clamp((minDim - 320) / (1200 - 320), 0, 1);
    const s = THREE.MathUtils.lerp(0.38, 1.0, t);
    const yOffset = THREE.MathUtils.lerp(0.25, 0.0, t);

    return { scale: s, y: yOffset };
  }, [size.width, size.height]);

  return { scale, y };
}

function Turntable({ carUrl }: { carUrl: string }) {
  const group = useRef<THREE.Group>(null);
  const { scale, y } = useResponsiveTurntable();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.14;
  });

  return (
    <group ref={group} scale={scale} position={[0, y, 0]}>
      <NeonRing />
      <CarModel url={carUrl} />
    </group>
  );
}

function Scene({ carUrl }: { carUrl: string }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 4]} intensity={1.05} />
      <pointLight position={[-4, 2.2, -2]} intensity={1.4} color="#6EE7FF" />
      <pointLight position={[4, 1.4, 2]} intensity={1.0} color="#6EE7FF" />

      <Turntable carUrl={carUrl} />
      <Environment preset="city" />
    </>
  );
}

export default function HomePage() {
  const [active, setActive] = useState<Page>("Home");
  const [carUrl, setCarUrl] = useState<string>(DEFAULT_CAR_URL);

 useEffect(() => {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (!fromStorage || fromStorage.trim().length === 0) return;

  fetch(fromStorage)
    .then((r) => {
      if (!r.ok) throw new Error("missing model");
      setCarUrl(fromStorage);
    })
    .catch(() => {
      localStorage.removeItem(STORAGE_KEY);
      setCarUrl(DEFAULT_CAR_URL);
    });
}, []);


  if (active === "Garage") return <Garage onBack={() => setActive("Home")} />;
  if (active === "Customize") return <Customize onBack={() => setActive("Home")} />;

  return (
    <div className="home-root">
      <div className="home-bg" />

      <header className="top-nav">
        <nav className="nav-pill">
          <div className="nav-links">
            <button
              className={`nav-item ${active === "Home" ? "active" : ""}`}
              onClick={() => setActive("Home")}
              type="button"
            >
              <span className="nav-label">Home</span>
            </button>

            <button
              className={`nav-item ${active === "Customize" ? "active" : ""}`}
              onClick={() => setActive("Customize")}
              type="button"
            >
              <span className="nav-label">Customize</span>
            </button>

            <button
              className={`nav-item ${active === "Garage" ? "active" : ""}`}
              onClick={() => setActive("Garage")}
              type="button"
            >
              <span className="nav-label">Garage</span>
            </button>

            <button
              className={`nav-item ${active === "Subscription" ? "active" : ""}`}
              onClick={() => setActive("Subscription")}
              type="button"
            >
              <span className="nav-label">Subscription</span>
            </button>

            <button
              className={`nav-item ${active === "About Us" ? "active" : ""}`}
              onClick={() => setActive("About Us")}
              type="button"
            >
              <span className="nav-label">About Us</span>
            </button>
          </div>

          <button className="nav-icon" aria-label="Profile" type="button">
            <span className="profile-dot" />
          </button>
        </nav>
      </header>

      <main className="stage">
        <div className="canvas-wrap">
          <Canvas
            camera={{ position: [0, 1.55, 8.2], fov: 34 }}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            onCreated={({ gl }) => {
              
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Suspense
              fallback={
                <Html center className="glbLoading">
                  Loading car...
                </Html>
              }
            >
              <Scene carUrl={carUrl} />
            </Suspense>
          </Canvas>
        </div>
      </main>
    </div>
  );
}

useGLTF.preload(DEFAULT_CAR_URL);
