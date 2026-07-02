import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
}

export default function Card({
                                 children,
                                 className = "",
                             }: CardProps) {
    return (
        <div
            className={`
        rounded-[28px]
        bg-white/65
        backdrop-blur
        shadow-xl
        p-6
        ${className}
      `}
        >
            {children}
        </div>
    );
}