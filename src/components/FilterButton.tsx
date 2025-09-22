"use client";

export default function FilterButton({
    children,
    active,
    onClick,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={!!active}
            className={`px-3 h-9 rounded-2xl text-sm transition
        ${active
                    ? "bg-neutral-100 text-black"
                    : "bg-neutral-700 text-white hover:bg-neutral-600"}`}
        >
            {children}
        </button>
    );
}