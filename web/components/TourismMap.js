
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function TourismMap({
  places = [],
  selectedCode = "",
  numberedPlaces = [],
}) {
  const mapContainerRef = useRef(null);
  const naverMapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);
  const listenersRef = useRef([]);

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  // NAVER 지도 최초 생성
  useEffect(() => {
    if (
      !sdkReady ||
      !mapContainerRef.current ||
      !window.naver?.maps
    ) {
      return;
    }

    const { maps } = window.naver;

    const map = new maps.Map(mapContainerRef.current, {
      center: new maps.LatLng(37.5665, 126.9780),
      zoom: 11,
    });

    naverMapRef.current = map;
    infoWindowRef.current = new maps.InfoWindow();

    return () => {
      listenersRef.current.forEach((listener) => {
        maps.Event.removeListener(listener);
      });

      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });

      infoWindowRef.current?.close();

      listenersRef.current = [];
      markersRef.current = [];
      infoWindowRef.current = null;
      naverMapRef.current = null;

      map.destroy?.();
    };
  }, [sdkReady]);

  // 지역 선택 또는 장소 변경 시 마커 업데이트
  useEffect(() => {
    if (
      !sdkReady ||
      !naverMapRef.current ||
      !window.naver?.maps
    ) {
      return;
    }

    const { maps } = window.naver;
    const map = naverMapRef.current;
    const infoWindow = infoWindowRef.current;

    // 기존 마커 제거
    listenersRef.current.forEach((listener) => {
      maps.Event.removeListener(listener);
    });

    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });

    listenersRef.current = [];
    markersRef.current = [];

    infoWindow?.close();

    // 오른쪽 대표 장소 목록의 번호와 연결
    const numberMap = new Map(
      numberedPlaces.map((place, index) => [
        String(place.place_key),
        index + 1,
      ])
    );

    // 정상 좌표만 사용
    const validPlaces = places.filter((place) => {
      if (
        place.latitude == null ||
        place.longitude == null
      ) {
        return false;
      }

      const lat = Number(place.latitude);
      const lng = Number(place.longitude);

      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });

    // 지도 중심 이동
    if (!selectedCode) {
      map.setCenter(
        new maps.LatLng(37.5665, 126.9780)
      );
      map.setZoom(11);
    } else if (validPlaces.length === 1) {
      map.setCenter(
        new maps.LatLng(
          Number(validPlaces[0].latitude),
          Number(validPlaces[0].longitude)
        )
      );
      map.setZoom(14);
    } else if (validPlaces.length > 1) {
      const bounds = new maps.LatLngBounds();

      validPlaces.forEach((place) => {
        bounds.extend(
          new maps.LatLng(
            Number(place.latitude),
            Number(place.longitude)
          )
        );
      });

      map.fitBounds(bounds);

      if (map.getZoom() > 14) {
        map.setZoom(14);
      }
    } else {
      map.setCenter(
        new maps.LatLng(37.5665, 126.9780)
      );
      map.setZoom(11);
    }

    // 장소별 마커 생성
    validPlaces.forEach((place) => {
      const lat = Number(place.latitude);
      const lng = Number(place.longitude);

      const number = numberMap.get(
        String(place.place_key)
      );

      const markerOptions = {
        position: new maps.LatLng(lat, lng),
        map,
        title: place.name,
      };

      // 대표 장소 1~5번: 번호가 있는 마커
      if (number) {
        markerOptions.icon = {
          content: `
            <div
              style="
                width: 36px;
                height: 36px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                border-radius: 50%;
                background: #2563eb;
                color: white;
                font-size: 15px;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: pointer;
              "
            >
              ${number}
            </div>
          `,
          size: new maps.Size(36, 36),
          anchor: new maps.Point(18, 18),
        };

        markerOptions.zIndex = 100;
      }

      const marker = new maps.Marker(markerOptions);

      // 마커 클릭 시 장소 정보 표시
      const listener = maps.Event.addListener(
        marker,
        "click",
        () => {
          const content = document.createElement("div");

          content.style.cssText = `
            padding: 14px;
            min-width: 180px;
            max-width: 260px;
            background: white;
            color: #172033;
          `;

          const title = document.createElement("strong");

          title.textContent = number
            ? `${number}. ${place.name}`
            : place.name;

          title.style.fontSize = "14px";

          const address = document.createElement("p");

          address.textContent =
            place.address || "주소 정보 없음";

          address.style.cssText = `
            font-size: 12px;
            color: #64748b;
            margin-top: 8px;
            line-height: 1.5;
          `;

          content.append(title, address);

          infoWindow?.setContent(content);
          infoWindow?.open(map, marker);
        }
      );

      markersRef.current.push(marker);
      listenersRef.current.push(listener);
    });
  }, [
    sdkReady,
    places,
    selectedCode,
    numberedPlaces,
  ]);

  if (!clientId) {
    return (
      <p style={{ color: "#dc2626" }}>
        NAVER Maps Client ID가 설정되지 않았습니다.
      </p>
    );
  }

  return (
    <div>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() => setSdkError(true)}
      />

      {sdkError && (
        <p style={{ color: "#dc2626" }}>
          NAVER 지도 API 로드에 실패했습니다.
        </p>
      )}

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "480px",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#e2e8f0",
        }}
      />

      <p
        style={{
          marginTop: 12,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {selectedCode
          ? `선택한 자치구의 관광 장소: ${places.length}개`
          : `서울 전체 관광 장소: ${places.length}개`}
      </p>
    </div>
  );
}
