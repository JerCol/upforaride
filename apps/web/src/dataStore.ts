// src/dataStore.ts
import { api } from "./api";
import type {
  AppConfig,
  CostEvent,
  Ride,
  State,
  WearPayment,
  UserId,
} from "./types";


const defaultState: State = {
  rides: [],
  costs: [],
  wearPayments: [],
  config: {
    wearRatePerKm: 0.2,
  },
};

let state: State = defaultState;
let isLoaded = false;

type Listener = (s: State) => void;
const listeners: Listener[] = [];

function notify() {
  listeners.forEach((l) => l(state));
}

function parseParticipantIds(value: unknown): UserId[] {
  // If backend already returns an array, accept it
  if (Array.isArray(value)) return value as UserId[];

  // If backend returns JSON text (most likely), parse it
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as UserId[];
    } catch {
      // ignore
    }
  }

  // Default: empty
  return [];
}

function normalizeRide(r: any): Ride {
  const participantIds = parseParticipantIds(r.participantIds);

  return {
    id: r.id,
    userId: r.userId as UserId,
    participantIds, // ✅ now always UserId[]
    startKm: Number(r.startKm),
    endKm: r.endKm == null ? null : Number(r.endKm),
    startedAt: String(r.startedAt),
    endedAt: r.endedAt == null ? null : String(r.endedAt),
    endLat: r.endLat == null ? null : Number(r.endLat),
    endLng: r.endLng == null ? null : Number(r.endLng),
  };
}


async function loadFromBackend() {
  try {
    const backendState = await api.getState();

    // Normalize rides because backend may return participantIds as JSON string
    state = {
      ...backendState,
      rides: (backendState.rides ?? []).map(normalizeRide),
    };

    isLoaded = true;
    notify();
  } catch (err) {
    console.error("Failed to load state:", err);
  }
}


export const store = {
  getState(): State {
    // kick off initial load in background if not done yet
    if (!isLoaded) {
      // fire and forget
      void loadFromBackend();
    }
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    // send current state immediately
    listener(state);

    // ensure backend is loaded
    if (!isLoaded) {
      void loadFromBackend();
    }

    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },

  async refresh() {
    await loadFromBackend();
  },

  async addRide(ride: Ride) {
    await api.createRide(ride);
    await loadFromBackend();
  },

  async updateRide(ride: Ride) {
    await api.updateRide(ride);
    await loadFromBackend();
  },

  async addCost(cost: CostEvent) {
    await api.createCost(cost);
    await loadFromBackend();
  },

  async addWearPayment(payment: WearPayment) {
    await api.createWearPayment(payment);
    await loadFromBackend();
  },

  // optional config update, if you later expose config editing in UI
  async updateConfig(config: Partial<AppConfig>) {
    // for now, just update locally
    state = {
      ...state,
      config: { ...state.config, ...config },
    };
    notify();
  },
};
