export default function QuoteSummary({
    trimName,
    basePrice,
    optionsTotal,
    total,
    selectedOptions,
    lines = [],
}: {
    trimName: string;
    basePrice: number;
    optionsTotal: number;
    total: number;
    selectedOptions: { code: string; name?: string; price: number; included?: boolean }[];
    lines?: { label: string; amount: number }[];
}) {

    // 라인 분리: 기본가 / 옵션합계 / 할인들 / 총액
    const baseLine = lines.find(l => l.label.startsWith("기본가"));
    const totalLine = lines.find(l => l.label === "총액");
    const discountLines = lines.filter(
        l =>
            l.label !== "총액" &&
            l.label !== "옵션 합계" &&
            !l.label.startsWith("기본가")
    );

    return (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <div className="text-lg font-semibold">견적 요약</div>

            <ul className="space-y-1 pt-2">
                {/* 1) 기본가 */}
                {baseLine ? (
                    <li className="flex justify-between font-semibold">
                        <span>{baseLine.label}</span>
                        <span>{baseLine.amount.toLocaleString("ko-KR")}원</span>
                    </li>
                ) : (
                    <li className="flex justify-between font-semibold">
                        <span>기본가 · {trimName} 트림</span>
                        <span>{basePrice.toLocaleString("ko-KR")}원</span>
                    </li>
                )}

                {/* 2) 옵션 합계 (항상 표시, 0원일 때도) */}
                <li className="flex justify-between">
                    <span>옵션 합계</span>
                    <span>{optionsTotal.toLocaleString("ko-KR")}원</span>
                </li>

                {/* 3) 선택 옵션 내역 */}
                <li className="mt-2">
                    <ul className="space-y-1 text-sm text-gray-200">
                        {selectedOptions.length === 0 ? (
                            <li className="text-neutral-400">선택된 옵션이 없습니다.</li>
                        ) : (
                            selectedOptions.map((o) => (
                                <li key={o.code} className="flex justify-between">
                                    <span>
                                        {(o.name ?? o.code.toUpperCase())} {o.included && "(기본적용)"}
                                    </span>
                                    <span>
                                        {o.included ? "0원" : `(${o.price.toLocaleString("ko-KR")}원)`}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </li>

                {/* 4) 할인/혜택 라인들 (옵션 합계 아래로 내려옴) */}
                {discountLines.map((l) => (
                    <li
                        key={l.label}
                        className={`flex justify-between ${l.amount < 0 ? "text-emerald-300 font-semibold" : ""}`}
                    >
                        <span>{l.label}</span>
                        <span>{l.amount.toLocaleString("ko-KR")}원</span>
                    </li>
                ))}

                {/* 5) 총액 */}
                <li className="flex justify-between font-bold pt-3 border-t border-white/20 mt-3">
                    <span>총액</span>
                    <span>{(totalLine?.amount ?? total).toLocaleString("ko-KR")}원</span>
                </li>
            </ul>
        </section>
    );
}