/* eslint-disable @typescript-eslint/no-explicit-any */
export type Brand = "현대" | "기아";
export type Segment = "경차" | "소형" | "준중형" | "중형" | "준대형" | "대형";
export type Fuel = "전기" | "하이브리드" | "가솔린" | "디젤" | "수소";

export type FilterState = {
    brands: Brand[];     // [] = 전체
    segments: Segment[]; // [] = 전체
    fuels: Fuel[];       // [] = 전체
    search: string;
};

export type CarModel = {
    id: string;
    name: string;
    brand: Brand;
    segment: Segment;
    fuel: Fuel;
    price: number;
    img?: string;
};

const includeOrAll = <T extends string>(arr: T[], v: T) =>
    arr.length === 0 || arr.includes(v);

const norm = (s: string) => s.toLowerCase().trim();

// 기존: CarModel 전용
export function applyFilters(all: CarModel[], f: FilterState) {
    const q = norm(f.search);
    return all.filter((m) => {
        if (!includeOrAll(f.brands, m.brand)) return false;
        if (!includeOrAll(f.segments, m.segment)) return false;
        if (!includeOrAll(f.fuels, m.fuel)) return false;
        if (q) {
            const hay = norm(`${m.name} ${m.brand} ${m.segment} ${m.fuel}`);
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

/** ✅ 제너릭: 이름/브랜드/세그먼트/연료 필드만 있으면 어떤 타입도 필터링 */
export type Filterable = {
    name: string;
    brand: string;
    segment: string;
    fuel: string;
};

export function applyFiltersGeneric<T extends { name: string; brand: string; segment: string; fuel: string }>(
    all: T[], f: FilterState
) {
    const q = f.search.trim().toLowerCase();
    const inc = <K extends string>(arr: K[], v: K) => arr.length === 0 || arr.includes(v);

    return all.filter((m) => {
        // 브랜드/연료는 완전일치
        if (!inc(f.brands as any, m.brand as any)) return false;

        // ✅ 세그먼트는 부분일치 허용 (예: "중형" vs "중형 SUV")
        if (f.segments.length > 0) {
            const ok = (f.segments as string[]).some(s =>
                m.segment === s || m.segment.includes(s)
            );
            if (!ok) return false;
        }

        if (!inc(f.fuels as any, m.fuel as any)) return false;

        if (q) {
            const hay = `${m.name} ${m.brand} ${m.segment} ${m.fuel}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}