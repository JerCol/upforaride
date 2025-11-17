// src/api.ts
import type { State, Ride, CostEvent, WearPayment } from "./types";

// Base URL for the API.
// In production: set VITE_API_BASE to your worker, e.g. https://up-for-a-ride-worker.jeroen-colon.workers.dev
// In local dev with wrangler dev: VITE_API_BASE=http://127.0.0.1:8787
export const API_BASE = import.meta.env.VITE_API_BASE || "";

// Small helper to call the API with JSON
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getState(): Promise<State> {
    return apiFetch<State>("/api/state");
  },

  createRide(ride: Ride): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>("/api/rides", {
      method: "POST",
      body: JSON.stringify({
        id: ride.id,
        userId: ride.userId,
        startKm: ride.startKm,
        startedAt: ride.startedAt,
      }),
    });
  },

  updateRide(ride: Ride): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>(`/api/rides/${ride.id}`, {
      method: "PUT",
      body: JSON.stringify({
        userId: ride.userId,
        startKm: ride.startKm,
        endKm: ride.endKm ?? null,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt ?? null,
      }),
    });
  },

  createCost(cost: CostEvent): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>("/api/costs", {
      method: "POST",
      body: JSON.stringify(cost),
    });
  },

  createWearPayment(payment: WearPayment): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>("/api/wear-payments", {
      method: "POST",
      body: JSON.stringify(payment),
    });
  },
};
