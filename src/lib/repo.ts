import raw from "@/data/cars.json";

/* =========================
 * 타입: JSON 구조에 정확히 맞춤
 * ========================= */

export type Color = {
    code: string;
    name: string;
    /** 외장 색상 추가금 (없으면 0) */
    extra: number;
};

export type Interior = {
    code: string;
    name: string;
};

export type OptionEntry = {
    code: string;
    name: string;   // ← 트림 전용 이름
    price: number;
    allowed?: boolean;    // 선택 가능 여부 (기본 true)
    included?: boolean;   // 기본 적용 여부
    requires?: string[];  // 선행 옵션
    desc?: string;   //트림별 설명
};

export type PricingPolicy = {
    /** 개소세 인하 대상 여부 (기본 true) */
    exciseEligible?: boolean;
    /** 원/인하 세율 */
    exciseOriginalRate?: number;
    exciseReducedRate?: number;

    /** 친환경 구분 */
    ecoKind?: "ev" | "phev" | "hev" | "fcev" | "none";

    /** (옵션) 친환경 감면 캡 */
    ecoExciseCap?: number;
    ecoEducationCap?: number;

    /** 캡 계산 무시하고 고정 ecoDiscount만 적용 */
    priceIsFinal?: boolean;
};

export type Trim = {
    code: string;
    name: string;
    basePrice: number;
    standardFeatures?: string | string[];
    options: OptionEntry[];
    /** 이 트림에서 허용되는 외장/내장 */
    allowedColorCodes?: string[];
    allowedInteriorCodes?: string[];
    /** 트림 개별 고정 할인 (있으면) */
    ecoDiscount?: number;
    /** 트림 단위 가격 정책 오버라이드 */
    pricing?: PricingPolicy;
    /** 상위 트림의 기본사양 문자열 승계(선택) */
    inheritStandardFrom?: string;
    ecoTaxBenefitOverride?: number;
};
export type Rule = {
    when?: {
        trim?: string;
        option?: string;
        /** ✅ 컬러 한 개 또는 여러 개 */
        color?: string | string[];
    };
    /** ✅ “이 옵션은 이 컬러에서만 가능” */
    requiresColorAnyOf?: string[];

    /** ✅ 서로 동시 선택 불가 옵션 세트 */
    mutexOptions?: string[];

    /** ✅ 해당 컬러가 선택된 경우 금지할 옵션(들) */
    forbidOptions?: string[];

    /** ✅ 해당 옵션이 선택된 경우 금지할 컬러(들) */
    forbidColors?: string[];

    note?: string;
};

export type SpecsBlock = {
    priceRange: [number, number];
    fuel: string;
    efficiency: string;
    power: string;
    torque: string;
    displacement: string;
    engine: string;
    transmission: string;
    seats: number;
};

export type Model = {
    id: string;
    name: string;
    brand: string;
    segment: string;
    fuel: string;
    specs: SpecsBlock;
    img: string;
    colors: Color[];
    interiors?: Interior[];
    trims: Trim[];
    rules?: Rule[];
    /** 모델 공통 가격 정책 (트림에서 덮어쓰기 가능) */
    pricing?: PricingPolicy;
};

/** JSON을 타입 검증하고 값은 그대로 사용 */
const cars = raw as unknown as Model[];

/* =========================
 * 목록 카드용 뷰모델 & 조회
 * ========================= */

export type CarCardModel = {
    id: string;
    name: string;
    brand: string;
    segment: string;
    fuel: string;
    startPrice: number;
    img?: string;
};

export function getAllCards(): CarCardModel[] {
    return cars.map((m) => {
        const minBase = Math.min(...m.trims.map((t) => t.basePrice));
        return {
            id: m.id,
            name: m.name,
            brand: m.brand,
            segment: m.segment,
            fuel: m.fuel,
            startPrice: Number.isFinite(minBase) ? minBase : 0,
            img: m.img,
        };
    });
}

export function getModelByCode(code: string): Model | undefined {
    return cars.find((m) => m.id === code);
}

export function getTrimByCode(model: Model, trimCode: string): Trim | undefined {
    return model.trims.find((t) => t.code === trimCode);
}

/* =========================
 * 옵션 가용성(활성/비활성/필수) 판단
 * ========================= */

export type Availability = {
    disabled: boolean;
    reason?: string;
    included?: boolean;
    price?: number;
};

