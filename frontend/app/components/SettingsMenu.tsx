"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
    onUploadImage: (file: File) => void;
};

export default function SettingsMenu({ onUploadImage }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="fixed right-5 top-5 z-40">
            <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-label="Settings"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/25 text-sm font-semibold text-[#1c1c2e] shadow-lg backdrop-blur-md transition hover:bg-white/40"
            >
                <UserIcon />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => {
                            fileInputRef.current?.click();
                            setIsOpen(false);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#1c1c2e] hover:bg-black/5"
                    >
                        Change background
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUploadImage(file);
                    }
                }}
            />
        </div>
    );
}

function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
        </svg>
    );
}
