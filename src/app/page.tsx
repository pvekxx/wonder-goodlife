"use client";

import { useMemo, useState } from "react";
import { applyFiltersGeneric, type FilterState } from "@/lib/filters";
import { type CarCardModel, getAllCards } from "@/lib/repo";
import SearchBox from "@/components/SearchBox";
import CarCard from "@/components/CarCard";
import MultiSelectFilter from "@/components/MultiSelectFilter";

const BRAND_OPTS = ["현대", "기아"] as const;
const SEGMENT_OPTS = ["경차", "소형", "준중형", "중형", "준대형", "대형"] as const;
const FUEL_OPTS = ["전기", "하이브리드", "가솔린", "디젤", "수소"] as const;
const ALL: CarCardModel[] = getAllCards();

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({
    brands: [],      // [] = 전체
    segments: [],    // [] = 전체
    fuels: [],       // [] = 전체
    search: "",
  });

  const list = useMemo(
    () => applyFiltersGeneric<CarCardModel>(ALL, filters),
    [filters]
  );

  return (
    <main className="min-h-screen bg-neutral-900 text-white">
      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {/* 검색 */}
        <SearchBox
          value={filters.search}
          onChange={(v) => setFilters(s => ({ ...s, search: v }))}
        />
        {/* 필터 3종 */}
        <div className="grid gap-3 md:grid-cols-3">
          <MultiSelectFilter
            title="제조사"
            options={BRAND_OPTS}
            values={filters.brands}
            onChange={(v) => setFilters(s => ({ ...s, brands: v }))}
          />
          <MultiSelectFilter
            title="차량 종류"
            options={SEGMENT_OPTS}
            values={filters.segments}
            onChange={(v) => setFilters(s => ({ ...s, segments: v }))}
          />
          <MultiSelectFilter
            title="연료"
            options={FUEL_OPTS}
            values={filters.fuels}
            onChange={(v) => setFilters(s => ({ ...s, fuels: v }))}
          />
        </div>

        {/* 결과 리스트 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(car => (
            <CarCard key={car.id} car={car} />
          ))}
          {list.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-12">
              조건에 맞는 차량이 없습니다.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}