// src/app/detail/[carId]/DetailClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Model } from "@/lib/repo";
import {
    getModelByCode,
    calculateQuote,
    evaluateOptionAvailability,
} from "@/lib/repo";
import CarHeader from "./components/CarHeader";
import CarSpecs from "./components/CarSpecs";
import QuoteSummary from "./components/QuoteSummary";
import TrimFeatures from "./components/TrimFeatures";
import { KIA_COLOR_HEX, KIA_INTERIOR_HEX } from "@/lib/colorMap";

/** 404로 안전 이동 (클라이언트 전용) */
function NotFoundRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/not-found");
    }, [router]);
    return null;
}

/** 훅을 쓰는 본문 컴포넌트: 여기서는 car가 항상 존재 */
function DetailInner({ car }: { car: Model }) {
    // 트림 상태
    const [trimCode, setTrimCode] = useState<string>(car.trims[0].code);
    const trim = useMemo(() => {
        // 트림은 항상 존재한다고 가정(데이터 보장), 그래도 안전망
        return car.trims.find((t) => t.code === trimCode) ?? car.trims[0];
    }, [car.trims, trimCode]);

    // 옵션/외장/내장 상태
    const [selected, setSelected] = useState<string[]>([]);
    const [colorCode, setColorCode] = useState<string | undefined>(
        trim.allowedColorCodes?.[0] ?? car.colors[0]?.code
    );
    const [interiorCode, setInteriorCode] = useState<string | undefined>(
        trim.allowedInteriorCodes?.[0] ?? car.interiors?.[0]?.code
    );

    // 허용 세트
    const allowedColorSet = useMemo(
        () => new Set<string>(trim.allowedColorCodes ?? car.colors.map((c) => c.code)),
        [trim.allowedColorCodes, car.colors]
    );
    const allowedInteriorSet = useMemo(
        () => new Set<string>(trim.allowedInteriorCodes ?? (car.interiors?.map((i) => i.code) ?? [])),
        [trim.allowedInteriorCodes, car.interiors]
    );

    // 선택된 옵션 때문에 금지되는 컬러들 (when.option + forbidColors)
    const forbiddenColorSet = useMemo(() => {
        const s = new Set<string>();
        for (const r of car.rules ?? []) {
            const targetTrimOK = !r.when?.trim || r.when.trim === trim.code;
            if (!targetTrimOK) continue;
            if (r.when?.option && selected.includes(r.when.option)) {
                for (const code of r.forbidColors ?? []) s.add(code);
            }
        }
        return s;
    }, [car.rules, trim.code, selected]);

    const isColorEnabled = (code: string) =>
        allowedColorSet.has(code) && !forbiddenColorSet.has(code);

    // 옵션 가용성
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

    // 상호배제 맵
    const mutexMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const r of car.rules ?? []) {
            if (!r.when?.trim || r.when.trim !== trim.code) continue;
            const list = r.mutexOptions;
            if (!list || list.length < 2) continue;
            for (const a of list) {
                if (!map.has(a)) map.set(a, new Set<string>());
                for (const b of list) if (a !== b) map.get(a)!.add(b);
            }
        }
        return map;
    }, [car.rules, trim.code]);

    // 옵션 토글
    const toggle = (code: string) => {
        const a = availability[code];
        if (a?.included || a?.disabled) return;
        setSelected((prev) => {
            if (prev.includes(code)) return prev.filter((c) => c !== code);
            const conflicts = mutexMap.get(code) ?? new Set<string>();
            return [code, ...prev.filter((c) => !conflicts.has(c))];
        });
    };

    // 트림 변경
    const onTrimChange = (code: string) => {
        const next = car.trims.find((t) => t.code === code) ?? car.trims[0];
        setTrimCode(code);
        setSelected([]);
        setColorCode(next.allowedColorCodes?.[0] ?? car.colors[0]?.code);
        setInteriorCode(next.allowedInteriorCodes?.[0] ?? car.interiors?.[0]?.code);
    };

    // 컬러 추가금/표시명
    const pickedColor = useMemo(
        () => car.colors.find((c) => c.code === colorCode),
        [car.colors, colorCode]
    );
    const colorExtra = pickedColor?.extra ?? 0;
    const colorName =
        pickedColor && pickedColor.extra > 0
            ? `${pickedColor.name} (+${pickedColor.extra.toLocaleString("ko-KR")}원)`
            : pickedColor?.name ?? "외장색상";

    // 견적
    const quote = calculateQuote(car, trim, selected, {
        colorExtra,
        colorCode,
        colorName,
    });

    return (
        <main className="min-h-screen bg-neutral-900 text-white">
            <div className="mx-auto max-w-6xl p-4 space-y-4">
                <CarHeader brand={car.brand} name={car.name} priceRange={car.specs.priceRange} />
                <CarSpecs specs={car.specs} img={car.img} alt={car.name} />

                {/* 트림 선택 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">트림 선택</div>
                    <div className="flex gap-2 flex-wrap pt-2">
                        {car.trims.map((t) => (
                            <button
                                key={t.code}
                                onClick={() => onTrimChange(t.code)}
                                className={`px-3 h-9 rounded-xl text-sm transition ${t.code === trimCode ? "bg-white text-black" : "bg-neutral-700 hover:bg-neutral-600"
                                    }`}
                                aria-pressed={t.code === trimCode}
                            >
                                {t.name} ({t.basePrice.toLocaleString("ko-KR")}원)
                            </button>
                        ))}
                    </div>
                </section>

                {/* 트림 기본 사양 */}
                <TrimFeatures features={trim.standardFeatures} />

                {/* 내장 컬러 */}
                <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <div className="text-lg font-semibold">내장 컬러</div>
                    <div className="flex gap-2 flex-wrap pt-2">
                        {(car.interiors ?? []).map((i) => {
                            const disabled = !allowedInteriorSet.has(i.code);
                            const active = i.code === interiorCode;
                            return (
                                <button
                                    key={i.code}
                                    onClick={() => !disabled && setInteriorCode(i.code)}
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                    aria-pressed={active}
                                    className={`px-3 h-9 rounded-xl text-sm transition inline-flex items-center gap-2 ${active ? "bg-white text-black" : "bg-neutral-700 hover:bg-neutral-600"
                                        } ${disabled ? "opacity-50 cursor-not-allowed hover:bg-neutral-700" : ""}`}
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

                {/* 외장 컬러 */}
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
                                    className={`px-3 h-9 rounded-xl text-sm transition inline-flex items-center gap-2 ${active ? "bg-white text-black" : "bg-neutral-700 hover:bg-neutral-600"
                                        } ${!enabled ? "opacity-40 cursor-not-allowed hover:bg-neutral-700" : ""}`}
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
                                        {typeof c.extra === "number" && c.extra > 0 && <> + {c.extra.toLocaleString("ko-KR")}원</>}
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
                                        className={`flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer transition ${checked ? "bg-emerald-800" : "hover:bg-white/10"
                                            } ${a?.disabled && !a?.included ? "cursor-not-allowed" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            disabled={a?.disabled || a?.included}
                                            checked={!!checked}
                                            onChange={onToggle}
                                            aria-checked={!!checked}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className={a?.disabled && !a?.included ? "text-neutral-400" : undefined}>
                                                    {(o.name ?? o.code.toUpperCase())} · {o.price.toLocaleString("ko-KR")}원
                                                </span>
                                                {a?.included && <span className="text-xs text-emerald-300 font-semibold">(기본적용)</span>}
                                                {a?.disabled && !a?.included && a?.reason && (
                                                    <span className="text-xs text-red-500 font-semibold">{a.reason}</span>
                                                )}
                                            </div>
                                            {o.desc && <div className="text-xs text-neutral-400 mt-0.5">{o.desc}</div>}
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

export default function DetailClient({ carId }: { carId: string }) {
    const car = getModelByCode(carId);
    if (!car) return <NotFoundRedirect />; // 훅 없는 안전한 분기(ESLint OK)
    return <DetailInner car={car} />;
}