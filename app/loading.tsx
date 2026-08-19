export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#074134" }}>
      <style>{`
        @keyframes dd-load-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes dd-load-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#c8a97a",
                animation: `dd-load-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <div style={{ width: "120px", height: "2px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden", margin: "0 auto" }}>
          <div style={{ height: "100%", background: "#c8a97a", borderRadius: "2px", animation: "dd-load-bar 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}
