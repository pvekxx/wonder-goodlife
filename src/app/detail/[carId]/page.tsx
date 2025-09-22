import DetailClient from "./DetailClient";

export default async function Page({ params }: { params: Promise<{ carId: string }> }) {
    const { carId } = await params;
    return <DetailClient carId={carId} />;
}