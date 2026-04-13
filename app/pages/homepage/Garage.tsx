"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CUSTOMIZE_MODEL_URL_KEY,
  EDITING_BUILD_ID_KEY,
  buildDefaultProject,
  clearEditingProjectStorage,
  getCarFullNameFromModelUrl,
  getModelFileName,
  getPreferredSavedBuild,
  normalizeModelUrl,
  setActiveProjectStorage,
  setSavedBuildActiveInDatabase,
  type GarageProject,
  type SavedCarBuildRow,
} from "@/lib/garageShared";

type GarageProps = {
  onBack: () => void;
  onCustomizeProject: () => void;
  onProjectActivated: (modelUrl: string) => void;
};

export default function Garage({
  onBack,
  onCustomizeProject,
  onProjectActivated,
}: GarageProps) {
  const supabase = useMemo(() => createClient(), []);
  const defaultProject = useMemo(() => buildDefaultProject(), []);

  const [projects, setProjects] = useState<GarageProject[]>([defaultProject]);
  const [query, setQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProject.id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      let rows: SavedCarBuildRow[] = [];
      if (user) {
        const { data, error } = await supabase
          .from("saved_car_builds")
          .select(
  "id, name, model_url, engine_type, engine, materials_egy, materials_ketto, materials_harom, materials_negy, materials_ot, materials_hat, is_active",
)
          .eq("user_id", user.id)
          .order("is_active", { ascending: false })
          .order("name", { ascending: true });

        if (error) throw error;
        rows = (data ?? []) as SavedCarBuildRow[];
      }

      const preferredSavedRow = getPreferredSavedBuild(rows);

      if (user && preferredSavedRow && !preferredSavedRow.is_active) {
        await setSavedBuildActiveInDatabase(supabase, user.id, preferredSavedRow.id);
        preferredSavedRow.is_active = true;
      }

      const nextProjects: GarageProject[] = [
        defaultProject,
        ...rows.map((row) => ({
  id: row.id,
  name: row.name,
  modelUrl: normalizeModelUrl(row.model_url),
  engineType: row.engine_type,
  engine: row.engine,
  isDefault: false,
  isActive: !!row.is_active,
})),
      ];

      const nextSelected =
        (preferredSavedRow
          ? nextProjects.find((project) => project.id === preferredSavedRow.id)
          : undefined) ?? defaultProject;

      setProjects(nextProjects);
      setSelectedProjectId(nextSelected.id);
      setActiveProjectStorage(nextSelected.id, nextSelected.modelUrl);
      onProjectActivated(nextSelected.modelUrl);
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load saved projects.";

      setProjects([defaultProject]);
      setSelectedProjectId(defaultProject.id);
      setActiveProjectStorage(defaultProject.id, defaultProject.modelUrl);
      onProjectActivated(defaultProject.modelUrl);
      setErrorMessage(message);
    }
  }, [defaultProject, onProjectActivated, supabase]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((project) => {
      const fileName = getModelFileName(project.modelUrl).toLowerCase();
      const carName = getCarFullNameFromModelUrl(project.modelUrl).toLowerCase();
      return (
        project.name.toLowerCase().includes(q) ||
        fileName.includes(q) ||
        carName.includes(q)
      );
    });
  }, [projects, query]);

  const hasSavedProjects = useMemo(
    () => projects.some((project) => !project.isDefault),
    [projects],
  );

  async function selectProject(project: GarageProject) {
    if (project.isDefault && hasSavedProjects) {
      return;
    }

    setSelectedProjectId(project.id);

    if (project.isDefault) {
      setActiveProjectStorage(project.id, project.modelUrl);
      onProjectActivated(project.modelUrl);
      return;
    }

    setProjects((prev) =>
      prev.map((item) =>
        item.isDefault ? item : { ...item, isActive: item.id === project.id },
      ),
    );
    setActiveProjectStorage(project.id, project.modelUrl);
    onProjectActivated(project.modelUrl);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        throw new Error("User session not found.");
      }

      await setSavedBuildActiveInDatabase(supabase, user.id, project.id);
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to activate this project.";
      window.alert(message);
      await loadProjects();
    }
  }

  async function deleteProject(project: GarageProject) {
    if (project.isDefault) return;

    const shouldDelete = window.confirm(
      `Delete the project \"${project.name}\"?`,
    );
    if (!shouldDelete) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        throw new Error("User session not found.");
      }

      const { error } = await supabase
        .from("saved_car_builds")
        .delete()
        .eq("id", project.id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (
        typeof window !== "undefined" &&
        localStorage.getItem(EDITING_BUILD_ID_KEY) === project.id
      ) {
        clearEditingProjectStorage();
      }

      await loadProjects();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete this project.";
      window.alert(message);
    }
  }

  function customizeProject(project: GarageProject) {
    if (typeof window !== "undefined") {
      if (project.isDefault) {
        clearEditingProjectStorage();
      } else {
        localStorage.setItem(EDITING_BUILD_ID_KEY, project.id);
      }

      localStorage.setItem(
        CUSTOMIZE_MODEL_URL_KEY,
        normalizeModelUrl(project.modelUrl),
      );
    }

    onCustomizeProject();
  }

  return (
    <div className="home-root garagePageRoot">
      <div className="home-bg" />

      <button
        className="app-backBtn garage-backBtn"
        type="button"
        aria-label="Back"
        title="Back"
        onClick={onBack}
      >
        <span className="garage-backIcon" aria-hidden="true" />
      </button>

      <div className="garage-titlePill" aria-label="Current tab: Garage">
        <span className="garage-titlePillText">Garage</span>
      </div>

      <div className="garage-searchWrap">
        <span className="garage-searchIcon" aria-hidden="true" />
        <input
          className="garage-searchInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Searchbar"
        />
      </div>

      <div className="garage-content">
        <div className="garage-right">
          <div className="garage-row">
            {filtered.map((project) => {
              const isSelected = project.id === selectedProjectId;

              return (
                <div
                  key={project.id}
                  className={`garage-saveCard ${isSelected ? "isSelected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    void selectProject(project);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void selectProject(project);
                    }
                  }}
                >
                  <div className="garage-saveActions">
                    {!project.isDefault && (
                      <button
                        className="garage-cardAction garage-cardActionDelete"
                        type="button"
                        aria-label={`Delete ${project.name}`}
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteProject(project);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="garage-cardActionIcon"
                        >
                          <path
                            d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v8H7V9Zm4 0h2v8h-2V9Zm4 0h2v8h-2V9ZM6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      className="garage-cardAction garage-cardActionCustomize"
                      type="button"
                      aria-label={`Customize ${project.name}`}
                      title="Customize"
                      onClick={(e) => {
                        e.stopPropagation();
                        customizeProject(project);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="garage-cardActionIcon"
                      >
                        <path
                          d="m15.6 4.2 4.2 4.2-9.9 9.9-4.8.6.6-4.8 9.9-9.9Zm1.4-1.4a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8l-1 1-4.2-4.2 1-1Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="garage-saveHeader">
                    <span className="garage-saveTitle" title={project.name}>
                      {project.name}
                    </span>
                  </div>

                  <div className="garage-saveBody">
                    <div className="garage-saveInfo">
                      <div className="garage-saveBodyText">
                        {getCarFullNameFromModelUrl(project.modelUrl)}
                      </div>
                      <div className="garage-saveMeta">
                        {project.isDefault
                          ? "Used when you have no saved projects"
                          : project.engineType === "Electric"
                            ? "Hybrid"
                            : project.engineType ?? "Saved project"}
                      </div>
                    </div>
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
