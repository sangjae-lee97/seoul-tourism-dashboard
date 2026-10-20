
"use client";

import { useMemo, useState } from "react";
import TourismMap from "./TourismMap";
import TourismTrendChart from "./TourismTrendChart";

export default function DistrictExplorer({
  regions = [],
  demandRows = [],
  analyses = [],
  places = [],
  latestAnalysisDate = null,
}) {
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // DB에 실제 저장된 기준월 목록
  const periods = useMemo(() => {
    return [...new Set(
      demandRows.map((d) => d.reference_date).filter(Boolean)
    )].sort((a, b) => b.localeCompare(a));
  }, [demandRows]);

  const latestPeriod = periods[0] ?? "";
  const activePeriod =
    selectedPeriod && periods.includes(selectedPeriod)
      ? selectedPeriod
      : latestPeriod;

  const selectedRegion = regions.find(
    (r) => String(r.region_code) === selectedCode
  );

  // 선택한 기준월의 지표
  const periodDemands = useMemo(
    () => demandRows.filter(
      (d) => d.reference_date === activePeriod
    ),
    [demandRows, activePeriod]
  );

  const demandMap = useMemo(
    () => Object.fromEntries(
      periodDemands.map((d) => [String(d.region_code), d])
    ),
    [periodDemands]
  );

  const analysisMap = useMemo(
    () => Object.fromEntries(
      analyses.map((a) => [String(a.region_code), a])
    ),
    [analyses]
  );

  // 과거 월에 최신 AI 분석을 잘못 연결하지 않기
  const showLatestAI = activePeriod === latestPeriod;

  const visibleRegions = selectedCode
    ? regions.filter(
        (r) => String(r.region_code) === selectedCode
      )
    : regions;

  // 선택한 자치구의 실제 장소만 표시
  const visiblePlaces = useMemo(
    () => selectedCode
      ? places.filter(
          (p) => String(p.region_code) === selectedCode
        )
      : places,
    [places, selectedCode]
  );

  // 대표 장소는 순위가 아닌 이름순 최대 5곳
  const representativePlaces = useMemo(
    () => [...visiblePlaces]
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "ko")
      )
      .slice(0, 5),
    [visiblePlaces]
  );

  const regionName = selectedRegion?.region_name ?? "서울 전체";

  const cardStyle = {
    background: "white",
    padding: 22,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
  };

  const labelStyle = {
    display: "block",
    color: "#64748b",
    fontSize: 13,
    marginBottom: 8,
  };

  const selectStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "white",
    color: "#172033",
    fontSize: 15,
  };

  const currentDemandCount = selectedCode
    ? Number(Boolean(demandMap[selectedCode]))
    : periodDemands.length;

  const currentAnalysisCount = showLatestAI
    ? selectedCode
      ? Number(Boolean(analysisMap[selectedCode]))
      : analyses.length
    : 0;

  return (
    <>
      {/* 지역 및 기간 선택 */}
      <section
        style={{
          ...cardStyle,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: 18,
          marginBottom: 30,
        }}
      >
        <div>
          <label htmlFor="district-select" style={labelStyle}>
            지역 선택
          </label>
          <select
            id="district-select"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            style={selectStyle}
          >
            <option value="">서울 전체 자치구</option>
            {regions.map((r) => (
              <option
                key={r.region_code}
                value={String(r.region_code)}
              >
                {r.region_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="period-select" style={labelStyle}>
            기간 선택 (관광 데이터 기준월)
          </label>
          <select
            id="period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={selectStyle}
          >
            <option value="">
              최신 기준월
              {latestPeriod
                ? ` (${latestPeriod.slice(0, 7)})`
                : ""}
            </option>
            {periods.map((period) => (
              <option key={period} value={period}>
                {period.slice(0, 7)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 선택 조건에 따른 요약 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(185px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {[
          ["선택 지역", selectedRegion?.region_name ?? "서울 25개 구"],
          ["관광 데이터 기준월", activePeriod?.slice(0, 7) || "-"],
          ["관광 지표 보유", `${currentDemandCount}개 구`],
          ["AI 분석 보유", `${currentAnalysisCount}개 구`],
        ].map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <p style={labelStyle}>{label}</p>
            <strong style={{ fontSize: 23 }}>{value}</strong>
          </div>
        ))}
      </section>

      {/* 지도 및 관광 장소 주소 목록 */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 18,
        }}
      >
        {regionName} 관광 장소
      </h2>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
          gap: 16,
          marginBottom: 36,
        }}
      >
        <div style={{ ...cardStyle, flex: "2 1 440px", minWidth: 0 }}>
          <h3 style={{ fontSize: 17, marginBottom: 14 }}>
            관광 장소 지도
          </h3>
          <TourismMap
            places={visiblePlaces}
            selectedCode={selectedCode}
            numberedPlaces={representativePlaces}
            />
        </div>

        <aside
          style={{
            ...cardStyle,
            flex: "1 1 270px",
            minWidth: 0,
          }}
        >
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>
            대표 장소
          </h3>

          <p
            style={{
              color: "#64748b",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {selectedCode
              ? `${regionName} 관광 장소 최대 5곳`
              : "서울 전체 장소 중 5곳 미리보기"}
          </p>

          {representativePlaces.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>
              등록된 관광 장소가 없습니다.
            </p>
          ) : (
            <div>
              {representativePlaces.map((place, index) => (
                <article
                  key={place.place_key}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "15px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      background: "#eff6ff",
                      color: "#2563eb",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {place.name}
                    </h4>

                    {place.category && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 6,
                        }}
                      >
                        {place.category}
                      </p>
                    )}

                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#475569",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {place.road_address ||
                        place.address ||
                        "주소 정보 없음"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 14,
            }}
          >
            표시 번호는 관광지 순위가 아닙니다.
            장소 정보는 최신 수집 데이터 기준입니다.
          </p>
        </aside>
      </section>
    
      {/* 월별 관광 지표 추이 */}
      <TourismTrendChart
        demandRows={demandRows}
        selectedCode={selectedCode}
        regionName={regionName}
        activePeriod={activePeriod}
      />

      {/* 관광 지표와 AI 분석 */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 18,
        }}
      >
        {regionName} 관광 현황
      </h2>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          gap: 16,
        }}
      >
        {visibleRegions.map((region) => {
          const code = String(region.region_code);
          const demand = demandMap[code];
          const analysis = showLatestAI
            ? analysisMap[code]
            : null;

          return (
            <article key={code} style={cardStyle}>
              <h3 style={{ fontSize: 19, fontWeight: 700 }}>
                {region.region_name}
              </h3>

              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 18,
                }}
              >
                {code}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <p style={labelStyle}>관광체류강도</p>
                  <strong style={{ fontSize: 24 }}>
                    {demand?.stay_strength ?? "-"}
                  </strong>
                </div>

                <div>
                  <p style={labelStyle}>관광소비강도</p>
                  <strong style={{ fontSize: 24 }}>
                    {demand?.consumption_strength ?? "-"}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 8,
                  }}
                >
                  AI 관광 분석
                </p>

                <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {!showLatestAI
                    ? "이전 기준월에 연결된 AI 분석 기록이 없습니다."
                    : analysis?.summary ?? "분석 데이터 없음"}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <footer
        style={{
          marginTop: 28,
          fontSize: 12,
          color: "#64748b",
          lineHeight: 1.8,
          paddingBottom: 24,
        }}
      >
        <p>
          관광체류강도와 관광소비강도는 실제 방문객 수나
          소비 금액이 아닌 관광 지표입니다.
        </p>
        <p>관광 데이터 기준월: {activePeriod || "-"}</p>
        <p>최신 AI 분석 생성일: {latestAnalysisDate || "-"}</p>
        <p>
          AI 분석 기록에는 관광 데이터 기준월이 별도 저장되어
          있지 않아, 과거 기준월에서는 분석을 표시하지 않습니다.
        </p>
      </footer>
    </>
  );
}
