"use client";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  search?: { placeholder: string; value: string; onChange: (v: string) => void };
  selects?: { label: string; value: string; onChange: (v: string) => void; options: FilterOption[] }[];
  counts?: { label: string; total: number; filtered: number }[];
}

export default function FilterBar({ search, selects, counts }: FilterBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "0 0 16px", borderBottom: "1px solid #e4e1d6", marginBottom: 16 }}>
      {search && (
        <input
          type="text"
          placeholder={search.placeholder}
          value={search.value}
          onChange={e => search.onChange(e.target.value)}
          style={{ flex: "1 1 200px", padding: "8px 12px", border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: "#1b2b25", background: "#fff", outline: "none" }}
        />
      )}
      {selects?.map((s, i) => (
        <select
          key={i}
          value={s.value}
          onChange={e => s.onChange(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #e4e1d6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: "#1b2b25", background: "#fff", cursor: "pointer", outline: "none" }}
        >
          <option value="">{s.label}</option>
          {s.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {counts?.map((c, i) => (
        <div key={i} style={{ fontSize: 12, color: "#6b6f6a", background: "#f4f1ea", padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>
          {c.label}: <strong style={{ color: "#1b2b25" }}>{c.filtered}</strong>/{c.total}
        </div>
      ))}
    </div>
  );
}
