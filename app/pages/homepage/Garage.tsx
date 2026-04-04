"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type GarageProps = {
  onBack: () => void;
};

type StoredModel = {
  id: string;
  name: string;
  url: string;
};

const LS_SELECTED_URL = "selectedCarModelUrl";
const LS_MODELS = "garageModels";

function safeParseModels(raw: string | null): StoredModel[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const ok = parsed.every(
      (x) =>
        x &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        typeof x.url === "string"
    );

    return ok ? (parsed as StoredModel[]) : null;
  } catch {
    return null;
  }
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Garage({ onBack }: GarageProps) {
  
  const seedModels: StoredModel[] = useMemo(
    () => [
      { id: "m1", name: "default_car.glb", url: "/models/default_car.glb?slot=1" },
      { id: "m2", name: "default_car_v2.glb", url: "/models/default_car.glb?slot=2" },
      { id: "m3", name: "default_car_v3.glb", url: "/models/default_car.glb?slot=3" },
    ],
    []
  );

  const [models, setModels] = useState<StoredModel[]>(seedModels);
  const [query, setQuery] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string>(seedModels[0].url);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);

  
  useEffect(() => {
    const storedModels = safeParseModels(localStorage.getItem(LS_MODELS));
    const storedSelected = localStorage.getItem(LS_SELECTED_URL);

    if (storedModels && storedModels.length > 0) {
      setModels(storedModels);

      if (storedSelected && storedModels.some((m) => m.url === storedSelected)) {
        setSelectedUrl(storedSelected);
      } else {
        
        setSelectedUrl(storedModels[0].url);
        localStorage.setItem(LS_SELECTED_URL, storedModels[0].url);
      }
    } else {
      
      setModels(seedModels);
      localStorage.setItem(LS_MODELS, JSON.stringify(seedModels));

      
      const initial = storedSelected && seedModels.some((m) => m.url === storedSelected)
        ? storedSelected
        : seedModels[0].url;

      setSelectedUrl(initial);
      localStorage.setItem(LS_SELECTED_URL, initial);
    }
  }, [seedModels]);

  
  useEffect(() => {
    localStorage.setItem(LS_MODELS, JSON.stringify(models));
  }, [models]);

  
  useEffect(() => {
    if (editingId) requestAnimationFrame(() => editInputRef.current?.focus());
  }, [editingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.name.toLowerCase().includes(q));
  }, [models, query]);

  const selectedModel = useMemo(() => {
    return models.find((m) => m.url === selectedUrl) ?? models[0];
  }, [models, selectedUrl]);

  function selectModel(url: string) {
    setSelectedUrl(url);
    localStorage.setItem(LS_SELECTED_URL, url);
  }

  function startRename(m: StoredModel) {
    setEditingId(m.id);
    setEditValue(m.name);
  }

  function commitRename(id: string) {
    const nextName = editValue.trim();
    setEditingId(null);

    if (!nextName) return;

    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, name: nextName } : m)));
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="home-root">
      <div className="home-bg" />

      {}
      <button
        className="app-backBtn"
        type="button"
        aria-label="Back"
        onClick={onBack}
      >
        <span className="app-backIcon" aria-hidden="true" />
      </button>

      {}
      <div className="garage-titlePill" aria-label="Current tab: Garage">
        <span className="garage-titlePillText">Garage</span>
      </div>

      {}
      <div className="garage-searchWrap">
        <span className="garage-searchIcon" aria-hidden="true" />
        <input
          className="garage-searchInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Searchbar"
        />
      </div>

      {}
      <div className="garage-content">
        {}
        <div className="garage-left">
          <div className="garage-carCard">
            <div className="garage-carCardHeader">{selectedModel?.name ?? "—"}</div>

            <div className="garage-carPreview">
              <div className="garage-previewInner">
                <div className="garage-previewLabel">Selected model</div>
                <div className="garage-previewFile">{selectedModel?.name ?? "—"}</div>
                <div className="garage-previewHint">
                  Teszt preview — később ide jöhet GLB viewer
                </div>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="garage-right">
          <div className="garage-row">
            {filtered.map((m) => {
              const isSelected = m.url === selectedUrl;
              const isEditing = editingId === m.id;

              return (
                <div
                  key={m.id}
                  className={`garage-saveCard ${isSelected ? "isSelected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectModel(m.url)} 
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectModel(m.url);
                  }}
                >
                  {}
                  <button
                    className="garage-pencil"
                    type="button"
                    aria-label="Rename model"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      startRename(m);
                    }}
                  >
                    <PencilIcon />
                  </button>

                  {}
                  <div className="garage-saveHeader">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        className="garage-nameInput"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(m.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => commitRename(m.id)}
                      />
                    ) : (
                      <span className="garage-saveTitle" title={m.name}>
                        {m.name}
                      </span>
                    )}
                  </div>

                  {}
                  <div className="garage-saveBody">
                    <div className="garage-saveBodyText">Image about the chosen car</div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && <div className="garage-empty">No results</div>}
        </div>
      </div>
    </div>
  );
}
