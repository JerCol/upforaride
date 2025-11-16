// src/api.ts
import type { State, Ride, CostEvent, WearPayment } from "./types";

// If your Worker is on the same domain under /api, leave this empty string.
// If it's another hostname, put that base URL here (e.g. "https://api.example.com").
const API_BASE = import.meta.env.VITE_API_BASE || "";

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
