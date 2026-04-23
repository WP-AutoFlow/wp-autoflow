import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const isPt = i18n.language.startsWith('pt');

    const toggleLanguage = () => {
        const newLang = isPt ? 'en' : 'pt';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 hover:border-gray-500 hover:bg-gray-800 transition-all group"
            title="Switch Language / Mudar Idioma"
        >
            {isPt ? <FlagBR /> : <FlagUS />}
            <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                {isPt ? 'PT' : 'EN'}
            </span>
        </button>
    );
}

function FlagBR() {
    return (
        <svg className="w-5 h-5 rounded-full object-cover shadow-sm" viewBox="0 0 640 480">
            <g fillRule="evenodd">
                <path fill="#6da544" d="M0 0h640v480H0z" />
                <path fill="#ffe900" d="M320 62.6L575.6 240 320 417.4 64.4 240z" />
                <circle cx="320" cy="240" r="109.8" fill="#002776" />
                <path fill="#fff" fillRule="evenodd" d="M228.6 280.6c32.7-22.3 84.7-25.2 142.3-4.5l6.5-12.2c-63.5-22.9-121.2-18.8-155.3 4.5l6.5 12.2z" />
            </g>
        </svg>
    );
}

function FlagUS() {
    return (
        <svg className="w-5 h-5 rounded-full object-cover shadow-sm" viewBox="0 0 640 480">
            <path fill="#bd3d44" d="M0 0h640v480H0" />
            <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 202.8h640M0 276.5h640M0 350.2h640M0 424h640" />
            <path fill="#192f5d" d="M0 0h295.4v221.4H0z" />
            <path fill="#fff" d="M35 22h225v177H35z" opacity="0" />
            <g fill="#fff">
                <circle cx="36" cy="25" r="8" /> <circle cx="80" cy="25" r="8" /> <circle cx="125" cy="25" r="8" /> <circle cx="169" cy="25" r="8" /> <circle cx="214" cy="25" r="8" /> <circle cx="258" cy="25" r="8" />
                <circle cx="58" cy="50" r="8" /> <circle cx="102" cy="50" r="8" /> <circle cx="147" cy="50" r="8" /> <circle cx="191" cy="50" r="8" /> <circle cx="236" cy="50" r="8" />
                <circle cx="36" cy="76" r="8" /> <circle cx="80" cy="76" r="8" /> <circle cx="125" cy="76" r="8" /> <circle cx="169" cy="76" r="8" /> <circle cx="214" cy="76" r="8" /> <circle cx="258" cy="76" r="8" />
                <circle cx="58" cy="101" r="8" /> <circle cx="102" cy="101" r="8" /> <circle cx="147" cy="101" r="8" /> <circle cx="191" cy="101" r="8" /> <circle cx="236" cy="101" r="8" />
            </g>
        </svg>
    );
}