"use client";

import { useState } from "react";
import { ArrowDown, Flame, TrendingDown, TrendingUp, Info } from "lucide-react";
import type { PriceHistory } from "@/lib/types";

const money = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export default function PriceHistoryChart({ history }: { history?: PriceHistory | null }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!history || !history.history || history.history.length === 0) {
    return null;
  }

  const points = history.history;
  const prices = points.map((p) => Number(p.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  // SVG viewBox settings
  const width = 640;
  const height = 180;
  const padX = 40;
  const padY = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const getX = (index: number) => padX + (index / (points.length - 1)) * chartW;
  const getY = (price: number) => height - padY - ((price - minPrice) / range) * chartH;

  const pathCoords = points.map((p, i) => `${getX(i)},${getY(Number(p.price))}`).join(" L ");
  const linePath = `M ${pathCoords}`;
  const areaPath = `M ${pathCoords} L ${getX(points.length - 1)},${height - padY} L ${getX(0)},${height - padY} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="price-history-card">
      <div className="history-header">
        <div className="history-title-wrap">
          <span className="history-badge">
            <TrendingDown size={14} /> 90-DAY PRICE HISTORY
          </span>
          <h3>Price Trend & Drops</h3>
        </div>
        <div className="history-stats-pill">
          <div className="stat-item stat-lowest">
            <span className="stat-label">Lowest Ever</span>
            <span className="stat-val">{money(history.lowest)}</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item stat-avg">
            <span className="stat-label">90-Day Avg</span>
            <span className="stat-val">{money(history.average)}</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item stat-highest">
            <span className="stat-label">Highest</span>
            <span className="stat-val">{money(history.highest)}</span>
          </div>
        </div>
      </div>

      {history.verdict && (
        <div className="deal-verdict-banner">
          <Flame size={16} className="flame-icon" />
          <span>{history.verdict}</span>
        </div>
      )}

      <div className="chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="price-svg-chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={height / 2}
            x2={width - padX}
            y2={height / 2}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const x = getX(i);
            const y = getY(Number(p.price));
            const isHover = hoverIndex === i;
            const isLowest = Number(p.price) === minPrice;

            return (
              <g
                key={i}
                className="chart-point-group"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHover ? 7 : isLowest ? 5 : 4}
                  fill={isLowest ? "#10b981" : isHover ? "#4f46e5" : "#ffffff"}
                  stroke={isLowest ? "#059669" : "#4f46e5"}
                  strokeWidth={isHover ? 3 : 2}
                />
                {/* Invisible hover target */}
                <circle cx={x} cy={y} r={14} fill="transparent" />
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        <div
          className="chart-tooltip-bar"
          style={{
            left: `${((points.indexOf(activePoint) / (points.length - 1)) * 80 + 10).toFixed(1)}%`,
          }}
        >
          <span className="tooltip-date">{activePoint.date}</span>
          <span className="tooltip-price">{money(activePoint.price)}</span>
        </div>
      </div>

      <div className="chart-dates-row">
        {points.map((p, i) => (
          <span
            key={i}
            className={`date-label ${hoverIndex === i ? "date-active" : ""}`}
            onMouseEnter={() => setHoverIndex(i)}
          >
            {p.date}
          </span>
        ))}
      </div>
    </div>
  );
}
