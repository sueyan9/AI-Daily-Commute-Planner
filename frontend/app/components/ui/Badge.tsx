import { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function Badge({
                                  children,
                              }: Props) {
    return (
        <span
            className="
      rounded-full
      bg-indigo-50
      px-4
      py-2
      text-sm
      font-medium
      text-indigo-600
      "
        >
      {children}
    </span>
    );
}