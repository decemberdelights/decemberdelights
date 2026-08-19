"use client";

interface SuccessAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface SuccessStateProps {
  title: string;
  description: string;
  actions?: SuccessAction[];
  children?: React.ReactNode;
}

export default function SuccessState({ title, description, actions, children }: SuccessStateProps) {
  return (
    <main data-bg="light" style={{ minHeight: "100vh", background: "#fdf9f4", display: "flex", alignItems: "center", justifyContent: "center", padding: "8rem 1.5rem 4rem" }}>
      <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#1b3c33", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", animation: "successPop 0.5s ease forwards, successPulse 2s ease infinite 0.5s" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "checkDraw 0.6s ease 0.3s both" }}>
            <polyline points="20 6 9 17 4 12" strokeDasharray="30" strokeDashoffset="30" style={{ animation: "checkDraw 0.4s ease 0.5s forwards" }} />
          </svg>
        </div>
        <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "clamp(2rem, 4vw, 2.5rem)", color: "#1b3c33", letterSpacing: "0.05em", marginBottom: "1rem", animation: "fadeSlideUp 0.5s ease 0.3s both" }}>{title}</h1>
        <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "1rem", lineHeight: 1.7, marginBottom: "1.5rem", animation: "fadeSlideUp 0.5s ease 0.4s both" }}>
          {description}
        </p>
        {children && <div style={{ marginBottom: "1.5rem", animation: "fadeSlideUp 0.5s ease 0.45s both" }}>{children}</div>}
        {actions && actions.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", animation: "fadeSlideUp 0.5s ease 0.5s both" }}>
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                style={{
                  padding: "0.85rem 2rem",
                  borderRadius: "100px",
                  border: action.primary ? "none" : "1.5px solid #ddd",
                  background: action.primary ? "#1b3c33" : "#fff",
                  color: action.primary ? "#fff" : "#586159",
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (action.primary) e.currentTarget.style.background = "#153229";
                  else e.currentTarget.style.borderColor = "#1b3c33";
                }}
                onMouseLeave={(e) => {
                  if (action.primary) e.currentTarget.style.background = "#1b3c33";
                  else e.currentTarget.style.borderColor = "#ddd";
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
