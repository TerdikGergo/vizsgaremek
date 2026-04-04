"use client";

import React, { useEffect, useState } from "react";
import "../../globals.css";

type EngineChoice = "FUEL" | "ELECTRIC";

type BorderSpark = {
  id: number;
  side: "top" | "bottom" | "left" | "right";
  offset: number;
  size: number;
  duration: number;
};

type Props = {
  onBack: () => void;
  onFuel: () => void;    
  onElectric: () => void; 
};

export default function Engine({ onBack, onFuel, onElectric }: Props) {
  const [selected, setSelected] = useState<EngineChoice | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const [sparks, setSparks] = useState<BorderSpark[]>([]);

  useEffect(() => {
    const spawnCycle = () => {
      if (!document.body.classList.contains("theme-mono")) {
        setSparks([]);
        return;
      }

      let idCounter = 0;

      const spawnSpark = () => {
        const sides: BorderSpark["side"][] = ["top", "bottom", "left", "right"];
        const side = sides[Math.floor(Math.random() * sides.length)];
        const duration = 700 + Math.random() * 1400;

        const spark: BorderSpark = {
          id: Date.now() + idCounter++,
          side,
          offset: Math.random() * 100,
          size:
            side === "top" || side === "bottom"
              ? 50 + Math.random() * 120
              : 24 + Math.random() * 60,
          duration,
        };

        setSparks((prev) => [...prev, spark].slice(-3));

        window.setTimeout(() => {
          setSparks((prev) => prev.filter((s) => s.id !== spark.id));
        }, duration + 120);
      };

      spawnSpark();

      return window.setInterval(() => {
        if (!document.body.classList.contains("theme-mono")) {
          setSparks([]);
          return;
        }

        if (Math.random() > 0.35) spawnSpark();
        if (Math.random() > 0.7) spawnSpark();
      }, 900);
    };

    const interval = spawnCycle();

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="enginePage">
      <div className="customizeBg" aria-hidden="true">
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

        <div className="engineHelpWrap">
          <button
            className="engineCornerHelpBtn"
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            aria-label="Help"
          >
            ?
          </button>

          {helpOpen && (
            <div className="fuelHelpBubble engineHelpBubble" role="note">
              We do not make a differecence between Diesel and Gasoline engines in the calculations
            </div>
          )}
        </div>

        <div className="topTitlePill">
          <div className="border-sparks" aria-hidden="true">
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className={`border-spark border-spark-${spark.side}`}
                style={
                  {
                    "--offset": `${spark.offset}%`,
                    "--size": `${spark.size}px`,
                    "--duration": `${spark.duration}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <span className="topTitleText">Engine</span>
        </div>
      </header>

      <main className="engineMain">
        <div className="engineChoicePill" role="group" aria-label="Engine type">
          <div className="border-sparks" aria-hidden="true">
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className={`border-spark border-spark-${spark.side}`}
                style={
                  {
                    "--offset": `${spark.offset}%`,
                    "--size": `${spark.size}px`,
                    "--duration": `${spark.duration}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <button
            type="button"
            className={`engineChoiceBtn ${selected === "FUEL" ? "active" : ""}`}
            onClick={() => {
              setSelected("FUEL");
              onFuel();
            }}
          >
            Diesel / Gasoline
          </button>

          <button
            type="button"
            className={`engineChoiceBtn ${selected === "ELECTRIC" ? "active" : ""}`}
            onClick={() => {
              setSelected("ELECTRIC");
              onElectric();
            }}
          >
            Hybrid
          </button>
        </div>
      </main>
    </div>
  );
}