export function evaluateOptionAvailability(params: {
    model: Model;
    trim: Trim;
    selectedOptionCodes: string[];
    colorCode?: string;
}): Record<string, Availability> {
    const { model, trim, selectedOptionCodes, colorCode } = params;
    const map: Record<string, Availability> = {};
    const selected = new Set(selectedOptionCodes);

    // ✅ 코드 → 표시이름: 트림 옵션에서만 찾음
    const nameOf = (code: string) =>
        trim.options.find(x => x.code === code)?.name ?? code.toUpperCase();

    // 1) 트림 옵션 기준
    for (const o of trim.options) {
        const avail: Availability = {
            disabled: false,
            price: o.price,
            included: !!o.included,
        };

        if (o.allowed === false) {
            avail.disabled = true;
            avail.reason = "선택 불가 트림";
        }

        // 선행 옵션 체크
        if (!avail.disabled && o.requires?.length) {
            const ok = o.requires.every(
                req =>
                    selected.has(req) ||
                    !!trim.options.find(x => x.code === req && x.included)
            );
            if (!ok) {
                const reqNames = o.requires.map(nameOf).join(", ");
                avail.disabled = true;
                avail.reason = `${reqNames} 적용 시 선택 가능`;
            }
        }

        map[o.code] = avail;
    }

    // 2) 룰 적용 (mutex / color 제한 / color↔option 금지)
    for (const rule of model.rules ?? []) {
        const targetTrimOK = !rule.when?.trim || rule.when.trim === trim.code;

        // (a) 특정 옵션이 "특정 컬러에서만 가능"
        if (rule.when?.option && targetTrimOK && rule.requiresColorAnyOf?.length) {
            const opt = rule.when.option;
            if (map[opt] && colorCode) {
                const ok = rule.requiresColorAnyOf.includes(colorCode);
                if (!ok) {
                    map[opt].disabled = true;
                    map[opt].reason = `컬러 제한 (${rule.requiresColorAnyOf.join(", ")})`;
                }
            }
        }

        // (b) 상호배제: 하나 선택 시 나머지 비활성화
        if (rule.mutexOptions && rule.mutexOptions.length >= 2 && targetTrimOK) {
            const chosen = rule.mutexOptions.filter(c => selected.has(c));
            if (chosen.length >= 1) {
                const chosenCode = chosen[0];
                for (const code of rule.mutexOptions) {
                    if (code !== chosenCode && map[code]) {
                        map[code].disabled = true;
                        map[code].reason = `동시 선택 불가: 이미 ${chosenCode.toUpperCase()} 선택됨`;
                    }
                }
            }
        }

        // (c) 특정 컬러(들) 선택 시 금지되는 옵션들: when.color + forbidOptions
        if (targetTrimOK && rule.when?.color && rule.forbidOptions?.length) {
            const colors = Array.isArray(rule.when.color) ? rule.when.color : [rule.when.color];
            if (colorCode && colors.includes(colorCode)) {
                for (const opt of rule.forbidOptions) {
                    if (map[opt]) {
                        map[opt].disabled = true;
                        map[opt].reason = `선택한 외장색과 동시 선택 불가`;
                    }
                }
            }
        }

        // (d) 특정 옵션 선택 시 금지되는 컬러들: when.option + forbidColors
        if (targetTrimOK && rule.when?.option && rule.forbidColors?.length && colorCode) {
            const opt = rule.when.option;
            const blocked = rule.forbidColors.includes(colorCode);
            if (blocked && map[opt] && !selected.has(opt)) {
                map[opt].disabled = true;
                map[opt].reason = `현재 외장색(${colorCode})과 동시 선택 불가`;
            }
        }
    }

    return map;
}

/* =========================
 * 견적 계산 (개소세/친환경 감면 포함)
 * ========================= */
