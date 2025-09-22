"use client";

import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    getModelByCode,
    calculateQuote,
    evaluateOptionAvailability,
} from "@/lib/repo";
import CarHeader from "./components/CarHeader";
import CarSpecs from "./components/CarSpecs";
import QuoteSummary from "./components/QuoteSummary";
import { KIA_COLOR_HEX, KIA_INTERIOR_HEX } from "@/lib/colorMap";
import TrimFeatures from "./components/TrimFeatures";


export default function DetailClient({ carId }: { carId: string }) {
    const car = getModelByCode(carId);
    useEffect(() => {
        if (!car) notFound();
    }, [car]);

    if (!car) return null;

    // 트림 상태
    const [trimCode, setTrimCode] = useState(car.trims[0].code);
    const trim = car.trims.find((t) => t.code === trimCode)!;

    // 옵션/외장컬러
    const [selected, setSelected] = useState<string[]>([]);
    const [colorCode, setColorCode] = useState<string | undefined>(
        trim.allowedColorCodes?.[0] ?? car.colors[0]?.code
    );

    // 선택된 옵션들 때문에 금지되는 컬러 세트
    const forbiddenColorSet = useMemo(() => {
        const s = new Set<string>();
        for (const r of car.rules ?? []) {
            const targetTrimOK = !r.when?.trim || r.when.trim === trim.code;
            if (!targetTrimOK) continue;
            // when.option + forbidColors
            if (r.when?.option && selected.includes(r.when.option)) {
                (r.forbidColors ?? []).forEach(code => s.add(code));
            }
        }
        return s;
    }, [car.rules, trim.code, selected]);

    const isColorEnabled = (code: string) =>
        allowedColorSet.has(code) && !forbiddenColorSet.has(code);

    // ✅ 내장컬러 상태 (가격 영향 X)
    const [interiorCode, setInteriorCode] = useState<string | undefined>(
        trim.allowedInteriorCodes?.[0] ?? car.interiors?.[0]?.code
    );

    // 허용 외장/내장 목록
    const allowedColorSet = useMemo(
        () => new Set(trim.allowedColorCodes ?? car.colors.map(c => c.code)),
        [trim.allowedColorCodes, car.colors]
    );

    // ✅ 변경: 전체를 보여주되, 허용 여부는 Set로 판단
    const allowedInteriorSet = useMemo(
        () => new Set(trim.allowedInteriorCodes ?? (car.interiors?.map(i => i.code) ?? [])),
        [trim.allowedInteriorCodes, car.interiors]
    );


    // 옵션 가용성 (requires / included / color rule 등 반영)
    const availability = useMemo(
        () =>
            evaluateOptionAvailability({
                model: car,
                trim,
                selectedOptionCodes: selected,
                colorCode,
            }),
        [car, trim, selected, colorCode]
    );



    const mutexMap = useMemo(() => {
        // { optionCode: Set<conflictingCodes> }
        const map = new Map<string, Set<string>>();

        (car.rules ?? []).forEach(r => {
            if (!r.when?.trim || r.when.trim !== trim.code) return;
            const list = (r as any).mutexOptions as string[] | undefined;
            if (!list || list.length < 2) return;

            // 양방향 매핑
            for (const a of list) {
                if (!map.has(a)) map.set(a, new Set<string>());
                for (const b of list) {
                    if (a !== b) map.get(a)!.add(b);
                }
            }
        });
        return map;
    }, [car.rules, trim.code]);

    // 그 다음에 toggle 정의
    const toggle = (code: string) => {
        const a = availability[code];
        if (a?.included || a?.disabled) return;
        setSelected(prev => {
            if (prev.includes(code)) return prev.filter(c => c !== code);
            const conflicts = mutexMap.get(code) ?? new Set<string>();
            return [code, ...prev.filter(c => !conflicts.has(c))];
        });
    };

    // 트림 변경 시 초기화
    const onTrimChange = (code: string) => {
        const next = car.trims.find((t) => t.code === code)!;
        setTrimCode(code);
        setSelected([]);
        setColorCode(next.allowedColorCodes?.[0] ?? car.colors[0]?.code);
        setInteriorCode(next.allowedInteriorCodes?.[0] ?? car.interiors?.[0]?.code);
    };

    const colorExtra = useMemo(() => {
        const c = car.colors.find(x => x.code === colorCode);
        return typeof c?.extra === "number" ? c.extra : 0;
    }, [car.colors, colorCode]);



    // 견적 계산 (← colorExtra 반영)
    const pickedColor = car.colors.find(c => c.code === colorCode);
    const colorName =
        pickedColor && pickedColor.extra > 0
            ? `${pickedColor.name} (+${pickedColor.extra.toLocaleString("ko-KR")}원)`
            : pickedColor?.name ?? "외장색상";

    const quote = calculateQuote(car, trim, selected, {
        colorExtra,
        colorCode,
        colorName,
    });
    return (
        <main className="min-h-screen bg-neutral-900 text-white">
            <div className="mx-auto max-w-6xl p-4 space-y-4">
                {/* 헤더: 좌 타이틀, 우 가격 */}
                <CarHeader
                    brand={car.brand}
                    name={car.name}
                    priceRange={car.specs.priceRange}
                />

                {/* 스펙: 좌 이미지, 우 스펙 */}
                <CarSpecs specs={car.specs} img={car.img} alt={car.name} />

                {/* 트림 선택 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">트림 선택</div>
                    <div className="flex gap-2 flex-wrap pt-2">
                        {car.trims.map((t) => (
                            <button
                                key={t.code}
                                onClick={() => onTrimChange(t.code)}
                                className={`px-3 h-9 rounded-xl text-sm transition
                  ${t.code === trimCode
                                        ? "bg-white text-black"
                                        : "bg-neutral-700 hover:bg-neutral-600"}`}
                                aria-pressed={t.code === trimCode}
                            >
                                {t.name} ({t.basePrice.toLocaleString("ko-KR")}원)
                            </button>
                        ))}
                    </div>
                    {/* 기본사양 토글로 보여주고 싶으면 여기에 표/아코디언 추가 가능 */}
                </section>

                {/* ✅ 트림 기본 사양 */}
                <TrimFeatures features={trim.standardFeatures} />


                {/* ✅ 내장 컬러 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">내장 컬러</div>
                    <div className="flex gap-2 flex-wrap pt-2">
                        {(car.interiors ?? []).map((i) => {
                            const disabled = !allowedInteriorSet.has(i.code);
                            const active = i.code === interiorCode;
                            const onPick = () => { if (!disabled) setInteriorCode(i.code); };

                            return (
                                <button
                                    key={i.code}
                                    onClick={onPick}
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                    aria-pressed={active}
                                    className={`px-3 h-9 rounded-xl text-sm transition inline-flex items-center gap-2
            ${active ? "bg-white text-black" : "bg-neutral-700 hover:bg-neutral-600"}
            ${disabled ? "opacity-50 cursor-not-allowed hover:bg-neutral-700" : ""}`}
                                    title={disabled ? "이 트림에서는 선택 불가" : undefined}
                                >
                                    <span
                                        className="inline-block w-4 h-4 rounded-full border"
                                        style={{
                                            backgroundColor: KIA_INTERIOR_HEX[i.code] ?? "#444",
                                            borderColor: "rgba(255,255,255,.2)",
                                        }}
                                        aria-hidden
                                    />
                                    <span className="whitespace-nowrap">{i.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
                {/* 외장 컬러 선택 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">외장 컬러</div>
                    <div className="flex gap-2 flex-wrap pt-2">
                        {car.colors.map((c) => {
                            const enabled = isColorEnabled(c.code);
                            const active = c.code === colorCode;

                            return (
                                <button
                                    key={c.code}
                                    onClick={() => enabled && setColorCode(c.code)}
                                    disabled={!enabled}
                                    className={`px-3 h-9 rounded-xl text-sm transition inline-flex items-center gap-2
        ${active ? "bg-white text-black" : "bg-neutral-700 hover:bg-neutral-600"}
        ${!enabled ? "opacity-40 cursor-not-allowed hover:bg-neutral-700" : ""}`}
                                    aria-pressed={active}
                                >
                                    <span
                                        className="inline-block w-4 h-4 rounded-full border"
                                        style={{
                                            backgroundColor: KIA_COLOR_HEX[c.code] ?? "#ccc",
                                            borderColor: c.code === "UD" ? "#e5e7eb" : "rgba(255,255,255,.2)",
                                        }}
                                        aria-hidden
                                    />
                                    <span className="whitespace-nowrap">
                                        {c.name}
                                        {typeof c.extra === "number" && c.extra > 0 && (
                                            <> + {c.extra.toLocaleString("ko-KR")}원</>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 옵션 선택 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">옵션 선택</div>
                    <ul className="space-y-2 pt-2 text-sm">
                        {trim.options.map((o) => {
                            const a = availability[o.code];
                            const checked = a?.included || selected.includes(o.code);

                            const onToggle = () => {
                                if (a?.included || a?.disabled) return;
                                toggle(o.code);
                            };

                            return (
                                <li key={o.code}>
                                    <label
                                        onClick={onToggle}
                                        className={`flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer transition
            ${checked ? "bg-emerald-800" : "hover:bg-white/10"}
            ${a?.disabled && !a?.included ? "cursor-not-allowed" : ""}
          `}
                                    >
                                        {/* 실제 체크박스는 화면에서 숨기고 label 클릭으로 토글 */}
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            disabled={a?.disabled || a?.included}
                                            checked={!!checked}
                                            onChange={onToggle}
                                            aria-checked={!!checked}
                                        />

                                        {/* 라벨 텍스트 */}
                                        <div className="flex-1">
                                            <div className="font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className={a?.disabled && !a?.included ? "text-neutral-400" : undefined}>
                                                    {(o.name ?? o.code.toUpperCase())} · {o.price.toLocaleString("ko-KR")}원
                                                </span>

                                                {a?.included && (
                                                    <span className="text-xs text-emerald-300 font-semibold">(기본적용)</span>
                                                )}

                                                {a?.disabled && !a?.included && a?.reason && (
                                                    <span className="text-xs text-red-500 font-semibold">{a.reason}</span>
                                                )}
                                            </div>

                                            {/* 필요하면 트림별 옵션 설명 한줄 */}
                                            {o.desc && (
                                                <div className="text-xs text-neutral-400 mt-0.5">
                                                    {o.desc}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* 견적 요약 */}
                <QuoteSummary
                    trimName={trim.name}
                    basePrice={quote.basePrice}
                    optionsTotal={quote.optionsTotal}
                    total={quote.total}
                    selectedOptions={quote.selectedOptions}
                    lines={quote.lines}
                />
            </div>
        </main>
    );
}