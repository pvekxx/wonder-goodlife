type Props = {
    brand: string;
    name: string;
    priceRange: [number, number];
};

export default function CarHeader({ brand, name, priceRange }: Props) {
    const [min, max] = priceRange;
    return (
        <header className="flex items-end justify-between gap-4">
            <h1 className="text-4xl font-bold">
                {brand} {name}
            </h1>
            <div className="text-right">
                <div className="text-2xl font-semibold">
                    {min.toLocaleString("ko-KR")} ~ {max.toLocaleString("ko-KR")}원
                </div>
            </div>
        </header>
    );
}