export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  color?: string;
}

export interface Ride {
  id: string;
  userId: UserId;
  startKm: number;
  endKm?: number;
  startedAt: string; // ISO
  endedAt?: string;  // ISO
}

export type CostType = "FUEL" | "INSURANCE" | "OTHER";

export interface CostEvent {
  id: string;
  userId: UserId;
  amount: number; // €
  type: CostType;
  description?: string;
  createdAt: string; // ISO
}

export interface WearPayment {
  id: string;
  userId: UserId;
  amount: number; // € paid into wear-reserve
  createdAt: string;
}

export interface AppConfig {
  wearRatePerKm: number; // € per km
}

export interface State {
  rides: Ride[];
  costs: CostEvent[];
  wearPayments: WearPayment[];
  config: AppConfig;
}

// For now: hardcoded users
export const USERS: User[] = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
  { id: "charlie", name: "Charlie" },
];
