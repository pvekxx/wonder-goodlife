"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** features: string[] 또는 개행 문자열을 모두 지원 */
export default function TrimFeatures({
    features,
    initiallyOpen = false,
    maxCollapsed = 2, // 접힘 상태에서 보여줄 줄 수
}: {
    features: string[] | string | undefined;
    initiallyOpen?: boolean;
    maxCollapsed?: number;
}) {
    const [open, setOpen] = useState(initiallyOpen);

    // 배열/문자열 모두 수용
    const items = useMemo(() => {
        if (!features) return [];
        if (Array.isArray(features)) return features.filter(Boolean);
        // 문자열이면 개행 기준 분리
        return features
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
    }, [features]);

    const collapsed = !open && items.length > maxCollapsed;
    const visible = collapsed ? items.slice(0, maxCollapsed) : items;

    return (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <div className="text-lg font-semibold">기본 사양 품목</div>

            <ul className="mt-2 space-y-1 text-sm leading-6">
                {visible.map((line, i) => (
                    <li key={i} className="flex gap-2">
                        {/* <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" /> */}
                        <span className="text-neutral-200">{line}</span>
                    </li>
                ))}
            </ul>

            <div className="flex justify-center mt-2">
                {items.length > maxCollapsed && (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="h-8 w-full flex justify-center rounded-xl hover:bg-neutral-600 transition items-center"
                    >
                        {open ? (
                            <>
                                <ChevronUp size={16} />
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </section>
    );
}