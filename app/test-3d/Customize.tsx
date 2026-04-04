"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import "../globals.css";

import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF } from "@react-three/drei";

type SectionKey = "color" | "lights" | "windows" | "spoiler" | "hood" | "exhaust";

const COLOR_OPTIONS = [
  "Arctic Blue",
  "Midnight Black",
  "Pearl White",
  "Crimson Red",
  "Steel Grey",
];
const TWO_OPTIONS = ["Option A", "Option B"];


const STORAGE_KEY = "selectedCarModelUrl";


const CAR_OPTIONS = [
  { id: "car_1", label: "Car Model 1", url: "/models/default_car.glb" },
  { id: "car_2", label: "Car Model 2", url: "/models/Dodge_MidnightBlack_LB_WB_SC_HB.glb" },
  { id: "car_3", label: "Car Model 3", url: "/models/LamboRedKisebb3.glb" },
  { id: "car_4", label: "Car Model 4", url: "/models/Merci_PearlWhite_LB_WB_SC_HB.glb" },
  { id: "car_5", label: "Car Model 5", url: "/models/Dodge_MidnightBlack_LB_WB_SC_HB.glb" },
  { id: "car_6", label: "Car Model 6", url: "/models/Dodge_CrimsonRed_LB_WB_SB_HB.glb" },
  { id: "car_7", label: "Car Model 7", url: "/models/proba.glb" },
  { id: "car_8", label: "Car Model 8", url: "/models/Dodge_ArticBue_LB_WA_SC_HA.glb" },
  { id: "car_9", label: "Car Model 9", url: "/models/car_09.glb" },
  { id: "car_10", label: "Car Model 10", url: "/models/car_10.glb" },
] as const;

const DEFAULT_CAR = CAR_OPTIONS[0];


function customizeCacheUrl(url: string) {
  return url.includes("?") ? `${url}&src=customize` : `${url}?src=customize`;
}

