"use client";

import FilterButton from "./FilterButton";

type Props<T extends string> = {
    title: string;
    options: readonly T[];      // 표시할 옵션 목록
    values: T[];                // 현재 선택된 값들 ([] = 전체)
    onChange: (next: T[]) => void;
    className?: string;
};

export default function MultiSelectFilter<T extends string>({
    title, options, values, onChange, className
}: Props<T>) {
    const toggle = (v: T) => {
        const has = values.includes(v);
        onChange(has ? values.filter(x => x !== v) : [...values, v]);
    };

    const clearAll = () => onChange([]);

    return (
        <section className={`rounded-3xl bg-white/5 border border-white/10 p-4 ${className ?? ""}`}>
            <div className="text-md font-semibold">{title}</div>
            <div className="flex flex-wrap gap-2 pt-2">
                {/* 전체 */}
                <FilterButton active={values.length === 0} onClick={clearAll}>전체</FilterButton>
                {/* 개별 옵션 */}
                {options.map(opt => (
                    <FilterButton
                        key={opt}
                        active={values.includes(opt)}
                        onClick={() => toggle(opt)}
                    >
                        {opt}
                    </FilterButton>
                ))}
            </div>
        </section>
    );
}