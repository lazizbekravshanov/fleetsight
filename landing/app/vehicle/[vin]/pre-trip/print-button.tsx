"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#1e3a5f",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.03em",
      }}
    >
      PRINT / SAVE AS PDF
    </button>
  );
}
