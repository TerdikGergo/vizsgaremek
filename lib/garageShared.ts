export type CarId = "Lambo" | "Dodge" | "Merci";

export type SavedCarBuildRow = {
  id: string;
  user_id?: string;
  name: string;
  model_url: string;
  engine_type: string;
  engine: string;
  materials_egy: string;
  materials_ketto: string;
  materials_harom: string;
  materials_negy: string;
  materials_ot: string;
  materials_hat: string;
  is_active?: boolean;
};

export type GarageProject = {
  id: string;
  name: string;
  modelUrl: string;
  engineType?: string;
  engine?: string;
  isDefault: boolean;
  isActive?: boolean;
};

export const CUSTOMIZE_MODEL_URL_KEY = "selectedCarModelUrl";
export const ACTIVE_PROJECT_ID_KEY = "garageActiveProjectId";
export const ACTIVE_MODEL_URL_KEY = "garageActiveModelUrl";
export const EDITING_BUILD_ID_KEY = "garageEditingBuildId";

export const DEFAULT_PROJECT_ID = "default-project";
export const DEFAULT_PROJECT_NAME = "Default Project";
export const DEFAULT_MODEL_URL = "/models/Dodge_MidnightBlack_LB_WB_SC_HB.glb";

export const FULL_CAR_NAMES: Record<CarId, string> = {
  Lambo: "2019 Lamborghini Aventador SVJ",
  Merci: "2014 Mercedes-Benz SLS AMG",
  Dodge: "2016 Dodge Viper ACR",
};

export function normalizeModelUrl(value?: string | null): string {
  if (!value || value.trim().length === 0) return DEFAULT_MODEL_URL;

  const noQuery = value.trim().split("?")[0];
  if (!noQuery) return DEFAULT_MODEL_URL;

  let normalized = noQuery
    .replace(/^\/?Models\//i, "/models/")
    .replace(/^\/?models\//i, "/models/");

  if (!normalized.toLowerCase().endsWith(".glb")) {
    normalized = `${normalized}.glb`;
  }

  if (!normalized.startsWith("/")) {
    const hasPath = normalized.includes("/");
    normalized = hasPath ? `/${normalized.replace(/^\/+/, "")}` : `/models/${normalized}`;
  }

  if (!normalized.startsWith("/models/")) {
    const fileName = normalized.split("/").pop() ?? normalized;
    normalized = `/models/${fileName}`;
  }

  return normalized;
}

export function getModelFileName(modelUrl: string): string {
  return normalizeModelUrl(modelUrl).split("/").pop() ?? "";
}

export function getModelBaseName(modelUrl: string): string {
  return getModelFileName(modelUrl).replace(/\.glb$/i, "");
}

export function getModelLookupCandidates(modelUrl: string): string[] {
  const normalized = normalizeModelUrl(modelUrl);
  const fileName = getModelFileName(normalized);
  const baseName = getModelBaseName(normalized);

  return Array.from(
    new Set([
      normalized,
      normalized.replace("/models/", "/Models/"),
      fileName,
      baseName,
    ]),
  );
}

export async function resolveStoredModelUrl(supabase: any, browserModelUrl: string): Promise<string> {
  const candidates = getModelLookupCandidates(browserModelUrl);

  const { data, error } = await supabase
    .from("models")
    .select("model_url")
    .in("model_url", candidates);

  if (error) {
    throw error;
  }

  const matched = candidates.find((candidate) =>
    (data ?? []).some((row: { model_url: string }) => row.model_url === candidate),
  );

  return matched ?? candidates[0];
}

export function getCarIdFromModelUrl(modelUrl: string): CarId | null {
  const [carRaw] = getModelBaseName(modelUrl).split("_");
  if (carRaw === "Lambo" || carRaw === "Dodge" || carRaw === "Merci") {
    return carRaw;
  }
  return null;
}

export function getCarFullName(carId: CarId | null): string {
  return carId ? FULL_CAR_NAMES[carId] : "Custom Car";
}

export function getCarFullNameFromModelUrl(modelUrl: string): string {
  return getCarFullName(getCarIdFromModelUrl(modelUrl));
}

export function getPreferredSavedBuild(
  rows: SavedCarBuildRow[],
): SavedCarBuildRow | null {
  return rows.find((row) => row.is_active) ?? rows[0] ?? null;
}

export async function setSavedBuildActiveInDatabase(
  supabase: any,
  userId: string,
  buildId: string,
): Promise<void> {
  const { error: deactivateError } = await supabase
    .from("saved_car_builds")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("id", buildId);

  if (deactivateError) {
    throw deactivateError;
  }

  const { error: activateError } = await supabase
    .from("saved_car_builds")
    .update({ is_active: true })
    .eq("user_id", userId)
    .eq("id", buildId);

  if (activateError) {
    throw activateError;
  }
}

export function optionIdToStoredIndex(
  options: Array<{ id: string }>,
  selectedId: string,
): string {
  const index = options.findIndex((option) => option.id === selectedId);
  return String(index >= 0 ? index : 0);
}

export function storedValueToOptionId(
  options: Array<{ id: string }>,
  storedValue: string | null | undefined,
  fallbackId?: string,
): string {
  const fallback = fallbackId ?? options[0]?.id ?? "";
  if (storedValue == null) return fallback;

  const trimmed = String(storedValue).trim();
  const parsedIndex = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(parsedIndex) && options[parsedIndex]) {
    return options[parsedIndex].id;
  }

  const directMatch = options.find((option) => option.id === trimmed);
  return directMatch?.id ?? fallback;
}

export function setActiveProjectStorage(projectId: string, modelUrl: string) {
  if (typeof window === "undefined") return;

  const normalized = normalizeModelUrl(modelUrl);
  localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
  localStorage.setItem(ACTIVE_MODEL_URL_KEY, normalized);
  localStorage.setItem(CUSTOMIZE_MODEL_URL_KEY, normalized);
}

export function clearEditingProjectStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(EDITING_BUILD_ID_KEY);
}

export function buildDefaultProject(): GarageProject {
  return {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    modelUrl: DEFAULT_MODEL_URL,
    isDefault: true,
  };
}


