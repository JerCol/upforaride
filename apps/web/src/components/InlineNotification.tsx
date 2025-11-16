import type { ReactNode } from "react";

type NotificationType = "success" | "error" | "info";

interface InlineNotificationProps {
  type?: NotificationType;
  children: ReactNode;
  onClose?: () => void;
}

export function InlineNotification({
  type = "info",
  children,
  onClose,
}: InlineNotificationProps) {
  const typeClass =
    type === "success"
      ? "notification-success"
      : type === "error"
      ? "notification-error"
      : "notification-info";

  return (
    <div className={`notification ${typeClass}`}>
      <div className="notification-content">{children}</div>
      {onClose && (
        <button
          className="notification-close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}
