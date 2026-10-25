"use client";

import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  max?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CustomDropdown({ value, options, onChange, style }: { value: number; options: { label: string; value: number }[]; onChange: (v: number) => void; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ ...style, position: "relative" }}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1.5px solid rgba(7,65,52,0.15)",
          background: "#fdf9f4",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "#1b3c33",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          userSelect: "none" as const,
          textAlign: "left",
        }}
      >
        <span>{selected?.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#074134" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div aria-label="Choose a date value" onWheel={(e) => e.stopPropagation()} style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 10,
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 8px 28px rgba(7,65,52,0.18)",
          border: "1px solid rgba(7,65,52,0.08)",
          maxHeight: "180px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch" as const,
          padding: "4px",
        }}>
          {options.map(o => (
            <button
              type="button"
              aria-pressed={o.value === value}
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                fontFamily: "var(--font-outfit), sans-serif",
                fontSize: "0.8rem",
                fontWeight: o.value === value ? 700 : 500,
                color: o.value === value ? "#fdf9f4" : "#1b3c33",
                background: o.value === value ? "linear-gradient(135deg, #074134, #1b3c33)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
                width: "100%",
                border: 0,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = "rgba(234,185,106,0.12)"; }}
              onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DatePicker({ value, onChange, max }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? new Date(value + "T00:00:00").getFullYear() : new Date().getFullYear() - 25);
  const [viewMonth, setViewMonth] = useState(() => value ? new Date(value + "T00:00:00").getMonth() : 0);
  const ref = useRef<HTMLDivElement>(null);

  const maxDate = max ? new Date(max + "T00:00:00") : null;
  const currentYear = new Date().getFullYear();
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const displayText = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function selectDay(day: number) {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (maxDate && new Date(d + "T00:00:00") > maxDate) return;
    onChange(d);
    setOpen(false);
  }

  const monthOptions = MONTHS.map((m, i) => ({ label: m, value: i }));
  const yearOptions = [];
  for (let y = currentYear - 18; y >= 1940; y--) yearOptions.push({ label: String(y), value: y });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={displayText ? `Selected date: ${displayText}` : "Select date"}
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "0.7rem 1rem",
          borderRadius: "12px",
          border: "1.5px solid #e0ddd8",
          background: "#fdf9f4",
          color: displayText ? "#1b3c33" : "#aaa",
          fontSize: "0.85rem",
          fontFamily: "var(--font-outfit), sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box" as const,
          userSelect: "none" as const,
          textAlign: "left",
        }}
      >
        <span suppressHydrationWarning>{displayText || "Select date"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
      </button>

      {open && (
        <>
          <div role="dialog" aria-modal="true" aria-label="Choose a date" style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1200,
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 12px 48px rgba(7,65,52,0.25)",
            border: "1px solid rgba(7,65,52,0.1)",
            padding: "1.25rem",
            width: "min(320px, 90vw)",
            maxHeight: "90dvh",
            overflowY: "auto",
          }}>
            {/* Custom Month/Year dropdowns */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <CustomDropdown
                value={viewMonth}
                options={monthOptions}
                onChange={(v) => setViewMonth(v)}
                style={{ flex: 1.2 }}
              />
              <CustomDropdown
                value={viewYear}
                options={yearOptions}
                onChange={(v) => setViewYear(v)}
                style={{ flex: 1 }}
              />
            </div>

            {/* Day labels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "6px" }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} style={{ textAlign: "center", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "#074134", padding: "6px 0", letterSpacing: "0.05em" }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = value === dateStr;
                const isToday = new Date().toDateString() === new Date(viewYear, viewMonth, day).toDateString();
                const isDisabled = maxDate ? new Date(viewYear, viewMonth, day) > maxDate : false;

                return (
                  <button
                    key={day}
                    onClick={() => !isDisabled && selectDay(day)}
                    disabled={isDisabled}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      border: isToday && !isSelected ? "2px solid #eab96a" : "2px solid transparent",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? "linear-gradient(135deg, #074134, #1b3c33)" : "transparent",
                      color: isDisabled ? "#ccc" : isSelected ? "#fdf9f4" : "#1b3c33",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled) e.currentTarget.style.background = "rgba(234,185,106,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isDisabled) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close date picker"
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1199, background: "rgba(0,0,0,0.3)", border: 0, padding: 0 }}
          />
        </>
      )}
    </div>
  );
}
