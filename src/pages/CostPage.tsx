import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { USERS } from "../types";
import type { CostType, UserId } from "../types";
import { store } from "../dataStore";
import { UserPicker } from "../components/UserPicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { InlineNotification } from "../components/InlineNotification";

export function CostPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<UserId | undefined>(USERS[0]?.id);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<CostType>("FUEL");
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {});
    return unsub;
  }, []);

  function handleSubmit() {
    setError(null);

    if (!userId) {
      setError("Select a user.");
      return;
    }
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const costId = crypto.randomUUID();
    store.addCost({
      id: costId,
      userId,
      amount: value,
      type,
      description: description || undefined,
      createdAt: new Date().toISOString(),
    });

    navigate("/", {
      state: {
        notification: {
          type: "success",
          message: "Cost recorded successfully.",
        },
      },
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Add fuel / insurance</h1>
      </header>

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
          label="Who paid?"
        />

        <label className="field">
          <span className="field-label">Amount (€)</span>
          <input
            type="number"
            className="field-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Type</span>
          <select
            className="field-input"
            value={type}
            onChange={(e) => setType(e.target.value as CostType)}
          >
            <option value="FUEL">Fuel</option>
            <option value="INSURANCE">Insurance</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Note (optional)</span>
          <input
            className="field-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. full tank at Q8"
          />
        </label>

        <PrimaryButton onClick={handleSubmit}>Save cost</PrimaryButton>
      </Card>
    </div>
  );
}
