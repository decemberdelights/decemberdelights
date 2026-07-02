"use client";

import { Stats, OrderStats } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface ChartsTabProps {
  stats: Stats;
  orderStats: OrderStats | null;
}

const COLORS = ["#3b6d11", "#854f0b", "#a32d2d"];

export default function ChartsTab({ stats, orderStats }: ChartsTabProps) {
  const dailyData = orderStats?.daily
    ? Object.entries(orderStats.daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, val]) => ({ date: date.slice(5), orders: val.orders, revenue: val.revenue }))
    : [];

  const monthlyData = orderStats?.monthly
    ? Object.entries(orderStats.monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, val]) => ({ month, orders: val.orders, revenue: val.revenue }))
    : [];

  const franchisePieData = [
    { name: "Approved", value: stats.approved_franchise || 0 },
    { name: "Pending", value: (stats.pending_franchise || 0) + (stats.submitted_franchise || 0) + (stats.under_process_franchise || 0) },
    { name: "Rejected", value: stats.rejected_franchise || 0 },
  ].filter(d => d.value > 0);

  const careersPieData = [
    { name: "Approved", value: stats.approved_careers || 0 },
    { name: "Pending", value: stats.pending_careers || 0 },
    { name: "Rejected", value: stats.rejected_careers || 0 },
  ].filter(d => d.value > 0);

  return (
    <>
      <style>{`
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .charts-grid .panel { min-height: 380px; }
        .charts-grid .panel h3 { margin-bottom: 16px; font-size: 16px; }
        .pie-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .pie-row .panel { text-align: center; }
        .pie-legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
        .pie-legend span { font-size: 12px; display: flex; align-items: center; gap: 6px; }
        .pie-legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .charts-full { margin-bottom: 24px; }
        .charts-full .panel { min-height: 340px; }
        @media(max-width:900px) { .charts-grid, .pie-row { grid-template-columns: 1fr; } }
      `}</style>

      <div className="topbar">
        <h2>ANALYTICS &amp; CHARTS</h2>
        <div className="role-pill">Charts</div>
      </div>

      <div className="charts-grid">
        <div className="panel">
          <h3>Daily Orders (Last 14 Days)</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#173a30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No daily order data available</div>
          )}
        </div>

        <div className="panel">
          <h3>Monthly Orders</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#185fa5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No monthly order data available</div>
          )}
        </div>
      </div>

      <div className="charts-full">
        <div className="panel">
          <h3>Monthly Revenue</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#534ab7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No revenue data available</div>
          )}
        </div>
      </div>

      <div className="pie-row">
        <div className="panel">
          <h3>Franchise Applications</h3>
          {franchisePieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={franchisePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {franchisePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {franchisePieData.map((d, i) => (
                  <span key={d.name}><span className="dot" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">No franchise data</div>
          )}
        </div>

        <div className="panel">
          <h3>Career Applications</h3>
          {careersPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={careersPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {careersPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {careersPieData.map((d, i) => (
                  <span key={d.name}><span className="dot" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">No career data</div>
          )}
        </div>
      </div>
    </>
  );
}
