interface LogoProps {
    className?: string;
    showText?: boolean;
    textClassName?: string;
}

export function Logo({ className = "w-8 h-8", showText = true, textClassName = "text-xl" }: LogoProps) {
    return (
        <div className="flex items-center gap-3 select-none">
            <div className={`${className} relative flex items-center justify-center`}>
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                    {/* Background do Ícone */}
                    <rect width="40" height="40" rx="10" fill="#14264b" />
                    <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" stroke="url(#border-gradient)" strokeOpacity="0.3" />

                    {/* Letras WP Estilizadas */}
                    <g stroke="url(#main-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        {/* O "W" interligado */}
                        <path d="M10 13L13.5 27L18 13L22.5 27L26 13" />
                        {/* A barriga do "P" saindo da última haste do W */}
                        <path d="M26 13C34 13 34 21 26 21" />
                    </g>

                    {/* Nós de Conexão (Efeito Flow) */}
                    <circle cx="10" cy="13" r="1.5" fill="#60A5FA" />
                    <circle cx="18" cy="13" r="1.5" fill="#60A5FA" />
                    <circle cx="26" cy="13" r="1.5" fill="#60A5FA" />
                    <circle cx="13.5" cy="27" r="1.5" fill="#3B82F6" />
                    <circle cx="22.5" cy="27" r="1.5" fill="#3B82F6" />
                    <circle cx="26" cy="21" r="1.5" fill="#3B82F6" />

                    <defs>
                        <linearGradient id="main-gradient" x1="10" y1="20" x2="32" y2="20" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#60A5FA" />
                            <stop offset="1" stopColor="#22D3EE" />
                        </linearGradient>
                        <linearGradient id="border-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#60A5FA" />
                            <stop offset="1" stopColor="#22D3EE" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {showText && (
                <div className="leading-none">
                    <h1 className={`${textClassName} font-bold tracking-tight text-white`}>
                        Auto<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Flow</span>
                    </h1>
                </div>
            )}
        </div>
    );
}