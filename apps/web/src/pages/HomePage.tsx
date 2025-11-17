import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { USERS } from "../types";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { InlineNotification } from "../components/InlineNotification";
import { store } from "../dataStore";
import { PageHeader } from "../components/PageHeader"; 

interface NavNotification {
  type: "success" | "error" | "info";
  message: string;
}

export function HomePage() {
  const location = useLocation();
  const navState = location.state as { notification?: NavNotification } | null;

  const [notification, setNotification] = useState<NavNotification | null>(
    navState?.notification ?? null
  );

  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(setState);
    return unsub;
  }, []);

  useEffect(() => {
    if (navState?.notification) {
      setNotification(navState.notification);
    }
  }, [navState]);

  const usersById = useMemo(
    () => Object.fromEntries(USERS.map((u) => [u.id, u])),
    []
  );

  const lastWithLocation = useMemo(() => {
    if (!state.rides.length) return undefined;
    return [...state.rides]
      .filter((r) => r.endKm != null && r.endLat != null && r.endLng != null)
      .sort((a, b) =>
        (b.endedAt || "").localeCompare(a.endedAt || "")
      )[0];
  }, [state.rides]);

  return (
    <div className="page">
       <PageHeader title="🚗 UP for a ride 🚗" />   {/* 👈 instead of plain <header> */}


      {lastWithLocation && (
  <section className="card">
    <h2 className="card-title">Waar staat de auto nu?</h2>

    <p className="card-text">
      Laatst bekende parkeerlocatie geregistreerd door{" "}
      <strong>
        {usersById[lastWithLocation.userId]?.name ?? lastWithLocation.userId}
      </strong>{" "}
      op{" "}
      <strong>
        {new Date(lastWithLocation.endedAt ?? "").toLocaleString("nl-BE", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </strong>
      .
    </p>

    <div style={{ marginTop: 8 }}>
    <a
  href={`https://www.google.com/maps?q=${lastWithLocation.endLat},${lastWithLocation.endLng}`}
  target="_blank"
  rel="noreferrer"
  style={{
    color: "#007AFF",
    textDecoration: "underline",
    fontWeight: 500
  }}
>
  Navigeer naar ons UPke
</a>
    </div>
  </section>
)}



      {notification && (
        <InlineNotification
          type={notification.type}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </InlineNotification>
      )}

      <Card>
        <h2>Quick actions</h2>
        <div className="button-group">
          <Link to="/ride?mode=start">
            <PrimaryButton>Start ride</PrimaryButton>
          </Link>
          <Link to="/ride?mode=stop">
            <PrimaryButton>Stop ride</PrimaryButton>
          </Link>
          <Link to="/cost">
            <PrimaryButton>Add cost</PrimaryButton>
          </Link>
          <Link to="/settle">
            <PrimaryButton>Settle-up overview</PrimaryButton>
          </Link>
        </div>
      </Card>

      <Card>
        <h2>User statistics</h2>
        <div className="user-list">
          {USERS.map((u) => (
            <Link key={u.id} to={`/stats/${u.id}`} className="user-link">
              {u.name}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
