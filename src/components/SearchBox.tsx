"use client";

export default function SearchBox({
    value, onChange,
}: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <input
                type="text"
                placeholder="차량의 정보를 검색하세요."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-white/10 w-full rounded-4xl px-4 py-2 bg-white/10 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white text-md"
            />
        </div>
    );
}