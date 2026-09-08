"use client";

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btn: React.CSSProperties = {
    minWidth: 36, height: 36, borderRadius: 8, border: "1px solid #e0ddd8",
    background: "#fff", color: "#555", fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit", display: "flex",
    alignItems: "center", justifyContent: "center", padding: "0 6px",
  };
  const btnActive: React.CSSProperties = { ...btn, background: "#1b3c33", color: "#fff", borderColor: "#1b3c33", fontWeight: 600 };
  const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.4, cursor: "default" };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
      <button style={page <= 1 ? btnDisabled : btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} style={{ color: "#999", fontSize: 13, padding: "0 4px" }}>...</span>
        ) : (
          <button key={p} style={p === page ? btnActive : btn} onClick={() => onChange(p)}>{p}</button>
        )
      )}
      <button style={page >= totalPages ? btnDisabled : btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>
        Page {page} of {totalPages} ({total} total)
      </span>
    </div>
  );
}
