"use client";

import Link from "next/link";
import Image from "next/image";
import type { CarCardModel } from "@/lib/repo";

export default function CarCard({ car }: { car: CarCardModel }) {
    return (
        <Link
            href={`/detail/${car.id}`}
            className="block rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
        >
            {/* 썸네일 */}
            <div className="relative w-full h-40 sm:h-44 lg:h-48 overflow-hidden rounded-2xl bg-white">
                {car.img ? (
                    <Image
                        src={car.img}
                        alt={car.name}
                        width={640}
                        height={360}
                        className="w-full h-full object-contain" // 부모 높이에 맞춰 안전
                        priority={false}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        이미지 준비중
                    </div>
                )}
            </div>

            {/* 텍스트 */}
            <div className="text-lg font-semibold pt-3">{car.name}</div>
            <div className="text-sm text-gray-300 pt-2">
                {car.brand} · {car.segment} · {car.fuel}
            </div>
            <div className="text-sm pt-1">
                시작가: {car.startPrice.toLocaleString("ko-KR")}원
            </div>
        </Link>
    );
}