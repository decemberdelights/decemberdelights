"use client";

import { useMemo } from "react";
import { Stats, OrderStats } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface ChartsTabProps {
  stats: Stats;
  orderStats: OrderStats | null;
}

const COLORS = ["#3b6d11", "#854f0b", "#a32d2d", "#185fa5"];

export default function ChartsTab({ stats, orderStats }: ChartsTabProps) {
  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const dailyData = useMemo(() => orderStats?.daily
    ? DAY_ORDER
        .map(day => orderStats.daily[day] ? { day, orders: orderStats.daily[day].orders, revenue: orderStats.daily[day].revenue } : null)
        .filter(Boolean) as { day: string; orders: number; revenue: number }[]
    : [], [orderStats?.daily]);

  const monthlyData = useMemo(() => orderStats?.monthly
    ? Object.entries(orderStats.monthly)
        .sort(([a], [b]) => {
          const parse = (s: string) => { const [m, y] = s.split(" "); return new Date(`${m} 1 ${y}`).getTime(); };
          return parse(a) - parse(b);
        })
        .map(([month, val]) => ({ month, orders: val.orders, revenue: val.revenue }))
    : [], [orderStats?.monthly]);

  const franchisePieData = useMemo(() => [
    { name: "Approved", value: stats.approved_franchise || 0 },
    { name: "Under Process", value: stats.under_process_franchise || 0 },
    { name: "Pending", value: (stats.pending_franchise || 0) + (stats.submitted_franchise || 0) },
    { name: "Rejected", value: stats.rejected_franchise || 0 },
  ].filter(d => d.value > 0), [stats]);

  const careersPieData = useMemo(() => [
    { name: "Approved", value: stats.approved_careers || 0 },
    { name: "Pending", value: stats.pending_careers || 0 },
    { name: "Rejected", value: stats.rejected_careers || 0 },
  ].filter(d => d.value > 0), [stats]);

  const orderStatusPie = useMemo(() => [
    { name: "Delivered", value: stats.delivered_orders || 0 },
    { name: "Pending", value: stats.pending_orders || 0 },
    { name: "Preparing", value: stats.preparing_orders || 0 },
    { name: "Cancelled", value: stats.cancelled_orders || 0 },
  ].filter(d => d.value > 0), [stats]);

  return (
    <>
      <div className="topbar">
        <h2>ANALYTICS &amp; CHARTS</h2>
        <div className="role-pill">Charts</div>
      </div>

      <div className="charts-grid">
        <div className="panel">
          <h3>Daily Orders (This Week)</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [Number(v), "Orders"]} />
                <Legend />
                <Bar dataKey="orders" name="Orders" fill="#173a30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="charts-empty">No daily order data available</div>
          )}
        </div>

        <div className="panel">
          <h3>Daily Revenue (This Week)</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#534ab7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="charts-empty">No daily revenue data available</div>
          )}
        </div>
      </div>

      <div className="charts-full">
        <div className="panel">
          <h3>Monthly Orders &amp; Revenue</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => name === "revenue" ? [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"] : [Number(v), "Orders"]} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#173a30" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue (₹)" fill="#534ab7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="charts-empty">No monthly data available</div>
          )}
        </div>
      </div>

      <div className="pie-row">
        <div className="panel">
          <h3>Order Status</h3>
          {orderStatusPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={orderStatusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {orderStatusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {orderStatusPie.map((d, i) => (
                  <span key={d.name}><span className="dot" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="charts-empty">No order data</div>
          )}
        </div>

        <div className="panel">
          <h3>Franchise Applications</h3>
          {franchisePieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={franchisePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
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
            <div className="charts-empty">No franchise data</div>
          )}
        </div>

        <div className="panel">
          <h3>Career Applications</h3>
          {careersPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={careersPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
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
            <div className="charts-empty">No career data</div>
          )}
        </div>
      </div>
    </>
  );
}
