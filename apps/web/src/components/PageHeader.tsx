import { useLocation, useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  /** force show/hide back; if omitted, auto-hide on "/" */
  showBackButton?: boolean;
}

export function PageHeader({ title, showBackButton }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const shouldShowBack =
    showBackButton !== undefined
      ? showBackButton
      : location.pathname !== "/";

  const handleBack = () => {
    // If there's something in the history, go back.
    // Otherwise, go to home.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="page-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {shouldShowBack && (
        <button
          type="button"
          onClick={handleBack}
          className="scanner-button-secondary"
          style={{
            paddingInline: 10,
            paddingBlock: 6,
            borderRadius: 999,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>←</span>
          <span>Home</span>
        </button>
      )}
      <h1 style={{ margin: 0, flex: 1, textAlign: "center" }}>
        {title}
      </h1>
    </header>
  );
}
