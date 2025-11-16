import type { AppConfig, CostEvent, Ride, State, WearPayment } from "./types";

const STORAGE_KEY = "up-for-a-ride-state-v1";

const defaultState: State = {
  rides: [],
  costs: [],
  wearPayments: [],
  config: {
    wearRatePerKm: 0.20, // example €/km for wear
  },
};

function load(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as State) : defaultState;
  } catch {
    return defaultState;
  }
}

let state: State = load();

type Listener = (s: State) => void;
const listeners: Listener[] = [];

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notify() {
  listeners.forEach((l) => l(state));
}

export const store = {
  getState(): State {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    // immediate sync
    listener(state);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },

  addRide(ride: Ride) {
    state = { ...state, rides: [...state.rides, ride] };
    persist();
    notify();
  },

  updateRide(updated: Ride) {
    state = {
      ...state,
      rides: state.rides.map((r) => (r.id === updated.id ? updated : r)),
    };
    persist();
    notify();
  },

  addCost(cost: CostEvent) {
    state = { ...state, costs: [...state.costs, cost] };
    persist();
    notify();
  },

  addWearPayment(payment: WearPayment) {
    state = {
      ...state,
      wearPayments: [...state.wearPayments, payment],
    };
    persist();
    notify();
  },

  updateConfig(config: Partial<AppConfig>) {
    state = {
      ...state,
      config: { ...state.config, ...config },
    };
    persist();
    notify();
  },
};