export function calculateQuote(
    model: Model,
    trim: Trim,
    selectedOptionCodes: string[],
    opts?: {
        colorExtra?: number;    // 외장색 추가금 (없으면 0)
        colorCode?: string;     // 표시용 코드
        colorName?: string;     // 표시용 이름 (예: "스노우 화이트 펄 +80,000원")
    }
) {
    const colorExtra = opts?.colorExtra ?? 0;
    const basePrice = trim.basePrice;

    // ① 선택/기본 포함 옵션 목록(색상은 별도로 추가)
    const selectedOptions = trim.options.filter(
        (o) => (o.allowed !== false) && (o.included || selectedOptionCodes.includes(o.code))
    );

    // 색상 추가금이 있으면 "옵션 항목"처럼 함께 보여주기 (옵션 합계에도 자연스럽게 포함됨)
    if (colorExtra > 0) {
        selectedOptions.push({
            code: `color:${opts?.colorCode ?? "unknown"}`,
            name: opts?.colorName ?? "외장색상",
            price: colorExtra,
            allowed: true,
        });
    }

    // ② 옵션 합계(색상 포함) — included 는 0원
    const optionsTotal = selectedOptions.reduce(
        (sum, o) => sum + (o.included ? 0 : o.price),
        0
    );

    // ③ 과세표준(개소세 계산용) = 기본가 + 옵션합계
    const subtotal = basePrice + optionsTotal;

    // ④ 정책(트림 > 모델 > 기본)
    const pol = {
        exciseEligible: trim.pricing?.exciseEligible ?? model.pricing?.exciseEligible ?? true,
        exciseOriginalRate: trim.pricing?.exciseOriginalRate ?? model.pricing?.exciseOriginalRate ?? 0.05,
        exciseReducedRate: trim.pricing?.exciseReducedRate ?? model.pricing?.exciseReducedRate ?? 0.035,

        ecoKind: trim.pricing?.ecoKind ?? model.pricing?.ecoKind ?? "none",
        // 고정 친환경 감면(예: 스포티지 HEV 1,000,000) — 트림 필드 사용
        ecoFixed: trim.ecoDiscount ?? 0,

        // 캡 기반 감면이 필요한 경우에만 사용 (EV 등)
        ecoExciseCap: trim.pricing?.ecoExciseCap ?? model.pricing?.ecoExciseCap ?? 0,
        ecoEducationCap: trim.pricing?.ecoEducationCap ?? model.pricing?.ecoEducationCap ?? 0,

        // “친환경 감면은 고정값만 쓴다”(스포티지 HEV 같은 케이스)를 위한 스위치
        priceIsFinal: trim.pricing?.priceIsFinal ?? model.pricing?.priceIsFinal ?? false,
    };

    // ⑤ 개소세 1.5%p 인하 (원단위 버림)
    const discountInha = pol.exciseEligible
        ? Math.floor(subtotal * (pol.exciseOriginalRate - pol.exciseReducedRate))
        : 0;

    // ⑥ 친환경 감면
    // - priceIsFinal=true 인 경우: 캡 계산 무시, ecoFixed(고정)만 적용
    // - 아니면: 3.5% 개소세와 그 30% 교육세에 각 cap 적용
    let ecoExciseDiscount = 0;
    let ecoEducationDiscount = 0;

    if (!pol.priceIsFinal && pol.ecoKind !== "none" && (pol.ecoExciseCap > 0 || pol.ecoEducationCap > 0)) {
        const exciseAfterInha = Math.floor(subtotal * pol.exciseReducedRate); // 3.5% 개소세
        ecoExciseDiscount = Math.min(exciseAfterInha, pol.ecoExciseCap);
        ecoEducationDiscount = Math.min(Math.floor(ecoExciseDiscount * 0.3), pol.ecoEducationCap);
    }

    // “친환경 세제혜택”으로 한 줄 표기할 합계 (고정 + 캡감면(개소/교육))
    const ecoCombined = (pol.ecoFixed ?? 0) + ecoExciseDiscount + ecoEducationDiscount;

    // ⑦ 최종가
    const total = subtotal - discountInha - ecoCombined;

    // ⑧ 표시용 라인 (옵션 합계는 항상 노출)
    const lines = [
        { label: `기본가 (${trim.name})`, amount: basePrice },
        { label: "옵션 합계", amount: optionsTotal },
        ...(discountInha ? [{ label: "개소세 인하 혜택", amount: -discountInha }] : []),
        ...(ecoCombined ? [{ label: "친환경 세제 혜택", amount: -ecoCombined }] : []),
        { label: "총액", amount: total },
    ];

    return {
        basePrice,
        optionsTotal,      // (색상 포함)
        subtotal,
        discountInha,
        ecoCombined,       // 한 줄로 묶은 친환경 혜택 금액
        total,
        selectedOptions,   // 여기 안에 색상 항목도 포함됨 (있다면)
        lines,
    };
}