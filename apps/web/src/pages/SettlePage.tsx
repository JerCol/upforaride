import { useEffect, useMemo, useState } from "react";
import { store } from "../dataStore";
import { USERS } from "../types";
import type { UserId } from "../types";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { computeKmByUser } from "../utils/rideShares";

interface UserSummary {
  userId: UserId;
  name: string;
  km: number;
  variablePaid: number;
  variableShare: number;
  variableNet: number;
  wearOwed: number;
  wearPaid: number;
  wearNet: number;
}

export function SettlePage() {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(setState);
    return unsub;
  }, []);

  const totalKmByUser = useMemo(() => {
    const allIds = USERS.map((u) => u.id);
    return computeKmByUser(state.rides, allIds);
  }, [state.rides]);

  const totalKmOverall = useMemo(
    () => Object.values(totalKmByUser).reduce((a, b) => a + b, 0),
    [totalKmByUser]
  );

  const totalVariableCosts = useMemo(
    () => state.costs.reduce((sum, c) => sum + c.amount, 0),
    [state.costs]
  );

  const summaries: UserSummary[] = useMemo(() => {
    return USERS.map((u) => {
      const km = totalKmByUser[u.id] ?? 0;

      const variablePaid = state.costs
        .filter((c) => c.userId === u.id)
        .reduce((sum, c) => sum + c.amount, 0);

      const variableShare =
        totalKmOverall > 0 ? (totalVariableCosts * km) / totalKmOverall : 0;

      const variableNet = variablePaid - variableShare;

      // Wear is based on km share too
      const wearOwed = km * state.config.wearRatePerKm;

      const wearPaid = state.wearPayments
        .filter((p) => p.userId === u.id)
        .reduce((sum, p) => sum + p.amount, 0);

      const wearNet = wearPaid - wearOwed;

      return {
        userId: u.id,
        name: u.name,
        km,
        variablePaid,
        variableShare,
        variableNet,
        wearOwed,
        wearPaid,
        wearNet,
      };
    });
  }, [
    state.costs,
    state.wearPayments,
    state.config.wearRatePerKm,
    totalKmByUser,
    totalKmOverall,
    totalVariableCosts,
  ]);

  function formatAmount(n: number): string {
    return n.toFixed(2);
  }

  return (
    <div className="page">
      <PageHeader title="Settle-up overview" />

      {summaries.map((s) => (
        <Card key={s.userId}>
          <h2>{s.name}</h2>

          <div className="stat-row">
            <span>Total km driven</span>
            <strong>{s.km.toFixed(2)} km</strong>
          </div>

          <hr className="divider" />

          <h3>Variable costs</h3>
          <div className="stat-row">
            <span>Paid</span>
            <strong>€ {formatAmount(s.variablePaid)}</strong>
          </div>
          <div className="stat-row">
            <span>Fair share</span>
            <strong>€ {formatAmount(s.variableShare)}</strong>
          </div>
          <div className="stat-row">
            <span>Net</span>
            <strong
              className={
                s.variableNet >= 0 ? "amount-positive" : "amount-negative"
              }
            >
              € {formatAmount(s.variableNet)}{" "}
              {s.variableNet >= 0 ? "(others owe them)" : "(they owe others)"}
            </strong>
          </div>

          <hr className="divider" />

          <h3>Wear reserve</h3>
          <div className="stat-row">
            <span>Wear owed</span>
            <strong>€ {formatAmount(s.wearOwed)}</strong>
          </div>
          <div className="stat-row">
            <span>Paid to reserve</span>
            <strong>€ {formatAmount(s.wearPaid)}</strong>
          </div>
          <div className="stat-row">
            <span>Net wear</span>
            <strong
              className={s.wearNet >= 0 ? "amount-positive" : "amount-negative"}
            >
              € {formatAmount(s.wearNet)}{" "}
              {s.wearNet >= 0 ? "(prepaid)" : "(still owes)"}
            </strong>
          </div>
        </Card>
      ))}
    </div>
  );
}
