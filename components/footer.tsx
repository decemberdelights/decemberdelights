import Image from "next/image";

export default function Footer() {
  return (
    <footer data-bg="light" style={{
      background: "#FFFFFF",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      padding: "4rem 5% 2rem",
      position: "relative",
      zIndex: 50,
    }}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Image src="/logo.png" alt="December Delights" width={300} height={140} sizes="300px" style={{ height: "140px", width: "auto", marginBottom: "12px" }} />
        </div>

        {[
          { title: "Explore", links: [{ l: "Menu", h: "/menu/" }, { l: "Story", h: "/#our-story" }, { l: "Visit Us", h: "https://www.google.com/maps/place/December+Delights/@18.0050405,79.5520925,17z/data=!3m1!4b1!4m6!3m5!1s0x3a334f0071e6bb0f:0xcb45fa2eee537062!8m2!3d18.0050405!4d79.5520925!16s%2Fg%2F11x1__1gvb?entry=ttu&g_ep=EgoyMDI2MDYxNi4wIKXMDSoASAFQAw%3D%3D" }] },
          { title: "Company", links: [{ l: "Franchise", h: "/franchise/" }, { l: "Careers", h: "/careers/" }, { l: "Contact", h: "/contact/" }] },
          { title: "Social", links: [{ l: "Instagram", h: "https://www.instagram.com/decemberdelights/" }, { l: "YouTube", h: "https://www.youtube.com/@Decemberdelights-Notjustacafe" }] },
        ].map((col) => (
          <div key={col.title}>
            <h4 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#094b3d",
              marginBottom: "1rem",
            }}>{col.title}</h4>
            {col.links.map((link) => (
              <a key={link.l} href={link.h} className="footer-link" target={link.h.startsWith("http") ? "_blank" : undefined} rel={link.h.startsWith("http") ? "noopener noreferrer" : undefined}>{link.l}</a>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}
