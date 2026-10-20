
import json
import time
import getpass
from pathlib import Path
from urllib.parse import urlencode, unquote
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

BASE_URL = (
    "https://apis.data.go.kr"
    "/B551011/AreaTarDemDsService"
)

OUTPUT = Path("raw/backfill_tourism_202509_202608.sql")

# 2025-09 ~ 2026-08
MONTHS = [
    f"{2025 + (8 + i) // 12}"
    f"{(8 + i) % 12 + 1:02d}"
    for i in range(12)
]

SERVICE_KEY = unquote(
    getpass.getpass(
        "공공데이터포털 서비스키 입력 (화면에 표시되지 않음): "
    ).strip()
)

if not SERVICE_KEY:
    raise SystemExit("서비스키가 입력되지 않았습니다.")


def fetch_data(month, kind):
    if kind == "stay":
        endpoint = "areaTarSjrnDsList"
        index_key = "tarSjrnDsIxCd"
        index_code = "21"
        value_key = "tarSjrnDsIxVal"
    else:
        endpoint = "areaTarExpDsList"
        index_key = "tarExpDsIxCd"
        index_code = "22"
        value_key = "tarExpDsIxVal"

    
    params = {
        "serviceKey": SERVICE_KEY,
        "pageNo": 1,
        "numOfRows": 100,
        "_type": "json",
        "MobileOS": "ETC",
        "MobileApp": "SeoulTourismDashboard",
        "baseYm": month,
        "areaCd": "11",
        index_key: index_code,
    }


    url = f"{BASE_URL}/{endpoint}?{urlencode(params)}"
    request = Request(
        url,
        headers={"Accept": "application/json"}
    )

    try:
        with urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(
            f"{month} {kind}: HTTP {error.code}"
        ) from None
    except (URLError, ValueError) as error:
        raise RuntimeError(
            f"{month} {kind}: API 응답 오류 ({type(error).__name__})"
        ) from None

    
    result = data.get("response", data)
    header = result.get("header", {})
    body = result.get("body", {})

    if str(header.get("resultCode")) != "0000":
        # 인증키를 출력하지 않고 API 오류 정보만 확인
        error_info = {
            "top_level_keys": list(data.keys()),
            "header": header,
            "resultCode": data.get("resultCode"),
            "resultMsg": data.get("resultMsg"),
            "errorCode": data.get("errorCode"),
            "errorMessage": data.get("errorMessage"),
            "gateway_error": data.get(
                "OpenAPI_ServiceResponse", {}
            ).get("cmmMsgHeader", {}),
        }

        raise RuntimeError(
            f"{month} {kind}: "
            f"{json.dumps(error_info, ensure_ascii=False)}"
        )


    items = body.get("items", {}).get("item", [])

    if not isinstance(items, list) or len(items) != 26:
        raise RuntimeError(
            f"{month} {kind}: 기대 26건, 실제 {len(items)}건"
        )

    codes = [str(item.get("signguCd")) for item in items]

    if len(set(codes)) != 26 or "0" not in codes:
        raise RuntimeError(
            f"{month} {kind}: 자치구 코드 중복 또는 누락"
        )

    for item in items:
        if (
            str(item.get("baseYm")) != month
            or str(item.get(index_key)) != index_code
            or str(item.get("areaCd")) != "11"
            or item.get(value_key) in (None, "")
        ):
            raise RuntimeError(
                f"{month} {kind}: 기준월·지표·지역 검증 실패"
            )

    return data, set(codes)


def sql_string(value):
    text = json.dumps(value, ensure_ascii=False)
    return "'" + text.replace("'", "''") + "'"


sql_lines = [
    "BEGIN;",
    "DO $backfill$",
    "DECLARE",
    "  v_id bigint;",
    "  v_count integer;",
    "BEGIN",
]

print("\n관광 데이터 수집 시작\n")

for month in MONTHS:
    stay, stay_codes = fetch_data(month, "stay")
    spend, spend_codes = fetch_data(month, "spend")

    if stay_codes != spend_codes:
        raise RuntimeError(
            f"{month}: 체류·소비 지역코드 불일치"
        )

    sql_lines.extend([
        f"  -- {month}",
        "  INSERT INTO public.raw_api_data (",
        "    source,",
        "    tourism_demand_raw,",
        "    tourism_consumption_raw",
        "  ) VALUES (",
        "    'HISTORICAL_BACKFILL',",
        f"    {sql_string(stay)},",
        f"    {sql_string(spend)}",
        "  ) RETURNING id INTO v_id;",
        "",
        "  v_count := public.process_tourism_demand_raw(v_id);",
        "",
        "  IF v_count IS DISTINCT FROM 25 THEN",
        "    RAISE EXCEPTION",
        f"      'Backfill {month}: expected 25 rows, got %',",
        "      v_count;",
        "  END IF;",
        "",
        "  UPDATE public.raw_api_data",
        "  SET process_status = 'PROCESSED',",
        "      processed_at = now(),",
        "      error_message = NULL",
        "  WHERE id = v_id;",
        "",
    ])

    print(f"{month}: 체류 26건 / 소비 26건 확인")
    time.sleep(0.2)

sql_lines.extend([
    "END;",
    "$backfill$;",
    "COMMIT;",
])

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(
    "\n".join(sql_lines),
    encoding="utf-8"
)

print("\n수집 완료!")
print(f"생성된 SQL 파일: {OUTPUT.resolve()}")
print("예상 관광 데이터: 12개월 × 25개 구 = 300건")
