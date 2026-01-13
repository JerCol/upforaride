import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { store } from "../dataStore";
import { USERS } from "../types";
import type { UserId } from "../types";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { InlineNotification } from "../components/InlineNotification";
import { PageHeader } from "../components/PageHeader";
import { computeKmByUser } from "../utils/rideShares";

export function StatsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState(store.getState());
  const [wearAmount, setWearAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, []);

  const user = USERS.find((u) => u.id === userId);

  const totalKmByUser = useMemo(() => {
    const allIds = USERS.map((u) => u.id);
    return computeKmByUser(state.rides, allIds);
  }, [state.rides]);

  const totalKmOverall = useMemo(() => {
    return Object.values(totalKmByUser).reduce((a, b) => a + b, 0);
  }, [totalKmByUser]);

  const totalVariableCosts = useMemo(
    () => state.costs.reduce((sum, c) => sum + c.amount, 0),
    [state.costs]
  );

  const kmUser = userId ? totalKmByUser[userId as UserId] ?? 0 : 0;

  const variablePaidByUser = useMemo(
    () =>
      userId
        ? state.costs
            .filter((c) => c.userId === (userId as UserId))
            .reduce((sum, c) => sum + c.amount, 0)
        : 0,
    [state.costs, userId]
  );

  const fairShare =
    totalKmOverall > 0 ? (totalVariableCosts * kmUser) / totalKmOverall : 0;

  const netVariable = variablePaidByUser - fairShare;

  // Wear is also based on km share (km split among participants)
  const wearOwed = kmUser * state.config.wearRatePerKm;

  const wearPaidByUser = useMemo(
    () =>
      userId
        ? state.wearPayments
            .filter((p) => p.userId === (userId as UserId))
            .reduce((sum, p) => sum + p.amount, 0)
        : 0,
    [state.wearPayments, userId]
  );

  const netWear = wearPaidByUser - wearOwed;

  if (!user || !userId) {
    return (
      <div className="page">
        <PageHeader title="User not found" />
      </div>
    );
  }

  function handleAddWearPayment() {
    setError(null);

    if (!userId || !user) {
      setError("User missing or not found.");
      return;
    }

    const value = Number(wearAmount);
    if (!wearAmount || Number.isNaN(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const paymentId = crypto.randomUUID();
    store.addWearPayment({
      id: paymentId,
      userId: userId as UserId,
      amount: value,
      createdAt: new Date().toISOString(),
    });
    setWearAmount("");

    navigate("/", {
      state: {
        notification: {
          type: "success",
          message: `Wear payment of €${value.toFixed(2)} recorded for ${
            user.name
          }.`,
        },
      },
    });
  }

  function formatAmount(n: number): string {
    return n.toFixed(2);
  }

  return (
    <div className="page">
      <PageHeader title="Statistieken" />

      {error && (
        <InlineNotification type="error" onClose={() => setError(null)}>
          {error}
        </InlineNotification>
      )}

      <Card>
        <h2>Usage</h2>
        <div className="stat-row">
          <span>Total km driven</span>
          <strong>{kmUser.toFixed(2)} km</strong>
        </div>
      </Card>

      <Card>
        <h2>Variable costs (fuel + insurance + other)</h2>
        <div className="stat-row">
          <span>Paid by {user.name}</span>
          <strong>€ {formatAmount(variablePaidByUser)}</strong>
        </div>
        <div className="stat-row">
          <span>Fair share</span>
          <strong>€ {formatAmount(fairShare)}</strong>
        </div>
        <div className="stat-row">
          <span>Net</span>
          <strong
            className={netVariable >= 0 ? "amount-positive" : "amount-negative"}
          >
            € {formatAmount(netVariable)}{" "}
            {netVariable >= 0 ? "(others owe you)" : "(you owe others)"}
          </strong>
        </div>
      </Card>

      <Card>
        <h2>Wear reserve</h2>
        <div className="stat-row">
          <span>Wear owed (km × rate)</span>
          <strong>€ {formatAmount(wearOwed)}</strong>
        </div>
        <div className="stat-row">
          <span>Paid to reserve</span>
          <strong>€ {formatAmount(wearPaidByUser)}</strong>
        </div>
        <div className="stat-row">
          <span>Net wear</span>
          <strong
            className={netWear >= 0 ? "amount-positive" : "amount-negative"}
          >
            € {formatAmount(netWear)}{" "}
            {netWear >= 0 ? "(you prepaid)" : "(you still owe)"}
          </strong>
        </div>

        <div className="field">
          <span className="field-label">Add wear payment (€)</span>
          <input
            type="number"
            className="field-input"
            value={wearAmount}
            onChange={(e) => setWearAmount(e.target.value)}
          />
        </div>

        <PrimaryButton onClick={handleAddWearPayment}>
          Add wear payment
        </PrimaryButton>
      </Card>
    </div>
  );
}