function useBodyThemeMode() {
  const [themeMode, setThemeMode] = useState<"blue" | "mono">("blue");

  useEffect(() => {
    const readTheme = () => {
      setThemeMode(document.body.classList.contains("theme-mono") ? "mono" : "blue");
    };

    readTheme();

    const observer = new MutationObserver(readTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("pageshow", readTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", readTheme);
    };
  }, []);

  return themeMode;
}

export default function Customize({
  onBack,
  onGoEngine,
}: {
  onBack: () => void;
  onGoEngine: () => void;
}) {
  const [open, setOpen] = useState<SectionKey | null>("color");
  const themeMode = useBodyThemeMode();

  
  const [rotationDeg, setRotationDeg] = useState<number>(0);

  const [selected, setSelected] = useState<Record<SectionKey, string>>({
    color: COLOR_OPTIONS[0],
    lights: TWO_OPTIONS[0],
    windows: TWO_OPTIONS[0],
    spoiler: TWO_OPTIONS[0],
    hood: TWO_OPTIONS[0],
    exhaust: TWO_OPTIONS[0],
  });

  const [selectOpen, setSelectOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string>(DEFAULT_CAR.id);

  const selectedCar = useMemo(
    () => CAR_OPTIONS.find((c) => c.id === selectedCarId) ?? DEFAULT_CAR,
    [selectedCarId]
  );

  
  const selectedCarLoadUrl = useMemo(
    () => customizeCacheUrl(selectedCar.url),
    [selectedCar.url]
  );

  const toggle = (key: SectionKey) => setOpen((prev) => (prev === key ? null : key));
  const setChoice = (key: SectionKey, value: string) =>
    setSelected((prev) => ({ ...prev, [key]: value }));

  const rotate90 = (dir: "left" | "right") => {
    setRotationDeg((prev) => {
      const next = dir === "left" ? prev - 90 : prev + 90;
      return ((next % 360) + 360) % 360;
    });
  };

  const rotY = useMemo(() => (rotationDeg * Math.PI) / 180, [rotationDeg]);

  
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".bottomActions") && !t.closest(".selectPanel")) setSelectOpen(false);
    };
    if (selectOpen) window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [selectOpen]);


  useEffect(() => {
  const el = document.querySelector(".customizePage");
  if (!el) return;

  const onResize = () => {
    
      if (window.innerWidth > 980) {
        (el as HTMLElement).scrollTo({ top: 0, behavior: "instant" as any });
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = CAR_OPTIONS.find((c) => c.url === saved);
        if (found) setSelectedCarId(found.id);
      }
    } catch {}
    
  }, []);

  
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedCar.url);
    } catch {}
  }, [selectedCar.url]);

  
  const handleModelError = () => {
    if (selectedCarId !== DEFAULT_CAR.id) setSelectedCarId(DEFAULT_CAR.id);
  };

  return (
    <div className="home-root customizePage">
      <div className="home-bg" />

      {/* háttér */}
      <div className="customizeBg" aria-hidden="true">
        <div className="bgGlow" />
        <div className="bgGrid" />
        <div className="bgPanels">
          <span className="panel p1" />
          <span className="panel p2" />
          <span className="panel p3" />
          <span className="panel p4" />
        </div>
        <div className="bgCeilingLights">
          <span className="tube t1" />
          <span className="tube t2" />
          <span className="tube t3" />
          <span className="tube t4" />
        </div>
        <div className="bgVignette" />
      </div>

      <header className="customizeTop">
        <button type="button" onClick={onBack} className="backBtn" aria-label="Back" title="Back">
          <span className="backIcon" aria-hidden="true">
            ←
          </span>
        </button>

        <div className="topTitlePill">
          <span className="topTitleText">Customize</span>
        </div>
      </header>

      <main className="customizeMain">
        {}
        <section className="stageWrap">
          <div className="stageCard">
            <div className="carStage">
              {}
              <div className="stageGrid">
                {}
                <div className="arrowsColumn">
                  <div className="overlayControls">
                    <button
                      className="dpadLR"
                      type="button"
                      onClick={() => rotate90("left")}
                      aria-label="Rotate left 90 degrees"
                      title="Rotate left 90°"
                    >
                      ◀
                    </button>
                    <button
                      className="dpadLR"
                      type="button"
                      onClick={() => rotate90("right")}
                      aria-label="Rotate right 90 degrees"
                      title="Rotate right 90°"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {}
                <div className="viewerColumn">
                  <div className="carViewerWrap">
                    <div className="carViewer3d">
                      <Canvas
                        key={`${selectedCarLoadUrl}-${themeMode}`} 
                        camera={{ position: [0, 1.55, 8.2], fov: 34 }}
                        dpr={themeMode === "mono" ? [0.9, 1.3] : [1, 2]}
                        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
                        resize={{ scroll: false, debounce: { resize: 0, scroll: 50 } }}
                        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
                      >
                        <Suspense
                          fallback={
                            <Html center className="glbLoading">
                              Loading car...
                            </Html>
                          }
                        >
                          {}
                          <Scene carUrl={selectedCarLoadUrl} rotY={rotY} onModelError={handleModelError} themeMode={themeMode} />
                        </Suspense>
                      </Canvas>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="bottomActions">
                <div className="selectArea">
                  {selectOpen && (
                    <div className="selectPanel" role="dialog" aria-label="Select a car">
                      <div className="selectPanelTitle">Select a car</div>

                      <div className="selectList">
                        {CAR_OPTIONS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`selectItem ${selectedCar.id === c.id ? "active" : ""}`}
                            onClick={() => {
                              setSelectedCarId(c.id);
                              setSelectOpen(false);
                            }}
                          >
                            {c.label}
                            <span className="selectItemFile">({c.url.replace("/models/", "")})</span>
                          </button>
                        ))}
                      </div>

                      <div className="selectHint">
                        Tedd a modelleket ide: <b>public/models</b> (URL: <b>/models/...</b>)
                      </div>
                    </div>
                  )}

                  <button
                    className="wideAction"
                    type="button"
                    onClick={() => setSelectOpen((v) => !v)}
                    aria-expanded={selectOpen}
                  >
                    &gt; Select a car
                  </button>
                </div>

                <button className="wideAction" type="button" onClick={onGoEngine}>
                  Engine
                </button>
              </div>
            </div>
          </div>
        </section>

        {}
        <aside className="rightPanel">
          <div className="panelCard">
            <MenuItem title="Color" open={open === "color"} onToggle={() => toggle("color")}>
              <div className="optionGrid five">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className={`optionBtn ${selected.color === c ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("color", c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </MenuItem>

            <MenuItem title="Lights" open={open === "lights"} onToggle={() => toggle("lights")}>
              <div className="optionGrid two">
                {TWO_OPTIONS.map((v) => (
                  <button
                    key={v}
                    className={`optionBtn ${selected.lights === v ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("lights", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </MenuItem>

            <MenuItem title="Windows" open={open === "windows"} onToggle={() => toggle("windows")}>
              <div className="optionGrid two">
                {TWO_OPTIONS.map((v) => (
                  <button
                    key={v}
                    className={`optionBtn ${selected.windows === v ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("windows", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </MenuItem>

            <MenuItem title="Spoiler" open={open === "spoiler"} onToggle={() => toggle("spoiler")}>
              <div className="optionGrid two">
                {TWO_OPTIONS.map((v) => (
                  <button
                    key={v}
                    className={`optionBtn ${selected.spoiler === v ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("spoiler", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </MenuItem>

            <MenuItem title="Hood" open={open === "hood"} onToggle={() => toggle("hood")}>
              <div className="optionGrid two">
                {TWO_OPTIONS.map((v) => (
                  <button
                    key={v}
                    className={`optionBtn ${selected.hood === v ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("hood", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </MenuItem>

            <MenuItem title="Exhaust" open={open === "exhaust"} onToggle={() => toggle("exhaust")}>
              <div className="optionGrid two">
                {TWO_OPTIONS.map((v) => (
                  <button
                    key={v}
                    className={`optionBtn ${selected.exhaust === v ? "active" : ""}`}
                    type="button"
                    onClick={() => setChoice("exhaust", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </MenuItem>
          </div>
        </aside>
      </main>
    </div>
  );
}

function MenuItem({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`menuItem ${open ? "open" : ""}`}>
      <button className="menuHeader" type="button" onClick={onToggle}>
        <span className="chev">{open ? "▾" : "▸"}</span>
        <span className="menuTitle">{title}</span>
      </button>
      <div className="menuBody" style={{ display: open ? "block" : "none" }}>
        {children}
      </div>
    </div>
  );
}


function Scene({
  carUrl,
  rotY,
  onModelError,
  themeMode,
}: {
  carUrl: string;
  rotY: number;
  onModelError: () => void;
  themeMode: "blue" | "mono";
}) {
  const mono = themeMode === "mono";

  return (
    <>
      <ambientLight intensity={mono ? 0.62 : 0.55} />
      <directionalLight position={[4, 7, 4]} intensity={mono ? 1.15 : 1.05} />
      <pointLight position={[-4, 2.2, -2]} intensity={mono ? 1.7 : 1.4} color={mono ? "#ffffff" : "#6EE7FF"} />
      <pointLight position={[4, 1.4, 2]} intensity={mono ? 1.25 : 1.0} color={mono ? "#ffffff" : "#6EE7FF"} />

      <ModelErrorBoundary
        resetKey={carUrl}
        onError={onModelError}
        fallback={
          <Html center className="glbLoading">
            Failed to load model (check file name in <b>public/models</b>)
          </Html>
        }
      >
        <Turntable carUrl={carUrl} rotY={rotY} themeMode={themeMode} />
      </ModelErrorBoundary>

      <Environment preset="city" />
    </>
  );
}

function useResponsiveTurntable() {
  const { size } = useThree();

  return useMemo(() => {
    const minDim = Math.min(size.width, size.height);
    const t = THREE.MathUtils.clamp((minDim - 320) / (1200 - 320), 0, 1);

    
    const baseScale = THREE.MathUtils.lerp(0.38, 1.0, t);
    const scale = baseScale * 1.08;

    const y = THREE.MathUtils.lerp(0.05, -0.10, t);
    return { scale, y };
  }, [size.width, size.height]);
}

function Turntable({ carUrl, rotY, themeMode }: { carUrl: string; rotY: number; themeMode: "blue" | "mono" }) {
  const { scale, y } = useResponsiveTurntable();

  return (
    <group scale={scale} position={[0, y, 0]} rotation={[0, rotY, 0]}>
      <NeonRing themeMode={themeMode} />
      <CarModel url={carUrl} />
    </group>
  );
}

function NeonRing({ themeMode }: { themeMode: "blue" | "mono" }) {
  const isMono = themeMode === "mono";

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isMono ? "#000000" : "#05080d"),
        emissive: new THREE.Color(isMono ? "#ffffff" : "#1f5eff"),
        emissiveIntensity: isMono ? 0.3 : 0.18,
        metalness: 0.35,
        roughness: 0.42,
        transparent: true,
        opacity: 0.98,
      }),
    [isMono]
  );

  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(isMono ? "#ffffff" : "#7ec8ff"),
        transparent: true,
        opacity: isMono ? 1 : 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [isMono]
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(isMono ? "#ffffff" : "#2f6fff"),
        transparent: true,
        opacity: isMono ? 0.48 : 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [isMono]
  );

  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(isMono ? "#ffffff" : "#2b5cff"),
        transparent: true,
        opacity: isMono ? 0.18 : 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [isMono]
  );

  return (
    <group position={[0, -1.02, 0]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[2.38, 1.92, 0.36, 128, 1, false]} />
        <primitive object={bodyMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.362, 0]}>
        <ringGeometry args={[2.12, 2.38, 256]} />
        <primitive object={coreMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.366, 0]}>
        <ringGeometry args={[2.0, 2.55, 256]} />
        <primitive object={glowMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.358, 0]}>
        <circleGeometry args={[2.1, 256]} />
        <primitive object={haloMat} attach="material" />
      </mesh>
    </group>
  );
}


function deepCloneScene(root: THREE.Object3D) {
  const clone = root.clone(true);

  const srcMeshes: THREE.Mesh[] = [];
  root.traverse((o: any) => {
    if (o.isMesh) srcMeshes.push(o);
  });

  const dstMeshes: THREE.Mesh[] = [];
  clone.traverse((o: any) => {
    if (o.isMesh) dstMeshes.push(o);
  });

  for (let i = 0; i < Math.min(srcMeshes.length, dstMeshes.length); i++) {
    const s: any = srcMeshes[i];
    const d: any = dstMeshes[i];

    if (s.geometry) d.geometry = s.geometry.clone();
    if (s.material) {
      d.material = Array.isArray(s.material)
        ? s.material.map((m: any) => (m ? m.clone() : m))
        : s.material.clone();
    }

    d.castShadow = true;
    d.receiveShadow = true;
    d.frustumCulled = false;
  }

  return clone;
}

function CarModel({ url }: { url: string }) {
  const gltf = useGLTF(url) as any;

  
  const scene = useMemo(() => deepCloneScene(gltf.scene), [gltf.scene]);
 
  return (
    <group position={[0, -0.55, 0]} scale={0.92} dispose={null}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}


class ModelErrorBoundary extends React.Component<
  { resetKey: string; fallback: React.ReactNode; onError?: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}


for (const c of CAR_OPTIONS) {
  useGLTF.preload(customizeCacheUrl(c.url));
}
