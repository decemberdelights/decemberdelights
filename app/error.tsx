"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fdf9f4", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e74c3c18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.5rem", marginBottom: "0.75rem" }}>Something went wrong</h2>
        <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        <button onClick={() => reset()} style={{ padding: "0.7rem 2rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    </div>
  );
}
