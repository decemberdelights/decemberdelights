"use client";

export function SkeletonBox({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(90deg, #f0ede8 25%, #e4e1d6 50%, #f0ede8 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        borderRadius: "8px",
        ...style,
      }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(27,60,51,0.06)" }}>
      <SkeletonBox style={{ height: "220px", borderRadius: 0 }} />
      <div style={{ padding: "1.25rem" }}>
        <SkeletonBox style={{ height: "12px", width: "40%", marginBottom: "8px" }} />
        <SkeletonBox style={{ height: "18px", width: "70%", marginBottom: "8px" }} />
        <SkeletonBox style={{ height: "12px", width: "90%", marginBottom: "12px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SkeletonBox style={{ height: "20px", width: "25%" }} />
          <SkeletonBox style={{ height: "12px", width: "20%" }} />
        </div>
        <SkeletonBox style={{ height: "40px", width: "100%", marginTop: "12px", borderRadius: "10px" }} />
      </div>
    </div>
  );
}

export function MenuCardSkeleton() {
  return (
    <div style={{ border: "1px solid #e4e1d6", borderRadius: "24px", overflow: "hidden", background: "#fff" }}>
      <SkeletonBox style={{ height: "200px", borderRadius: "24px 24px 0 0" }} />
      <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <SkeletonBox style={{ height: "18px", width: "50%" }} />
          <SkeletonBox style={{ height: "28px", width: "20%", borderRadius: "20px" }} />
        </div>
        <SkeletonBox style={{ height: "14px", width: "80%" }} />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div style={{ background: "#fdf9f4", borderRadius: "20px", padding: "2rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <SkeletonBox style={{ height: "22px", width: "30%" }} />
        <SkeletonBox style={{ height: "22px", width: "15%", borderRadius: "100px" }} />
      </div>
      <SkeletonBox style={{ height: "14px", width: "40%", marginBottom: "4px" }} />
      <SkeletonBox style={{ height: "14px", width: "35%", marginBottom: "4px" }} />
      <SkeletonBox style={{ height: "14px", width: "25%", marginBottom: "12px" }} />
      <SkeletonBox style={{ height: "14px", width: "90%", marginBottom: "4px" }} />
      <SkeletonBox style={{ height: "14px", width: "70%" }} />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 4px 24px rgba(27,60,51,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <SkeletonBox style={{ height: "10px", width: "60px", marginBottom: "6px" }} />
          <SkeletonBox style={{ height: "24px", width: "80px" }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <SkeletonBox style={{ height: "22px", width: "80px", marginBottom: "4px" }} />
          <SkeletonBox style={{ height: "12px", width: "60px" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBox key={i} style={{ height: "28px", width: "28px", borderRadius: "50%" }} />
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "18px 20px", borderLeft: "4px solid #e4e1d6" }}>
      <SkeletonBox style={{ height: "12px", width: "50%", marginBottom: "8px" }} />
      <SkeletonBox style={{ height: "28px", width: "30%" }} />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} style={{ height: "40px", borderRadius: "7px" }} />
      ))}
    </div>
  );
}
