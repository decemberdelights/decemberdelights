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

export function AdminStatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid" style={{ marginBottom: 18 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", borderLeft: "4px solid #e4e1d6", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <SkeletonBox style={{ height: 12, width: "50%", marginBottom: 8 }} />
          <SkeletonBox style={{ height: 28, width: "30%" }} />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <SkeletonBox style={{ height: 18, width: "20%" }} />
        <SkeletonBox style={{ height: 32, width: 100, borderRadius: 6 }} />
      </div>
      <div className="table-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e4e1d6" }}>
                <SkeletonBox style={{ height: 10, width: "70%" }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} style={{ padding: "12px 6px", borderBottom: "1px solid #e4e1d6" }}>
                  <SkeletonBox style={{ height: 14, width: `${50 + Math.random() * 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 200, marginBottom: 4 }} />
      </div>
      <div className="card-grid" style={{ marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "28px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <SkeletonBox style={{ height: 15, width: "60%", marginBottom: 10 }} />
            <SkeletonBox style={{ height: 36, width: "30%" }} />
          </div>
        ))}
      </div>
      <div className="two-col">
        {[1, 2].map(i => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <SkeletonBox style={{ height: 18, width: "40%", marginBottom: 14 }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "16px 18px", borderRadius: 10, background: "#f9f8f4", border: "1px solid #e4e1d6", marginBottom: 12 }}>
                <SkeletonBox style={{ height: 15, width: "30%" }} />
                <SkeletonBox style={{ height: 26, width: 50 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 120 }} />
      </div>
      <AdminStatCardsSkeleton count={6} />
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <SkeletonBox style={{ height: 18, width: 140 }} />
          <SkeletonBox style={{ height: 14, width: 100 }} />
        </div>
        <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ID", "Customer", "Items", "Total", "Status", "Payment", "Date", "Actions"].map((h, i) => (
                <th key={i} style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e4e1d6" }}>
                  <SkeletonBox style={{ height: 10, width: "70%" }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 8 }).map((_, c) => (
                  <td key={c} style={{ padding: "12px 6px", borderBottom: "1px solid #e4e1d6" }}>
                    {c === 2 ? (
                      <SkeletonBox style={{ height: 26, width: 80, borderRadius: 6 }} />
                    ) : (
                      <SkeletonBox style={{ height: 14, width: `${40 + Math.random() * 30}%` }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export function ApplicationsSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 180 }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <SkeletonBox style={{ height: 18, width: "15%" }} />
          <SkeletonBox style={{ height: 32, width: 120, borderRadius: 6 }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 10, background: "#f9f8f4", border: "1px solid #e4e1d6", marginBottom: 10 }}>
            <SkeletonBox style={{ height: 40, width: 40, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox style={{ height: 14, width: "40%", marginBottom: 6 }} />
              <SkeletonBox style={{ height: 12, width: "60%" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <SkeletonBox style={{ height: 28, width: 28, borderRadius: "50%" }} />
              <SkeletonBox style={{ height: 28, width: 28, borderRadius: "50%" }} />
              <SkeletonBox style={{ height: 28, width: 28, borderRadius: "50%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminsSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 140 }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <SkeletonBox style={{ height: 18, width: "20%", marginBottom: 14 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e4e1d6", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SkeletonBox style={{ height: 36, width: 36, borderRadius: "50%" }} />
              <div>
                <SkeletonBox style={{ height: 14, width: 100, marginBottom: 4 }} />
                <SkeletonBox style={{ height: 11, width: 70 }} />
              </div>
            </div>
            <SkeletonBox style={{ height: 28, width: 70, borderRadius: 6 }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <SkeletonBox style={{ height: 38, width: 140, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function LogsSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 140 }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Admin", "Action", "Target", "Details", "Time"].map((_, i) => (
                <th key={i} style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e4e1d6" }}>
                  <SkeletonBox style={{ height: 10, width: "70%" }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 5 }).map((_, c) => (
                  <td key={c} style={{ padding: "12px 6px", borderBottom: "1px solid #e4e1d6" }}>
                    <SkeletonBox style={{ height: 14, width: `${50 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <SkeletonBox style={{ height: 22, width: 160 }} />
      </div>
      <AdminStatCardsSkeleton count={3} />
      <div className="charts-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <SkeletonBox style={{ height: 18, width: "50%", marginBottom: 14 }} />
            <SkeletonBox style={{ height: 260, width: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
