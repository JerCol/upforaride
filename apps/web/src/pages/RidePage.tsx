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

  const [userId, setUserId] = useState<UserId | undefined>(
    (preUserId as UserId | undefined) ?? USERS[0]?.id
  );
  const [km, setKm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState(store.getState());
  const [scannerOpen, setScannerOpen] = useState(false);

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

  // Prefill start-km once when loading
  useEffect(() => {
    if (mode === "start" && km === "" && lastKnownKm != null) {
      setKm(String(lastKnownKm));
    }
  }, [mode, lastKnownKm, km]);

  const openRideForUser = useMemo(() => {
    if (!userId) return undefined;
    return state.rides
      .filter((r) => r.userId === userId && r.endKm == null)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0];
  }, [state.rides, userId]);

  const lastRideUser =
    lastRide && USERS.find((u) => u.id === lastRide.userId);

  function handleSubmit() {
    setError(null);

    if (!userId) {
      setError("Select a user.");
      return;
    }

    const kmValue = Number(km);
    if (!km || Number.isNaN(kmValue) || kmValue <= 0) {
      setError("Enter a valid km value.");
      return;
    }

    if (mode === "start") {
      // If previous ride has no endKm, close it with this km
      if (lastRide && lastRide.endKm == null) {
        if (kmValue <= lastRide.startKm) {
          setError(
            `Current km must be greater than the open ride's start km (${lastRide.startKm}).`
          );
          return;
        }

        const closed: Ride = {
          ...lastRide,
          endKm: kmValue,
          endedAt: new Date().toISOString(),
          endLat: lastRide.endLat ?? null,
          endLng: lastRide.endLng ?? null,
        };
        store.updateRide(closed);
      }

      const rideId = crypto.randomUUID();
      const newRide: Ride = {
        id: rideId,
        userId,
        startKm: kmValue,
        startedAt: new Date().toISOString(),
        endKm: null,
        endedAt: null,
        endLat: null,
        endLng: null,
      };

      store.addRide(newRide);

      navigate("/", {
        state: {
          notification: {
            type: "success",
            message: "Ride started successfully.",
          },
        },
      });
    } else {
      // stop mode
      const open = openRideForUser;
      if (!open) {
        setError("No open ride found for this user.");
        return;
      }
      if (kmValue <= open.startKm) {
        setError(
          `End km must be greater than the ride's start km (${open.startKm}).`
        );
        return;
      }

      const finalizeStop = (coords?: GeolocationCoordinates | null) => {
        const updatedRide: Ride = {
          ...open,
          endKm: kmValue,
          endedAt: new Date().toISOString(),
          endLat: coords
            ? coords.latitude
            : open.endLat ?? null,
          endLng: coords
            ? coords.longitude
            : open.endLng ?? null,
        };

        store.updateRide(updatedRide);

        navigate("/", {
          state: {
            notification: {
              type: "success",
              message: `Ride stopped. Distance: ${
                kmValue - open.startKm
              } km.`,
            },
          },
        });
      };

      // 👉 Here we "offer" to save location when stopping
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // User allowed / success: store car location
            finalizeStop(pos.coords);
          },
          (err) => {
            console.error("Geolocation error on stop:", err);
            // Permission denied or error: still stop ride, just without new location
            finalizeStop(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      } else {
        // Browser does not support geolocation → just stop ride
        finalizeStop(null);
      }
    }
  }

  const title = mode === "start" ? "Start ride" : "Stop ride";

  return (
    <div className="page">
      <PageHeader title={title} />   {/* 👈 replaces <header className="page-header">... */}

    {error && (
      <InlineNotification type="error" onClose={() => setError(null)}>
        {error}
      </InlineNotification>
    )}

      <Card>
        <UserPicker
          users={USERS}
          value={userId}
          onChange={setUserId}
          label="Who are you?"
        />

        {mode === "start" && lastRide && lastRide.endKm == null && (
          <div className="banner-warning">
            {lastRideUser ? (
              <>
                User <strong>{lastRideUser.name}</strong> still has an open
                ride starting at km <strong>{lastRide.startKm}</strong>. <br />
                By entering the <strong>current km</strong> and starting your
                ride, you will{" "}
                <strong>
                  stop their ride and start a new one for you
                </strong>
                .
              </>
            ) : (
              <>
                The previous ride was not finished. Enter the{" "}
                <strong>current km</strong> to close it and start your ride.
              </>
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

        {mode === "stop" && openRideForUser && (
          <p className="hint">
            This ride started at km{" "}
            <strong>{openRideForUser.startKm}</strong>.
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
