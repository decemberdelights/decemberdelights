import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2rem",
      fontFamily: "var(--font-outfit), sans-serif",
      background: "#fdf9f4",
    }}>
      <h1 style={{
        fontSize: "clamp(4rem, 10vw, 8rem)",
        fontWeight: 700,
        color: "#074134",
        margin: 0,
        lineHeight: 1,
      }}>
        404
      </h1>
      <p style={{
        fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
        color: "#1b3c33",
        margin: "1rem 0 2rem",
        fontWeight: 500,
      }}>
        Page not found
      </p>
      <p style={{
        fontSize: "1rem",
        color: "#666",
        maxWidth: 420,
        marginBottom: "2rem",
      }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" style={{
        display: "inline-block",
        padding: "0.85rem 2.5rem",
        background: "#074134",
        color: "#fdf9f4",
        borderRadius: 8,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "1rem",
        transition: "background 0.3s",
      }}>
        Back to Home
      </Link>
    </div>
  );
}
