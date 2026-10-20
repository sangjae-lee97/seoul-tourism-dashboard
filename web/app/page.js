
import { Suspense } from "react";
import { supabase } from "../lib/supabase";
import DistrictExplorer from "../components/DistrictExplorer";

async function DashboardContent() {
  // 지역, 관광 데이터, AI 분석 날짜, 관광 장소 조회
  const [
    regionsResult,
    demandsResult,
    latestAnalysisResult,
    placesResult,
  ] = await Promise.all([
    supabase
      .from("regions")
      .select("region_code, region_name")
      .order("region_code"),

    supabase
      .from("tourism_demand")
      .select(
        "reference_date,region_code,stay_strength,consumption_strength"
      )
      .order("reference_date", { ascending: false })
      .limit(1000),

    supabase
      .from("ai_region_analysis")
      .select("analysis_date")
      .order("analysis_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("local_places")
      .select(
        "place_key,name,category,address,road_address,latitude,longitude,region_code"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(500),
  ]);

  const latestAnalysisDate =
    latestAnalysisResult.data?.analysis_date ?? null;

  const analysesResult = latestAnalysisDate
    ? await supabase
        .from("ai_region_analysis")
        .select("region_code,summary,limitations")
        .eq("analysis_date", latestAnalysisDate)
    : { data: [], error: null };

  const errors = [
    regionsResult.error,
    demandsResult.error,
    latestAnalysisResult.error,
    placesResult.error,
    analysesResult.error,
  ].filter(Boolean);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        background: "#f5f7fb",
        color: "#172033",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 30 }}>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            SEOUL TOURISM DASHBOARD
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>
            서울 관광 데이터 대시보드
          </h1>
          <p style={{ color: "#64748b", marginTop: 10 }}>
            서울 25개 자치구의 관광 지표, 장소 및 AI 분석
          </p>
        </header>

        {errors.length > 0 && (
          <div
            style={{
              background: "#fff",
              color: "#dc2626",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            데이터 조회 오류:{" "}
            {errors.map((e) => e.message).join(" / ")}
          </div>
        )}

        <DistrictExplorer
          regions={regionsResult.data ?? []}
          demandRows={demandsResult.data ?? []}
          analyses={analysesResult.data ?? []}
          places={placesResult.data ?? []}
          latestAnalysisDate={latestAnalysisDate}
        />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <p style={{ padding: 40 }}>
          대시보드 불러오는 중...
        </p>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
