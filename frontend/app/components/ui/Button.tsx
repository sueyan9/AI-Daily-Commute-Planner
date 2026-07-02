import { ReactNode } from "react";

interface ButtonProps {
    children: ReactNode;
}

export default function Button({
                                   children,
                               }: ButtonProps) {
    return (
        <button
            className="
      w-full
      rounded-2xl
      bg-indigo-500
      py-4
      font-semibold
      text-white
      shadow-lg
      shadow-indigo-500/20
      transition
      hover:scale-[1.02]
      hover:bg-indigo-600
      active:scale-100
      "
        >
            {children}
        </button>
    );
}