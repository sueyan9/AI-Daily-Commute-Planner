interface Props {
    title: string;
    subtitle?: string;
}

export default function SectionTitle({
                                         title,
                                         subtitle,
                                     }: Props) {
    return (
        <>
            {subtitle && (
                <p className="text-sm font-medium text-indigo-500">
                    {subtitle}
                </p>
            )}

            <h2 className="mt-1 text-2xl font-bold">
                {title}
            </h2>
        </>
    );
}