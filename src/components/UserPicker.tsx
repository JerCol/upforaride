import type { User, UserId } from "../types";

interface UserPickerProps {
  users: User[];
  value: UserId | undefined;
  onChange: (value: UserId) => void;
  label?: string;
}

export function UserPicker({
  users,
  value,
  onChange,
  label = "User",
}: UserPickerProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as UserId)}
        className="field-input"
      >
        <option value="" disabled>
          Select user…
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
