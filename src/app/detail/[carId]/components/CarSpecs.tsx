type SpecsProps = {
    specs: {
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
    img?: string;
    alt?: string;
};

export default function CarSpecs({ specs, img, alt }: SpecsProps) {
    return (
        <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <div className="text-lg font-semibold">차량 정보</div>
            {/* ✅ 항상 2열: 왼쪽 이미지 / 오른쪽 스펙 리스트 */}
            <div className="pt-2 grid gap-6 items-start grid-cols-[2fr_1fr]">
                {/* 왼쪽: 이미지 */}
                <div className="min-w-0 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                    {img ? (
                        <img
                            src={img}
                            alt={alt ?? "vehicle"}
                            className="w-full h-auto max-h-96 object-contain"
                        />
                    ) : (
                        <div className="h-72 flex items-center justify-center text-white-400 text-sm">
                            이미지 준비중
                        </div>
                    )}
                </div>

                {/* 오른쪽: 스펙 8개 세로 나열 */}
                <div className="p-4">
                    <ul className="space-y-6 text-sm font-semibold text-white">
                        <li className="flex justify-between"><span>연료</span><span>{specs.fuel}</span></li>
                        <li className="flex justify-between"><span>출력</span><span>{specs.power}</span></li>
                        <li className="flex justify-between"><span>배기량</span><span>{specs.displacement}</span></li>
                        <li className="flex justify-between"><span>변속</span><span>{specs.transmission}</span></li>
                        <li className="flex justify-between"><span>연비</span><span>{specs.efficiency}</span></li>
                        <li className="flex justify-between"><span>토크</span><span>{specs.torque}</span></li>
                        <li className="flex justify-between"><span>엔진</span><span>{specs.engine}</span></li>
                        <li className="flex justify-between"><span>승차정원</span><span>{specs.seats}인승</span></li>
                    </ul>
                </div>
            </div>
        </section>
    );
}