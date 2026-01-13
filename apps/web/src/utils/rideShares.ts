import type { Ride, UserId } from "../types";

/**
 * Returns participant ids for a ride with a safe fallback for older rides.
 */
export function getParticipants(ride: Ride): UserId[] {
  if (Array.isArray(ride.participantIds) && ride.participantIds.length > 0) {
    return ride.participantIds;
  }
  // fallback for older data
  return [ride.userId];
}

/**
 * Distribute the ride distance equally among all participants.
 * Adds the km share to the totals map.
 */
export function addRideKmShares(
  totals: Record<UserId, number>,
  ride: Ride
): void {
  if (ride.endKm == null) return;

  const distance = ride.endKm - ride.startKm;
  if (!Number.isFinite(distance) || distance <= 0) return;

  const participants = getParticipants(ride);
  const share = distance / participants.length;

  for (const pid of participants) {
    totals[pid] = (totals[pid] ?? 0) + share;
  }
}

/**
 * Build a full km-by-user map from rides, split equally among participants.
 * Initializes all users to 0 so lookups are always defined.
 */
export function computeKmByUser(
  rides: Ride[],
  allUserIds: UserId[]
): Record<UserId, number> {
  const totals = Object.fromEntries(allUserIds.map((id) => [id, 0])) as Record<
    UserId,
    number
  >;

  for (const r of rides) {
    addRideKmShares(totals, r);
  }
  return totals;
}
