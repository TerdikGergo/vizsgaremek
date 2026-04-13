"use client";

import Engine from "./Engine";
import DieselGasoline from "./DieselGasoline";
import Electric from "./Electric";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Garage from "./Garage";
import Customize from "./Customize";
import AboutUs from "./AboutUs";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVE_MODEL_URL_KEY,
  CUSTOMIZE_MODEL_URL_KEY,
  DEFAULT_MODEL_URL,
  DEFAULT_PROJECT_ID,
  EDITING_BUILD_ID_KEY,
  clearEditingProjectStorage,
  normalizeModelUrl,
  setActiveProjectStorage,
  setSavedBuildActiveInDatabase,
} from "@/lib/garageShared";
import { AuthButton } from "@/components/auth-button";

type Page =
  | "Home"
  | "Customize"
  | "Garage"
  | "Engine"
  | "DieselGasoline"
  | "Electric"
  | "About Us";

type Theme = "blue" | "mono";

type BorderSpark = {
  id: string;
  side: "top" | "bottom" | "left" | "right";
  offset: number;
  size: number;
  duration: number;
};

const THEME_KEY = "site-theme";
const DISPLAY_NAME_KEY = "profile-display-name";
const DEFAULT_CAR_URL = DEFAULT_MODEL_URL;

type CarModelProps = { url: string };

function deepCloneScene(root: THREE.Object3D) {
  const clone = root.clone(true);

  const srcMeshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) srcMeshes.push(o as THREE.Mesh);
  });

  const dstMeshes: THREE.Mesh[] = [];
  clone.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) dstMeshes.push(o as THREE.Mesh);
  });

  for (let i = 0; i < Math.min(srcMeshes.length, dstMeshes.length); i++) {
    const s = srcMeshes[i] as THREE.Mesh & {
      material: THREE.Material | THREE.Material[];
      geometry: THREE.BufferGeometry;
    };
    const d = dstMeshes[i] as THREE.Mesh & {
      material: THREE.Material | THREE.Material[];
      geometry: THREE.BufferGeometry;
      castShadow: boolean;
      receiveShadow: boolean;
      frustumCulled: boolean;
    };

    d.geometry = s.geometry.clone();
    d.material = Array.isArray(s.material)
      ? s.material.map((m) => m.clone())
      : s.material.clone();
    d.castShadow = true;
    d.receiveShadow = true;
    d.frustumCulled = false;
  }

  return clone;
}

function CarModel({ url }: CarModelProps) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => deepCloneScene(gltf.scene), [gltf.scene]);

  return (
    <group position={[0, -0.55, 0]} scale={0.88} dispose={null}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

function NeonRing({ theme }: { theme: Theme }) {
  const isMono = theme === "mono";

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

function Turntable({ carUrl, theme }: { carUrl: string; theme: Theme }) {
  const group = useRef<THREE.Group>(null);
  const { scale, y } = useResponsiveTurntable();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.14;
  });

  return (
    <group ref={group} scale={scale} position={[0, y, 0]}>
      <NeonRing theme={theme} />
      <CarModel url={carUrl} />
    </group>
  );
}

function Scene({ carUrl, theme }: { carUrl: string; theme: Theme }) {
  const mono = theme === "mono";

  return (
    <>
      <ambientLight intensity={mono ? 0.62 : 0.55} />
      <directionalLight position={[4, 7, 4]} intensity={mono ? 1.15 : 1.05} />
      <pointLight position={[-4, 2.2, -2]} intensity={mono ? 1.7 : 1.4} color={mono ? "#ffffff" : "#6EE7FF"} />
      <pointLight position={[4, 1.4, 2]} intensity={mono ? 1.25 : 1.0} color={mono ? "#ffffff" : "#6EE7FF"} />

      <Turntable carUrl={carUrl} theme={theme} />
      <Environment preset="city" />
    </>
  );
}

