// src/dataStore.ts
import { api } from "./api";
import type { AppConfig, CostEvent, Ride, State, WearPayment } from "./types";

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

async function loadFromBackend() {
  try {
    const backendState = await api.getState();
    state = backendState;
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
