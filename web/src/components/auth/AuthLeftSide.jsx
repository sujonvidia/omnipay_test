import { FiShield, FiTrendingUp, FiZap } from 'react-icons/fi';

const POINTS = [
    { icon: FiZap, text: 'Get paid faster with automated invoicing & collections' },
    { icon: FiTrendingUp, text: 'Real-time visibility into cash flow and receivables' },
    { icon: FiShield, text: 'Bank-grade security on every transaction' },
];

export default function AuthLeftSide() {
    return (
        <aside className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
            <div className="absolute inset-0 opacity-20 pointer-events-none [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px),radial-gradient(circle_at_80%_60%,white_1px,transparent_1px)] [background-size:48px_48px,72px_72px]" />

            <div className="relative z-10 px-8 xl:px-12 pt-8 xl:pt-10">
                <span className="text-2xl xl:text-[28px] font-bold tracking-tight">OmniPay</span>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-start px-10 xl:px-[53px]">
                <div className="max-w-md">
                    <p className="text-3xl xl:text-5xl font-bold leading-tight mb-6">
                        Payments &amp; finance,<br />all in one place
                    </p>
                    <p className="text-base xl:text-lg text-indigo-100/90 leading-relaxed mb-8">
                        OmniPay brings invoicing, collections and financial reporting together so your team can move money with confidence.
                    </p>
                    <ul className="space-y-4">
                        {POINTS.map(({ icon: Icon, text }, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="text-sm xl:text-base text-indigo-50/95 leading-snug pt-1">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </aside>
    );
}
