import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { USERS, type UserId, type Ride } from "../types";
import { store } from "../dataStore";
import { UserPicker } from "../components/UserPicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { InlineNotification } from "../components/InlineNotification";
import { OdometerScanner } from "../components/OdometerScanner";
import { PageHeader } from "../components/PageHeader";

type Mode = "start" | "stop";

export function RidePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") || "start") as Mode;
  const preUserId = searchParams.get("userId") || undefined;

  // "Started by" user (driver/initiator) - used when starting only
  const [userId, setUserId] = useState<UserId | undefined>(
    (preUserId as UserId | undefined) ?? USERS[0]?.id
  );

  const [km, setKm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState(store.getState());
  const [scannerOpen, setScannerOpen] = useState(false);

  // Participants (multi select) - start mode only
  const [participantIds, setParticipantIds] = useState<UserId[]>(() =>
    userId ? [userId] : []
  );

  // Keep the starter included by default
  useEffect(() => {
    if (mode !== "start") return;
    if (userId && !participantIds.includes(userId)) {
      setParticipantIds((prev) => [userId, ...prev]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode]);

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, []);

  const lastRide = useMemo(() => {
    if (!state.rides.length) return undefined;
    return [...state.rides].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  }, [state.rides]);

  const lastKnownKm =
    lastRide?.endKm ?? (lastRide ? lastRide.startKm : undefined) ?? 0;

  // Prefill km in start mode
  useEffect(() => {
    if (mode === "start" && km === "" && lastKnownKm != null) {
      setKm(String(lastKnownKm));
    }
  }, [mode, lastKnownKm, km]);

  // Current open ride: the most recent ride without endKm
  const openRide = useMemo(() => {
    return [...state.rides]
      .filter((r) => r.endKm == null)
      .sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0];
  }, [state.rides]);

  async function handleSubmit() {
    setError(null);

    const kmValue = Number(km);
    if (!km || Number.isNaN(kmValue) || kmValue <= 0) {
      setError("Enter a valid km value.");
      return;
    }

    if (mode === "start") {
      if (!userId) {
        setError("Select who starts the ride.");
        return;
      }

      if (!participantIds.length) {
        setError("Select at least 1 participant.");
        return;
      }

      // If there is already an open ride, close it with this km (no location here)
      if (openRide) {
        if (kmValue <= openRide.startKm) {
          setError(
            `Current km must be greater than the open ride's start km (${openRide.startKm}).`
          );
          return;
        }

        const closed: Ride = {
          ...openRide,
          endKm: kmValue,
          endedAt: new Date().toISOString(),
          endLat: openRide.endLat ?? null,
          endLng: openRide.endLng ?? null,
        };
        await store.updateRide(closed);
      }

      const rideId = crypto.randomUUID();
      const newRide: Ride = {
        id: rideId,
        userId,
        participantIds,
        startKm: kmValue,
        startedAt: new Date().toISOString(),
        endKm: null,
        endedAt: null,
        endLat: null,
        endLng: null,
      };

      await store.addRide(newRide);

      navigate("/", {
        state: {
          notification: {
            type: "success",
            message: "Ride started successfully.",
          },
        },
      });

      return;
    }

    // mode === "stop"
    if (!openRide) {
      setError("No open ride found.");
      return;
    }

    if (kmValue <= openRide.startKm) {
      setError(
        `End km must be greater than the ride's start km (${openRide.startKm}).`
      );
      return;
    }

    const finalizeStop = async (coords?: GeolocationCoordinates | null) => {
      const updated: Ride = {
        ...openRide,
        endKm: kmValue,
        endedAt: new Date().toISOString(),
        endLat: coords ? coords.latitude : openRide.endLat ?? null,
        endLng: coords ? coords.longitude : openRide.endLng ?? null,
      };

      await store.updateRide(updated);

      navigate("/", {
        state: {
          notification: {
            type: "success",
            message: `Ride stopped. Distance: ${kmValue - openRide.startKm} km.`,
          },
        },
      });
    };

    // Offer to store location automatically on stop
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void finalizeStop(pos.coords);
        },
        () => {
          void finalizeStop(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      await finalizeStop(null);
    }
  }

  const title = mode === "start" ? "Start ride" : "Stop ride";

  return (
    <div className="page">
      <PageHeader title={title} />

      {error && (
        <InlineNotification type="error" onClose={() => setError(null)}>
          {error}
        </InlineNotification>
      )}

      <Card>
        {mode === "start" && (
          <>
          

            <div className="field">
              <span className="field-label">Participants</span>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {USERS.map((u) => {
                  const checked = participantIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setParticipantIds((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((x) => x !== u.id)
                              : [...prev, u.id]
                          );
                        }}
                      />
                      <span>{u.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                Costs and wear will be split equally among participants.
              </p>
            </div>
          </>
        )}

        {mode === "stop" && (
          <div className="banner-warning">
            {openRide ? (
              <>
                Current ride started at km <strong>{openRide.startKm}</strong>{" "}
                with <strong>{openRide.participantIds.length}</strong>{" "}
                participant(s):{" "}
                <strong>
                  {openRide.participantIds
                    .map((id) => USERS.find((u) => u.id === id)?.name ?? id)
                    .join(", ")}
                </strong>
                .
                <br />
                Anyone can stop this ride by entering the current km.
              </>
            ) : (
              <>There is currently no open ride.</>
            )}
          </div>
        )}

        <label className="field">
          <span className="field-label">
            {mode === "start" ? "Start km (odometer)" : "End km (odometer)"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              className="field-input"
              style={{ flex: 1 }}
              value={km}
              onChange={(e) => setKm(e.target.value)}
            />
            <button
              type="button"
              className="scanner-button-secondary"
              onClick={() => setScannerOpen(true)}
              style={{ whiteSpace: "nowrap" }}
            >
              📷 Scan
            </button>
          </div>
        </label>

        {mode === "start" && lastKnownKm !== undefined && (
          <p className="hint">
            Last known km: <strong>{lastKnownKm}</strong>
          </p>
        )}

        <PrimaryButton onClick={handleSubmit}>
          {mode === "start" ? "Start ride" : "Stop ride"}
        </PrimaryButton>
      </Card>

      <OdometerScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onValueDetected={(value) => {
          setKm(String(value));
        }}
      />
    </div>
  );
}
