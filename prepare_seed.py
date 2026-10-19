
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "raw"
OUT_DIR = BASE_DIR / "processed"
OUT_DIR.mkdir(exist_ok=True)

# 1. CSV 불러오기
stay = pd.read_csv(
    RAW_DIR / "tourism_stay.csv",
    dtype={"baseYm": "string", "signguCd": "string"}
)

consumption = pd.read_csv(
    RAW_DIR / "tourism_consumption.csv",
    dtype={"baseYm": "string", "signguCd": "string"}
)

# 2. 병합 Key 설정
keys = ["baseYm", "signguCd"]

# Key 중복 검증
if stay.duplicated(keys).any():
    raise ValueError("체류 데이터 Key 중복")

if consumption.duplicated(keys).any():
    raise ValueError("소비 데이터 Key 중복")

# 3. 서울 25개 자치구 기준 병합
merged = stay[
    keys + ["tarSjrnDsIxVal"]
].merge(
    consumption[keys + ["tarExpDsIxVal"]],
    on=keys,
    how="outer",
    validate="one_to_one",
    indicator=True
)

if not (merged["_merge"] == "both").all():
    raise ValueError("체류·소비 데이터 병합 불일치")

# 4. Supabase 테이블에 맞게 변환
df = pd.DataFrame({
    "reference_date": pd.to_datetime(
        merged["baseYm"] + "01",
        format="%Y%m%d"
    ).dt.strftime("%Y-%m-%d"),
    "region_code": merged["signguCd"],
    "stay_strength": pd.to_numeric(
        merged["tarSjrnDsIxVal"], errors="raise"
    ),
    "consumption_strength": pd.to_numeric(
        merged["tarExpDsIxVal"], errors="raise"
    )
})

# 5. 데이터 품질 검증
if len(df) != 25:
    raise ValueError(f"예상 25건, 실제 {len(df)}건")

if df.isna().any().any():
    raise ValueError("결측값 발견")

if df.duplicated(
    ["reference_date", "region_code"]
).any():
    raise ValueError("중복 데이터 발견")

# 6. 결과 저장
output = OUT_DIR / "tourism_demand_seed.csv"
df.to_csv(output, index=False, encoding="utf-8-sig")

print("[PASS] Seed Data")
print("rows:", len(df))
print("missing:", df.isna().sum().sum())
print("duplicates:", df.duplicated(
    ["reference_date", "region_code"]
).sum())
print("saved:", output)
print(df.head().to_string(index=False))
