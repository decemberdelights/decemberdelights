import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "12px",
  border: "1.5px solid #e0ddd8",
  background: "#fff",
  fontSize: "0.95rem",
  fontFamily: "var(--font-outfit), sans-serif",
  color: "#1b3c33",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box" as const,
};

export const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.5rem",
  fontWeight: 700,
  fontSize: "0.8rem",
  color: "#586159",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  fontFamily: "var(--font-outfit), sans-serif",
};

export const selectBackgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23586159' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