export default function HomePage({ onLogout }: { onLogout?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState<Page>("Home");
  const [carUrl, setCarUrl] = useState<string>(DEFAULT_CAR_URL);
  const [theme, setTheme] = useState<Theme>("blue");
  const [sparks, setSparks] = useState<BorderSpark[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState("displayname");
  const isHomeActive = active === "Home";
  const isCustomizeActive = active === "Customize";
  const isGarageActive = active === "Garage";
  const isAboutUsActive = active === "About Us";
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const syncHomeCarFromStorage = useCallback(() => {
    if (typeof window === "undefined") return false;

    const storedActiveUrl = localStorage.getItem(ACTIVE_MODEL_URL_KEY);
    if (!storedActiveUrl) return false;

    setCarUrl(normalizeModelUrl(storedActiveUrl));
    return true;
  }, []);

  const goToNewCustomize = useCallback(() => {
    if (typeof window !== "undefined") {
      clearEditingProjectStorage();
      const nextDraftUrl = normalizeModelUrl(
        localStorage.getItem(ACTIVE_MODEL_URL_KEY) ?? carUrl ?? DEFAULT_CAR_URL,
      );
      localStorage.setItem(CUSTOMIZE_MODEL_URL_KEY, nextDraftUrl);
    }

    setActive("Customize");
  }, [carUrl]);

  const handleGarageBack = useCallback(() => {
    syncHomeCarFromStorage();
    setActive("Home");
  }, [syncHomeCarFromStorage]);

  const handleProjectActivated = useCallback((modelUrl: string) => {
    setCarUrl(normalizeModelUrl(modelUrl));
  }, []);

  const handleProjectSaved = useCallback(() => {
    syncHomeCarFromStorage();
    setActive("Garage");
  }, [syncHomeCarFromStorage]);

  const handleCustomizeBack = useCallback(() => {
    if (typeof window !== "undefined" && localStorage.getItem(EDITING_BUILD_ID_KEY)) {
      setActive("Garage");
      return;
    }

    setActive("Home");
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "mono" || savedTheme === "blue") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const savedDisplayName = localStorage.getItem(DISPLAY_NAME_KEY);
    if (savedDisplayName && savedDisplayName.trim().length > 0) {
      setDisplayName(savedDisplayName);
    }
  }, []);

  useEffect(() => {
    document.body.classList.remove("theme-blue", "theme-mono");
    document.body.classList.add(theme === "mono" ? "theme-mono" : "theme-blue");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let ignore = false;

    syncHomeCarFromStorage();

    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          if (!ignore) {
            setActiveProjectStorage(DEFAULT_PROJECT_ID, DEFAULT_CAR_URL);
            setCarUrl(DEFAULT_CAR_URL);
          }
          return;
        }

        let { data, error } = await supabase
  .from("saved_car_builds")
  .select("id, model_url, is_active")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .limit(1);

if (error) throw error;

if (!data || data.length === 0) {
  const fallback = await supabase
    .from("saved_car_builds")
    .select("id, model_url, is_active")
    .eq("user_id", user.id)
    .order("name", { ascending: true })
    .limit(1);

  if (fallback.error) throw fallback.error;
  data = fallback.data;
}

        if (error) throw error;
        if (ignore) return;

        const firstSavedBuild = data?.[0] as
          | { id: string; model_url: string; is_active: boolean }
          | undefined;

        if (firstSavedBuild) {
          if (!firstSavedBuild.is_active) {
            await setSavedBuildActiveInDatabase(supabase, user.id, firstSavedBuild.id);
            if (ignore) return;
          }

          const browserModelUrl = normalizeModelUrl(firstSavedBuild.model_url);
          setActiveProjectStorage(firstSavedBuild.id, browserModelUrl);
          setCarUrl(browserModelUrl);
        } else {
          setActiveProjectStorage(DEFAULT_PROJECT_ID, DEFAULT_CAR_URL);
          setCarUrl(DEFAULT_CAR_URL);
        }
      } catch {
        if (!ignore) {
          setActiveProjectStorage(DEFAULT_PROJECT_ID, DEFAULT_CAR_URL);
          setCarUrl(DEFAULT_CAR_URL);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase, syncHomeCarFromStorage]);

  useEffect(() => {
    if (active === "Home") {
      syncHomeCarFromStorage();
    }
  }, [active, syncHomeCarFromStorage]);

  useEffect(() => {
    if (theme !== "mono") {
      setSparks([]);
      return;
    }

    const timeouts = new Set<number>();

    const spawnSpark = () => {
      const sides: BorderSpark["side"][] = ["top", "bottom", "left", "right"];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const duration = 700 + Math.random() * 1400;
      const spark: BorderSpark = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        side,
        offset: Math.random() * 100,
        size: side === "top" || side === "bottom" ? 50 + Math.random() * 120 : 24 + Math.random() * 60,
        duration,
      };

      setSparks((prev) => [...prev.slice(-2), spark]);

      const timeoutId = window.setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== spark.id));
        timeouts.delete(timeoutId);
      }, duration + 120);

      timeouts.add(timeoutId);
    };

    spawnSpark();
    const interval = window.setInterval(() => {
      if (Math.random() > 0.35) spawnSpark();
      if (Math.random() > 0.7) spawnSpark();
    }, 900);

    return () => {
      window.clearInterval(interval);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  }, [displayName]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = profileButtonRef.current?.contains(target);
      const clickedMenu = profileMenuRef.current?.contains(target);
      if (!clickedButton && !clickedMenu) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      window.addEventListener("mousedown", onMouseDown);
    }

    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isProfileMenuOpen]);

  if (active === "Garage") {
    return (
      <Garage
        onBack={handleGarageBack}
        onCustomizeProject={() => setActive("Customize")}
        onProjectActivated={handleProjectActivated}
      />
    );
  }

  if (active === "Customize") {
    return <Customize onBack={handleCustomizeBack} onGoEngine={() => setActive("Engine")} />;
  }

  if (active === "Engine") {
    return <Engine onBack={() => setActive("Customize")} onFuel={() => setActive("DieselGasoline")} onElectric={() => setActive("Electric")} />;
  }

  if (active === "DieselGasoline") {
    return <DieselGasoline onBack={() => setActive("Engine")} onSaved={handleProjectSaved} />;
  }

  if (active === "Electric") {
    return <Electric onBack={() => setActive("Engine")} onSaved={handleProjectSaved} />;
  }

  if (active === "About Us") {
    return <AboutUs onBack={() => setActive("Home")} />;
  }

  return (
    <div className="home-root homePageRoot">
      <div className="home-bg" />

      <header className="top-nav">
        <nav className="nav-pill">
          <div className="nav-links">
            <button className={`nav-item ${isHomeActive ? "active" : ""}`} onClick={() => setActive("Home")} type="button">
              <span className="nav-label">Home</span>
            </button>

            <button className={`nav-item ${isCustomizeActive ? "active" : ""}`} onClick={goToNewCustomize} type="button">
              <span className="nav-label">Customize</span>
            </button>

            <button className={`nav-item ${isGarageActive ? "active" : ""}`} onClick={() => setActive("Garage")} type="button">
              <span className="nav-label">Garage</span>
            </button>

            <button className={`nav-item ${isAboutUsActive ? "active" : ""}`} onClick={() => setActive("About Us")} type="button">
              <span className="nav-label">About Us</span>
            </button>
          </div>

          <button className="theme-toggle" type="button" onClick={() => setTheme((prev) => (prev === "blue" ? "mono" : "blue"))}>
            {theme === "blue" ? "Dark Mode" : "Blue Mode"}
          </button>

          <button
            className="nav-icon"
            aria-label="Profile"
            type="button"
            ref={profileButtonRef}
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
          >
            <span className="profile-dot" />
          </button>

          <div className="nav-sparks" aria-hidden="true">
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className={`nav-spark nav-spark-${spark.side}`}
                style={{
                  ["--offset" as any]: `${spark.offset}%`,
                  ["--size" as any]: `${spark.size}px`,
                  ["--duration" as any]: `${spark.duration}ms`,
                }}
              />
            ))}
          </div>
        </nav>

        {isProfileMenuOpen && (
  <div className="home-side-menu" role="menu" aria-label="Profile menu" ref={profileMenuRef}>
    <div className="home-side-menu-row home-side-menu-row-main" role="presentation">
      {displayName.trim() || "Display Names"}
    </div>

    <div className="home-side-menu-row home-side-menu-input-row" role="presentation">
      <input
        className="home-side-menu-input"
        type="text"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="displayname"
        aria-label="Display name"
      />
    </div>

    
    <div className="home-side-menu-row" role="presentation">
      <AuthButton />
    </div>
  </div>
)}
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
              <Scene carUrl={carUrl} theme={theme} />
            </Suspense>
          </Canvas>
        </div>
      </main>
    </div>
  );
}
