"use client";

import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";


import { Canvas } from "@react-three/fiber";
import { Center, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";



type Props = { onBack: () => void };

type EngineKey = "V6" | "V8" | "V12" | "Inline" | "Boxer";
type EngineFamily = "V" | "INLINE" | "BOXER";

type PartKey =
  | "PISTON"
  | "ROD"
  | "CRANK"
  | "VALVES"
  | "V_GIRDLE"
  | "V_TIMING"
  | "L_DECK"
  | "L_HEADSEAL"
  | "B_OILING"
  | "B_HEADSEAL";

type MaterialId =
  | "CAST_AL"
  | "FORGED_AL_2618"
  | "TI_G5"
  | "CAST_STEEL"
  | "STEEL_4140"
  | "STEEL_4340"
  | "BILLET_4340_NITR"
  | "SS_BASE"
  | "VALVE_21_4N"
  | "IN718"
  | "GASKET_COMP"
  | "MLS_SS"
  | "ORING_SS";

type MaterialProps = {
  rho: number;
  E: number;
  nu: number;
  alpha: number;
  sigY: number;
  sigU: number;
  sigE: number;
  k: number;
  cp: number;
  tMaxC: number;
  H: number;
};

type GeoProps = {
  V: number;
  A: number;
  r: number;
  L: number;
  lambdaI: number;
};

type EngineConst = {
  family: EngineFamily;
  P_base_kW: number;
  T_base_Nm: number;
  RPM_redline: number;
  betaHot: number;
  pBase_bar: number;
  rCyl: number;
  tWall: number;
  rpmIdle: number;
  rpmPeakT: number;
};

type OilingPreset = {
  id: "WET" | "BAFFLED" | "DRY";
  label: string;
  coolingGain: number;
  wearGain: number;
  frictionLossTorqueMul: number;
};

type DbJson = {
  globals: {
    mVehicle: number;
    eta: number;
    g: number;
    rhoAir: number;
    CdA: number;
    Crr: number;
    rWheel: number;
    gearRatio: number;
    finalDrive: number;
    SF: number;
    TambC: number;
    dTSafe: number;
    dt: number;
    simT: number;
    kCool: { piston: number; valves: number; seal: number; timing: number; girdle: number };
  };
  engineModels: Record<EngineKey, string>;
  materials: Record<MaterialId, MaterialProps>;
  geo: Record<PartKey, GeoProps>;
  engines: Record<EngineKey, EngineConst>;
  oiling: OilingPreset[];
};

type SeriesPoint = { t: number; y: number };

const FUNCTION_ITEMS = [
  "RPM(t)",
  "Power P(t) [kW]",
  "Usable Power Pᵤ(t) [kW]",
  "Speed v(t) [km/h]",
  "Piston Temp Tₚ(t) [°C]",
  "Thermal Margin ΔT(t) [°C]",
  "RPM Utilization U_RPM(t)",
  "Durability(t) [%]",
] as const;

type FnKey = (typeof FUNCTION_ITEMS)[number];

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
function rpmFromOmega(omega: number) {
  return (omega * 60) / (2 * Math.PI);
}
function omegaFromRpm(rpm: number) {
  return (rpm * 2 * Math.PI) / 60;
}

function torqueCurve(engine: EngineConst, rpm: number) {
  const x = (rpm - engine.rpmPeakT) / (engine.RPM_redline - engine.rpmIdle);
  const a = 1.6;
  return clamp(1 - a * x * x, 0, 1);
}

function shouldIncludeZero(fn: FnKey) {
  return (
    fn === "RPM(t)" ||
    fn === "Power P(t) [kW]" ||
    fn === "Usable Power Pᵤ(t) [kW]" ||
    fn === "Speed v(t) [km/h]" ||
    fn === "RPM Utilization U_RPM(t)" ||
    fn === "Durability(t) [%]"
  );
}

function buildSvgScales(
  fn: FnKey,
  series: SeriesPoint[],
  w: number,
  h: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number
) {
  const xs = series.map((p) => p.t);
  const ys = series.map((p) => p.y);

  const rawXMin = Math.min(...xs);
  const rawXMax = Math.max(...xs);
  const rawYMin = Math.min(...ys);
  const rawYMax = Math.max(...ys);

  const xMin = 0;
  const xMax = 10;

  let yMin = rawYMin;
  let yMax = rawYMax;

  if (shouldIncludeZero(fn)) {
    yMin = Math.min(0, rawYMin);
    yMax = Math.max(0, rawYMax);
  }

  if (Math.abs(yMax - yMin) < 1e-9) {
    const bump = Math.max(1, Math.abs(yMax) * 0.1);
    yMin -= bump;
    yMax += bump;
  }

  if (Math.abs(xMax - xMin) < 1e-9) {
    const bump = Math.max(1, Math.abs(xMax) * 0.1);
    const nxMin = xMin - bump;
    const nxMax = xMax + bump;

    const sx = (t: number) => padL + ((t - nxMin) / Math.max(1e-9, nxMax - nxMin)) * (w - padL - padR);
    const sy = (y: number) => padT + (1 - (y - yMin) / Math.max(1e-9, yMax - yMin)) * (h - padT - padB);

    return { xMin: nxMin, xMax: nxMax, yMin, yMax, sx, sy };
  }

  const sx = (t: number) => padL + ((t - xMin) / Math.max(1e-9, xMax - xMin)) * (w - padL - padR);
  const sy = (y: number) => padT + (1 - (y - yMin) / Math.max(1e-9, yMax - yMin)) * (h - padT - padB);

  return { xMin, xMax, yMin, yMax, sx, sy };
}

function polylinePath(series: SeriesPoint[], sx: (x: number) => number, sy: (y: number) => number) {
  const pts = series.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
  const d = pts
    .map((p, i) => (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`))
    .join(" ");
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return { pts, d, len };
}

function niceTicks(min: number, max: number, count: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (Math.abs(max - min) < 1e-9) return [min];

  const span = max - min;
  const step0 = span / Math.max(1, count - 1);
  const pow10 = Math.pow(10, Math.floor(Math.log10(step0)));
  const frac = step0 / pow10;

  let niceFrac = 1;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 5) niceFrac = 5;
  else niceFrac = 10;

  const step = niceFrac * pow10;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const out: number[] = [];
  for (let v = start; v <= end + 0.5 * step; v += step) out.push(v);
  return out.length > 1 ? out : [min, max];
}

function fmtTick(v: number) {
  const a = Math.abs(v);
  if (a >= 1000) return `${Math.round(v)}`;
  if (a >= 100) return `${v.toFixed(0)}`;
  if (a >= 10) return `${v.toFixed(1)}`;
  return `${v.toFixed(2)}`;
}

function defaultChartDomain(fn: FnKey) {
  switch (fn) {
    case "RPM(t)":
      return { yMin: 0, yMax: 8000 };
    case "Power P(t) [kW]":
    case "Usable Power Pᵤ(t) [kW]":
      return { yMin: 0, yMax: 900 };
    case "Speed v(t) [km/h]":
      return { yMin: 0, yMax: 400 };
    case "Piston Temp Tₚ(t) [°C]":
      return { yMin: 0, yMax: 420 };
    case "Thermal Margin ΔT(t) [°C]":
      return { yMin: -80, yMax: 260 };
    case "RPM Utilization U_RPM(t)":
      return { yMin: 0, yMax: 1 };
    case "Durability(t) [%]":
      return { yMin: 0, yMax: 100 };
    default:
      return { yMin: 0, yMax: 100 };
  }
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



function EngineModel({ url, engineKey }: { url: string; engineKey: EngineKey }) {
  const gltf = useGLTF(url);
  const scaleByEngine: Record<EngineKey, number> = {
    V6: 1.5,
    V8: 1.5,
    V12: 0.15,
    Inline: 0.35,
    Boxer: 0.15,
  };
  const scale = scaleByEngine[engineKey];

  return (
    <Center>
      <group scale={scale}>
        <primitive object={gltf.scene} dispose={null} />
      </group>
    </Center>
  );
}

function Scene({ url, monoMode, engineKey }: { url: string; monoMode: boolean; engineKey: EngineKey }) {
  return (
    <>
      <ambientLight intensity={monoMode ? 0.82 : 0.8} />
      <directionalLight position={[3, 6, 3]} intensity={monoMode ? 1.08 : 1.2} />
      <pointLight position={[-3.6, 1.8, 3.4]} intensity={monoMode ? 0.75 : 0.38} color={monoMode ? "#ffffff" : "#6EE7FF"} />
      <Suspense
        fallback={
          <Html center className="glbLoading">
            Loading engine...
          </Html>
        }
      >
        <EngineModel url={url} engineKey={engineKey} />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={true}
        enableDamping={false}
        minDistance={2.8}
        maxDistance={8}
        rotateSpeed={monoMode ? 0.82 : 0.9}
        zoomSpeed={monoMode ? 0.92 : 1}
        target={[0, 0, 0]}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.9}
      />
    </>
  );
}



type PartUI = {
  key: PartKey;
  label: string;
  options: { id: string; label: string; materialId?: MaterialId }[];
};

function getPartUI(family: EngineFamily): { fixed: PartUI[]; bottom: PartUI[] } {
  const fixed: PartUI[] = [
    {
      key: "PISTON",
      label: "Piston",
      options: [
        { id: "BASIC", label: "Cast Al", materialId: "CAST_AL" },
        { id: "MID", label: "Forged Al 2618", materialId: "FORGED_AL_2618" },
        { id: "RACE", label: "Titanium G5", materialId: "TI_G5" },
      ],
    },
    {
      key: "ROD",
      label: "Connecting Rod",
      options: [
        { id: "BASIC", label: "Cast Steel", materialId: "CAST_STEEL" },
        { id: "MID", label: "Steel 4140", materialId: "STEEL_4140" },
        { id: "RACE", label: "Titanium G5", materialId: "TI_G5" },
      ],
    },
    {
      key: "CRANK",
      label: "Crankshaft",
      options: [
        { id: "BASIC", label: "Cast Steel", materialId: "CAST_STEEL" },
        { id: "MID", label: "Steel 4340", materialId: "STEEL_4340" },
        { id: "RACE", label: "Billet 4340 Nitr.", materialId: "BILLET_4340_NITR" },
      ],
    },
    {
      key: "VALVES",
      label: "Exhaust Valves",
      options: [
        { id: "BASIC", label: "Stainless", materialId: "SS_BASE" },
        { id: "MID", label: "21-4N", materialId: "VALVE_21_4N" },
        { id: "RACE", label: "Inconel 718", materialId: "IN718" },
      ],
    },
  ];

  if (family === "V") {
    return {
      fixed,
      bottom: [
        {
          key: "V_GIRDLE",
          label: "Main Bearing Girdle",
          options: [
            { id: "BASIC", label: "Cast Steel", materialId: "CAST_STEEL" },
            { id: "MID", label: "Steel 4340", materialId: "STEEL_4340" },
            { id: "RACE", label: "Billet 4340 Nitr.", materialId: "BILLET_4340_NITR" },
          ],
        },
        {
          key: "V_TIMING",
          label: "Timing Drive",
          options: [
            { id: "BASIC", label: "Steel 4140", materialId: "STEEL_4140" },
            { id: "MID", label: "Steel 4340", materialId: "STEEL_4340" },
            { id: "RACE", label: "Billet 4340 Nitr.", materialId: "BILLET_4340_NITR" },
          ],
        },
      ],
    };
  }

  if (family === "INLINE") {
    return {
      fixed,
      bottom: [
        {
          key: "L_DECK",
          label: "Deck / Block Support",
          options: [
            { id: "BASIC", label: "Cast Steel (Open)", materialId: "CAST_STEEL" },
            { id: "MID", label: "Steel 4340 (Closed)", materialId: "STEEL_4340" },
            { id: "RACE", label: "Billet 4340 (Race)", materialId: "BILLET_4340_NITR" },
          ],
        },
        {
          key: "L_HEADSEAL",
          label: "Head Seal System",
          options: [
            { id: "BASIC", label: "Composite", materialId: "GASKET_COMP" },
            { id: "MID", label: "MLS", materialId: "MLS_SS" },
            { id: "RACE", label: "MLS + O-ring", materialId: "ORING_SS" },
          ],
        },
      ],
    };
  }

  return {
    fixed,
    bottom: [
      {
        key: "B_OILING",
        label: "Oiling System",
        options: [
          { id: "WET", label: "Wet sump" },
          { id: "BAFFLED", label: "Baffled + pump" },
          { id: "DRY", label: "Dry sump" },
        ],
      },
      {
        key: "B_HEADSEAL",
        label: "Head Seal System",
        options: [
          { id: "BASIC", label: "Composite", materialId: "GASKET_COMP" },
          { id: "MID", label: "MLS", materialId: "MLS_SS" },
          { id: "RACE", label: "MLS + O-ring", materialId: "ORING_SS" },
        ],
      },
    ],
  };
}

function defaultSelectionsFor(family: EngineFamily): Record<PartKey, string> {
  return {
    PISTON: "MID",
    ROD: "MID",
    CRANK: "MID",
    VALVES: "MID",
    V_GIRDLE: "MID",
    V_TIMING: "MID",
    L_DECK: "MID",
    L_HEADSEAL: "MID",
    B_OILING: "BAFFLED",
    B_HEADSEAL: "MID",
  };
}



function simulateSeries(db: DbJson, engine: EngineConst, engineKey: EngineKey, selections: Record<PartKey, string>) {
  const g = db.globals;
  const family = engine.family;

  const { fixed, bottom } = getPartUI(family);
  const allParts = [...fixed, ...bottom];

  const matByPart = new Map<PartKey, MaterialProps>();
  let oiling: OilingPreset | null = null;

  for (const p of allParts) {
    const optId = selections[p.key];
    const opt = p.options.find((o) => o.id === optId);
    if (!opt) continue;

    if (p.key === "B_OILING") {
      oiling = db.oiling.find((x) => x.id === (opt.id as any)) ?? null;
      continue;
    }
    if (opt.materialId) matByPart.set(p.key, db.materials[opt.materialId]);
  }

  const geo = db.geo;

  const mass = (part: PartKey) => (matByPart.get(part)?.rho ?? 7800) * geo[part].V;
  const inertia = (part: PartKey) => geo[part].lambdaI * mass(part) * geo[part].r * geo[part].r;

  const I_total =
    inertia("CRANK") +
    inertia("PISTON") +
    inertia("ROD") +
    inertia("VALVES") +
    (family === "V" ? inertia("V_GIRDLE") + inertia("V_TIMING") : 0) +
    (family === "INLINE" ? inertia("L_DECK") : 0);

  const Cth = (part: PartKey, fallbackCp: number) => mass(part) * (matByPart.get(part)?.cp ?? fallbackCp);

  const C_piston = Cth("PISTON", 900);
  const C_valves = Cth("VALVES", 500);
  const hasSeal = family !== "V";
  const sealKey: PartKey = family === "INLINE" ? "L_HEADSEAL" : "B_HEADSEAL";
  const C_seal = hasSeal ? Cth(sealKey, 500) : 0;

  const TMAX_piston = matByPart.get("PISTON")?.tMaxC ?? 350;
  const TMAX_valves = matByPart.get("VALVES")?.tMaxC ?? 700;
  const TMAX_seal = hasSeal ? (matByPart.get(sealKey)?.tMaxC ?? 550) : 1e9;

  const coolingGain = oiling?.coolingGain ?? 1.0;
  const wearGain = oiling?.wearGain ?? 1.0;
  const frictionMul = oiling?.frictionLossTorqueMul ?? 1.0;

  let omega = omegaFromRpm(engine.rpmIdle);
  let v = 0;
  let D = 0;
  let Tp = g.TambC;
  let Tv = g.TambC;
  let Ts = g.TambC;

  const throttleAt = (t: number) => clamp(t / 0.8, 0, 1);

  const out: Record<FnKey, SeriesPoint[]> = {
    "RPM(t)": [],
    "Power P(t) [kW]": [],
    "Usable Power Pᵤ(t) [kW]": [],
    "Speed v(t) [km/h]": [],
    "Piston Temp Tₚ(t) [°C]": [],
    "Thermal Margin ΔT(t) [°C]": [],
    "RPM Utilization U_RPM(t)": [],
    "Durability(t) [%]": [],
  };

  const dt = g.dt;
  const steps = Math.floor(g.simT / dt);

  for (let n = 0; n <= steps; n++) {
    const t = n * dt;
    const rpm = rpmFromOmega(omega);

    const thr = throttleAt(t);
    const curve = torqueCurve(engine, rpm);
    const T_raw = engine.T_base_Nm * thr * curve;

    const margin_p = TMAX_piston - Tp;
    const margin_v = TMAX_valves - Tv;
    const margin_s = hasSeal ? TMAX_seal - Ts : 1e9;
    const T_margin = Math.min(margin_p, margin_v, margin_s);

    const heatFactor = clamp(T_margin / g.dTSafe, 0, 1);
    const T_engine = T_raw * heatFactor;

    const T_loss = (28 + 0.06 * omega) * frictionMul;

    const F_drag = 0.5 * g.rhoAir * g.CdA * v * v;
    const F_roll = g.Crr * g.mVehicle * g.g;
    const F_res = F_drag + F_roll;

    const G = g.gearRatio * g.finalDrive;
    const T_load_vehicle = (F_res * g.rWheel) / (g.eta * G);
    const T_load = T_loss + T_load_vehicle;

    const alpha = (T_engine - T_load) / Math.max(I_total, 1e-6);
    omega = omega + alpha * dt;

    const rpmClamped = Math.min(rpmFromOmega(omega), engine.RPM_redline);
    omega = omegaFromRpm(rpmClamped);

    const P_kW = (T_engine * omega) / 1000;
    const P_usable_kW = P_kW;

    const Pwheel_W = g.eta * (P_usable_kW * 1000);
    const F_drive = Pwheel_W / Math.max(v, 1.0);
    const a = (F_drive - F_res) / g.mVehicle;
    v = Math.max(0, v + a * dt);

    const Qhot_W = engine.betaHot * (P_kW * 1000);

    const dTp = (0.46 * Qhot_W - g.kCool.piston * coolingGain * (Tp - g.TambC)) / Math.max(C_piston, 1);
    const dTv = (0.34 * Qhot_W - g.kCool.valves * coolingGain * (Tv - g.TambC)) / Math.max(C_valves, 1);
    Tp = Tp + dTp * dt;
    Tv = Tv + dTv * dt;

    if (hasSeal) {
      const dTs = (0.20 * Qhot_W - g.kCool.seal * coolingGain * (Ts - g.TambC)) / Math.max(C_seal, 1);
      Ts = Ts + dTs * dt;
    }

    const sigmaTot = (part: PartKey, Ti: number) => {
      const m = mass(part);
      const A = geo[part].A;
      const r = geo[part].r;
      const mat = matByPart.get(part);
      const mech = (m * r * omega * omega) / Math.max(A, 1e-9);
      const th = mat ? (mat.E * mat.alpha * (Ti - g.TambC)) / Math.max(1 - mat.nu, 0.1) : 0;
      return mech + th;
    };

    const goodman = (part: PartKey, Ti: number) => {
      const mat = matByPart.get(part);
      if (!mat) return 0;
      const sTot = sigmaTot(part, Ti);
      return (0.6 * sTot) / mat.sigE + (0.4 * sTot) / mat.sigU;
    };

    const G_p = goodman("PISTON", Tp);
    const G_r = goodman("ROD", Tp);
    const G_v = goodman("VALVES", Tv);
    const G_worst = Math.max(G_p, G_r, G_v);

    const Tcrit = Math.max(Tp, Tv, hasSeal ? Ts : 0);
    const TcritMax = Math.max(TMAX_piston, TMAX_valves, hasSeal ? TMAX_seal : 0);

    const kD = 0.03;
    const kT = 0.02;
    const damageRate =
      (kD * Math.max(0, G_worst - 1) + kT * Math.max(0, Tcrit / Math.max(TcritMax, 1) - 1)) * wearGain;
    D = clamp(D + damageRate * dt, 0, 1);

    const durability = 100 * (1 - D);
    const U_rpm = rpmClamped / engine.RPM_redline;

    out["RPM(t)"].push({ t, y: rpmClamped });
    out["Power P(t) [kW]"].push({ t, y: P_kW });
    out["Usable Power Pᵤ(t) [kW]"].push({ t, y: P_usable_kW });
    out["Speed v(t) [km/h]"].push({ t, y: v * 3.6 });
    out["Piston Temp Tₚ(t) [°C]"].push({ t, y: Tp });
    out["Thermal Margin ΔT(t) [°C]"].push({ t, y: T_margin });
    out["RPM Utilization U_RPM(t)"].push({ t, y: U_rpm });
    out["Durability(t) [%]"].push({ t, y: durability });

    void engineKey;
  }

  return out;
}



function SvgChart({ fn, series, animateKey }: { fn: FnKey; series: SeriesPoint[] | null; animateKey: number }) {
  const W = 420;
  const H = 248;
  const PAD_L = 50;
  const PAD_R = 14;
  const PAD_T = 12;
  const PAD_B = 28;

  const hasSeries = !!series && series.length > 0;
  const fallbackSeries = useMemo(() => {
    const domain = defaultChartDomain(fn);
    return [
      { t: 0, y: domain.yMin },
      { t: 10, y: domain.yMax },
    ];
  }, [fn]);

  const domainSeries = hasSeries ? (series as SeriesPoint[]) : fallbackSeries;
  const scales = useMemo(() => buildSvgScales(fn, domainSeries, W, H, PAD_L, PAD_R, PAD_T, PAD_B), [fn, domainSeries]);
  const xTicks = useMemo(() => [0, 2.5, 5, 7.5, 10], []);
  const yTicks = useMemo(() => niceTicks(scales.yMin, scales.yMax, 5), [scales.yMin, scales.yMax]);
  const pathData = useMemo(() => (hasSeries ? polylinePath(series as SeriesPoint[], scales.sx, scales.sy) : null), [hasSeries, series, scales]);

  const [prog, setProg] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  React.useEffect(() => {
    if (!hasSeries || !pathData) {
      setProg(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    setProg(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();

    const dur = 1400;
    const tick = (now: number) => {
      const t = (now - startRef.current) / dur;
      const p = clamp(t, 0, 1);
      setProg(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateKey, hasSeries, pathData]);

  const dashOffset = pathData ? pathData.len * (1 - prog) : 0;
  const glowPt = pathData
    ? pathData.pts[Math.max(0, Math.min(pathData.pts.length - 1, Math.floor(prog * (pathData.pts.length - 1))))]
    : null;

  return (
    <svg
      className="chartSvg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={fn}
      preserveAspectRatio="none"
    >
      {yTicks.map((yt, i) => {
        const y = scales.sy(yt);
        return (
          <g key={`y-${i}`}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} className="chartGridLine" />
            <text x={PAD_L - 8} y={y + 3.5} textAnchor="end" className="chartTickText">
              {fmtTick(yt)}
            </text>
          </g>
        );
      })}

      {xTicks.map((xt, i) => {
        const x = scales.sx(xt);
        return (
          <g key={`x-${i}`}>
            <line x1={x} y1={PAD_T} x2={x} y2={H - PAD_B} className="chartGridLine" />
            <text x={x} y={H - 8} textAnchor="middle" className="chartTickText">
              {Number.isInteger(xt) ? xt.toFixed(0) : xt.toFixed(1)}
            </text>
          </g>
        );
      })}

      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} className="chartAxisStrong" />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} className="chartAxisStrong" />

      {pathData && (
        <path
          d={pathData.d}
          fill="none"
          className="chartPath"
          style={{ strokeDasharray: pathData.len, strokeDashoffset: dashOffset }}
        />
      )}

      {glowPt && (
        <circle
          cx={glowPt.x}
          cy={glowPt.y}
          r={4.8}
          className="chartGlowDot"
          style={{ opacity: prog > 0 ? 1 : 0 }}
        />
      )}
    </svg>
  );
}



export default function DieselGasoline({ onBack }: Props) {
  const [db, setDb] = useState<DbJson | null>(null);
  const themeMode = useBodyThemeMode();
  const [dbErr, setDbErr] = useState<string | null>(null);

  const [selectedEngine, setSelectedEngine] = useState<EngineKey>("V12");
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [chartFn, setChartFn] = useState<FnKey[]>([
    FUNCTION_ITEMS[0],
    FUNCTION_ITEMS[1],
    FUNCTION_ITEMS[3],
    FUNCTION_ITEMS[7],
  ]);

  const [selections, setSelections] = useState<Record<PartKey, string>>(defaultSelectionsFor("V"));
  const [seriesMap, setSeriesMap] = useState<Record<FnKey, SeriesPoint[]> | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/engineData.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load engineData.json (${res.status})`);
        const json = (await res.json()) as DbJson;
        setDb(json);
        setDbErr(null);
      } catch (e: any) {
        setDbErr(e?.message ?? "Failed to load engine data");
        setDb(null);
      }
    })();
  }, []);

  const isLoading = !db && !dbErr;
  const hasError = !!dbErr;

  const engineSafe = db?.engines?.[selectedEngine];
  const familySafe: EngineFamily = engineSafe?.family ?? "V";
  const modelUrlSafe = db?.engineModels?.[selectedEngine] ?? "/models/v12_engine.glb";

  React.useEffect(() => {
    setSelections(defaultSelectionsFor(familySafe));
  }, [selectedEngine, familySafe]);

  const { fixed, bottom } = useMemo(() => getPartUI(familySafe), [familySafe]);

  const setChartFnAt = (idx: number, value: FnKey) => {
    setChartFn((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const onCalculate = () => {
    if (!db) return;
    const engine = db.engines[selectedEngine];
    const sim = simulateSeries(db, engine, selectedEngine, selections);
    setSeriesMap(sim);
    setAnimateKey((x) => x + 1);
  };

  const onSave = () => {
    console.log("SAVE payload", { name: "Build name later", engine: selectedEngine, selections, charts: chartFn });
  };

  const fmtValue = (fn: FnKey, value: number) => {
  if (fn.includes("RPM")) return `${Math.round(value)}`;
  if (fn.includes("[kW]")) return `${value.toFixed(0)} kW`;
  if (fn.includes("[km/h]")) return `${value.toFixed(0)} km/h`;
  if (fn.includes("[°C]")) return `${value.toFixed(0)} °C`;
  if (fn.includes("[%]")) return `${value.toFixed(0)}%`;
  if (fn.includes("U_RPM")) return `${value.toFixed(2)}`;
  if (fn.includes("ΔT")) return `${value.toFixed(0)} °C`;
  return `${value.toFixed(2)}`;
};


const cardValue = (fn: FnKey) => {
  const s = seriesMap?.[fn];
  if (!s || s.length === 0) return "-";
  return fmtValue(fn, s[s.length - 1].y);
};


  return (
    <div className="fuelPageRoot">
      <div className="home-bg" />
 
      <div className="fuelLayout">
        <section className="fuelLeft">
          <div className="fuelTop">
            <button className="fuelIconBtn" onClick={onBack} type="button">
              ←
            </button>

            <div className="fuelTitlePill">
              <span>Diesel/Gasoline</span>
            </div>

            <button className="fuelIconBtn" type="button" onClick={() => setHelpOpen((p) => !p)} aria-label="Help">
              ?
            </button>
          </div>

          <div className="fuelMainCard">
            <div className={`fuelStage ${materialsOpen ? "isOverlayOpen" : ""}`}>
              {hasError ? (
                <div className="fuelHelpBubble" role="note">
                  Engine data load error: {dbErr}
                </div>
              ) : isLoading ? (
                <div className="fuelHelpBubble" role="note">
                  Loading engine data...
                </div>
              ) : (
                <Canvas
                  key={`${selectedEngine}-${themeMode}`}
                  camera={{ position: [0, 0.4, 6.2], fov: 34 }}
                  dpr={themeMode === "mono" ? [0.9, 1.25] : [1, 2]}
                  gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
                  resize={{ scroll: false, debounce: { resize: 0, scroll: 50 } }}
                  onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
                >
                  <Scene url={modelUrlSafe} monoMode={themeMode === "mono"} engineKey={selectedEngine} />
                </Canvas>
              )}

              {helpOpen && !hasError && !isLoading && !materialsOpen && (
                <div className="fuelHelpBubble" role="note">
                  Engine models are for illustration only; they may not look exactly the same in the car, only similar!
                </div>
              )}

              {materialsOpen && (
                <div className="materialsOverlay">
                  <div className="materialsOverlayCard">
                    <div className="materialsOverlayTitle">Materials Upgrade</div>
                    <div className="materialsOverlayText">
                      Select one option per component. Top = 4 fixed parts, bottom = 2 engine-dependent parts.
                    </div>

                    <div className="matGrid">
                      {fixed.map((p) => (
                        <div className="matPartCard" key={p.key}>
                          <div className="matPartTitle">{p.label}</div>
                          <div className="matOptions" role="group">
                            {p.options.map((opt) => {
                              const checked = selections[p.key] === opt.id;
                              return (
                                <label className="matOptRow" key={opt.id}>
                                  <input
                                    type="radio"
                                    name={`mat-${p.key}`}
                                    checked={checked}
                                    onChange={() => setSelections((prev) => ({ ...prev, [p.key]: opt.id }))}
                                  />
                                  <span className={`matRadio ${checked ? "on" : ""}`} />
                                  <span className="matOptLabel">{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {bottom.map((p) => (
                        <div className="matPartCard matPartCardBottom" key={p.key}>
                          <div className="matPartTitle">{p.label}</div>
                          <div className="matOptions" role="group">
                            {p.options.map((opt) => {
                              const checked = selections[p.key] === opt.id;
                              return (
                                <label className="matOptRow" key={opt.id}>
                                  <input
                                    type="radio"
                                    name={`mat-${p.key}`}
                                    checked={checked}
                                    onChange={() => setSelections((prev) => ({ ...prev, [p.key]: opt.id }))}
                                  />
                                  <span className={`matRadio ${checked ? "on" : ""}`} />
                                  <span className="matOptLabel">{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="matActions">
                      <button className="fuelBtn fuelBtnPrimary" onClick={onCalculate} type="button" disabled={!db}>
                        Calculate
                      </button>
                      <button className="fuelBtn" onClick={onSave} type="button">
                        Save
                      </button>
                      <button className="fuelBtn" onClick={() => setMaterialsOpen(false)} type="button">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="fuelButtonsGrid">
              <button
                className={`fuelBtn ${selectedEngine === "V12" ? "active" : ""}`}
                onClick={() => {
                  setMaterialsOpen(false);
                  setSelectedEngine("V12");
                }}
                type="button"
              >
                V12
              </button>

              <button
                className={`fuelBtn ${selectedEngine === "V6" ? "active" : ""}`}
                onClick={() => {
                  setMaterialsOpen(false);
                  setSelectedEngine("V6");
                }}
                type="button"
              >
                V6
              </button>

              <button
                className={`fuelBtn ${selectedEngine === "V8" ? "active" : ""}`}
                onClick={() => {
                  setMaterialsOpen(false);
                  setSelectedEngine("V8");
                }}
                type="button"
              >
                V8
              </button>

              <button
                className={`fuelBtn ${selectedEngine === "Inline" ? "active" : ""}`}
                onClick={() => {
                  setMaterialsOpen(false);
                  setSelectedEngine("Inline");
                }}
                type="button"
              >
                Inline Engine
              </button>

              <button
                className={`fuelBtn ${selectedEngine === "Boxer" ? "active" : ""}`}
                onClick={() => {
                  setMaterialsOpen(false);
                  setSelectedEngine("Boxer");
                }}
                type="button"
              >
                Boxer Engine
              </button>

              <button
                className={`fuelBtn fuelBtnPrimary ${materialsOpen ? "active" : ""}`}
                onClick={() => {
                  setHelpOpen(false);
                  setMaterialsOpen((p) => !p);
                }}
                type="button"
              >
                Materials Upgrade
              </button>
            </div>
          </div>
        </section>

        <aside className="fuelRight">
          <div className="fuelCharts" role="region" aria-label="Engine function charts">
            {[0, 1, 2, 3].map((i) => {
              const fn = chartFn[i];
              const s = seriesMap?.[fn] ?? null;

              return (
                <div className="chartCard" key={i}>
                  <div className="chartTop">
                    <div className="chartTopRow">
                      <select className="chartSelect" value={fn} onChange={(e) => setChartFnAt(i, e.target.value as FnKey)}>
                        {FUNCTION_ITEMS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>

                      <div className="chartValuePill" title={cardValue(fn)}>
                        {cardValue(fn)}
                      </div>
                    </div>
                  </div>

                  <div className="chartBody">
                    <SvgChart fn={fn} series={s} animateKey={animateKey} />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

useGLTF.preload("/models/v6_car_engine.glb");
useGLTF.preload("/models/v8_engine.glb");
useGLTF.preload("/models/v12_engine.glb");
useGLTF.preload("/models/inline_6_engine.glb");
useGLTF.preload("/models/f6_boxer_engine.glb");
