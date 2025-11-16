import { Link, useLocation } from "react-router-dom";
import { USERS } from "../types";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { InlineNotification } from "../components/InlineNotification";
import { useEffect, useState } from "react";

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

  // Optional: clear notification when location changes
  useEffect(() => {
    if (navState?.notification) {
      setNotification(navState.notification);
    }
  }, [navState]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>up-for-a-ride</h1>
        <p className="subtitle">Shared VW Up – simple cost sharing</p>
      </header>

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
            <PrimaryButton>Add fuel / insurance</PrimaryButton>
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
