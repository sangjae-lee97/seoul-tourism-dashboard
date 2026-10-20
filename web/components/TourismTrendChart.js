
"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export default function TourismTrendChart({
  demandRows = [],
  selectedCode = "",
  regionName = "",
  activePeriod = "",
}) {
  // 선택한 자치구의 전체 기간 데이터
  const chartData = useMemo(() => {
    if (!selectedCode) return [];

    return demandRows
      .filter(
        (row) =>
          String(row.region_code) === selectedCode
      )
      .map((row) => ({
        month: String(row.reference_date).slice(0, 7),
        stay:
          row.stay_strength == null
            ? null
            : Number(row.stay_strength),
        consumption:
          row.consumption_strength == null
            ? null
            : Number(row.consumption_strength),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [demandRows, selectedCode]);

  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 24,
        marginBottom: 36,
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {selectedCode
          ? `${regionName} 월별 관광 지표 추이`
          : "월별 관광 지표 추이"}
      </h2>

      <p
        style={{
          color: "#64748b",
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        관광체류강도와 관광소비강도의 월별 변화
      </p>

      {!selectedCode ? (
        <p
          style={{
            padding: 36,
            textAlign: "center",
            color: "#64748b",
            background: "#f8fafc",
            borderRadius: 12,
          }}
        >
          자치구를 선택하면 월별 추이 그래프가 표시됩니다.
        </p>
      ) : chartData.length === 0 ? (
        <p>선택한 자치구의 관광 데이터가 없습니다.</p>
      ) : (
        <>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 12,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  height={55}
                  interval={0}
                />

                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                />

                <Tooltip
                  formatter={(value, name) => [
                    Number(value).toFixed(2),
                    name,
                  ]}
                />

                <Legend verticalAlign="top" height={36} />

                <Line
                  type="monotone"
                  dataKey="stay"
                  name="관광체류강도"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />

                <Line
                  type="monotone"
                  dataKey="consumption"
                  name="관광소비강도"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />

                {activePeriod && (
                  <ReferenceLine
                    x={activePeriod.slice(0, 7)}
                    stroke="#64748b"
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 12,
            }}
          >
            점선은 현재 선택한 기준월입니다.
            그래프에는 저장된 전체 기준월이 표시됩니다.
          </p>
        </>
      )}
    </section>
  );
}
