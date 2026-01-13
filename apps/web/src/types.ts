export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  color?: string;
}

export interface Ride {
  id: string;
  userId: UserId; // keep as "driver/creator" if you want, or optional later
  participantIds: UserId[]; // ✅ new
  startKm: number;
  endKm: number | null;
  startedAt: string;
  endedAt: string | null;
  endLat?: number | null;
  endLng?: number | null;
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
  { id: "jeroen", name: "Jeroen" },
  { id: "stijn", name: "Stijn" },
  { id: "silke", name: "Silke" },
  { id: "hanne", name: "Hanne" },
  { id: "hella", name: "Hella" },
];
