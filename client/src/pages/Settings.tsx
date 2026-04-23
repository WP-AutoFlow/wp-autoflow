import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Save, ArrowLeft, CalendarClock, Globe,
    Image as ImageIcon, ShieldAlert, Check, X,
    Lock, User, Link as LinkIcon, Clock, Bot, Cpu, Sparkles, Key, Terminal,
    MessageSquare, Plug, Loader2,
    Webhook, LineChart, LayoutGrid, BrainCircuit, Share2, Rocket, RefreshCw, Database,
    Zap, AlertTriangle, Trash2, RotateCcw, Download, UploadCloud, FileJson
} from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const INPUT_CLASS = "w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600";

const AI_PROVIDERS: any = {
    openai: {
        name: 'OpenAI (ChatGPT)',
        url: 'https://api.openai.com/v1',
        models: [
            { id: 'gpt-5-mini', name: 'GPT-5 Mini (Recommended)' },
            { id: 'gpt-5', name: 'GPT-5 (High quality)' },
            { id: 'o3-mini', name: 'o3-mini (Technical Reasoning)' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ]
    },
    together: {
        name: 'Together AI (Llama/Mistral)',
        url: 'https://api.together.xyz/v1',
        models: [
            { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo' },
            { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
            { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' },
            { id: 'google/gemma-2-9b-it', name: 'Google Gemma 2 9B' }
        ]
    },
    custom: {
        name: 'Custom / Ollama',
        url: '',
        models: []
    }
};

export default function Settings() {
    const { t } = useTranslation();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('core');

    const [cronSelect, setCronSelect] = useState('custom');
    const [selectedProvider, setSelectedProvider] = useState('openai');
    const [testingWP, setTestingWP] = useState(false);

    const [syncingSeo, setSyncingSeo] = useState(false);
    const [indexedPostsCount, setIndexedPostsCount] = useState(0);

    const CRON_PRESETS = [
        { value: '0 */1 * * *', label: t('settings.sections.scheduling.options.hourly') },
        { value: '0 */6 * * *', label: t('settings.sections.scheduling.options.every_6h') },
        { value: '0 */12 * * *', label: t('settings.sections.scheduling.options.every_12h') },
        { value: '0 0 * * *', label: t('settings.sections.scheduling.options.daily') },
        { value: 'custom', label: t('settings.sections.scheduling.options.custom') },
    ];

    const tabs = [
        { id: 'core', label: t('settings.tabs.core'), icon: <LayoutGrid size={18} /> },
        { id: 'intelligence', label: t('settings.tabs.intelligence'), icon: <BrainCircuit size={18} /> },
        { id: 'connections', label: t('settings.tabs.connections'), icon: <Share2 size={18} /> },
        { id: 'seo', label: t('settings.tabs.seo'), icon: <Rocket size={18} /> },
        { id: 'system', label: t('settings.tabs.system'), icon: <AlertTriangle size={18} /> },
    ];

    useEffect(() => {
        loadSettings();
        loadSeoStats();
    }, [t]);

    const loadSettings = () => {
        api.get('/settings').then(res => {
            const data = res.data;

            if (!data.execution) {
                data.execution = { mode: 'parallel', concurrency: 3, staggerDelay: 5000 };
            }

            setConfig(data);
            const existingPreset = CRON_PRESETS.find(p => p.value === data.cronSchedule);
            setCronSelect(existingPreset ? existingPreset.value : 'custom');

            if (data.ai?.baseUrl?.includes('openai.com')) setSelectedProvider('openai');
            else if (data.ai?.baseUrl?.includes('together.xyz')) setSelectedProvider('together');
            else setSelectedProvider('custom');
        });
    };

    const loadSeoStats = () => {
        api.get('/seo/stats').then(res => setIndexedPostsCount(res.data.count)).catch(() => { });
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);


    const handleCronChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setCronSelect(val);
        if (val !== 'custom') setConfig({ ...config, cronSchedule: val });
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const providerKey = e.target.value;
        setSelectedProvider(providerKey);
        const providerData = AI_PROVIDERS[providerKey];
        if (providerKey !== 'custom') {
            setConfig({
                ...config,
                ai: { ...config.ai, baseUrl: providerData.url, model: providerData.models[0].id }
            });
        } else {
            setConfig({ ...config, ai: { ...config.ai, baseUrl: '', model: '' } });
        }
    };

    const handleTestConnection = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!config.wp.api || !config.wp.user || !config.wp.password) {
            toast.warning(t('errors.MISSING_FIELDS'));
            return;
        }
        setTestingWP(true);
        try {
            const { data } = await api.post('/wp-test-connection', config.wp);
            toast.success(t('settings.feedback.wp_test_success', { name: data.name }));
        } catch (error: any) {
            const code = error.response?.data?.error;
            toast.error(code ? t(`errors.${code}`) : t('settings.feedback.wp_test_error'));
        } finally {
            setTestingWP(false);
        }
    };

    const handleSeoSync = async () => {
        if (!config.wp.api) {
            toast.error(t('errors.WP_API_NOT_CONFIGURED'));
            return;
        }
        setSyncingSeo(true);
        try {
            await api.post('/seo/sync');
            toast.success(t('settings.actions.sync_success'));
            setTimeout(loadSeoStats, 5000);
        } catch (e) {
            toast.error(t('toasts.action_error'));
        } finally {
            setSyncingSeo(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('⚠️ Are you sure? This will delete the record of all posts already made. The system may end up reposting old news if its still in the feed.')) return;

        setLoading(true);
        try {
            const { data } = await api.delete('/system/clear-history');
            toast.success(data.message);
            setIndexedPostsCount(0);
        } catch (e) {
            toast.error(t('toasts.action_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFactoryReset = async () => {
        const c1 = confirm('🚨 DANGER: FACTORY RESET 🚨\n\nThis will erase ALL your Sites, History, and Settings.\nYour account login will be retained, but everything else will disappear.\n\nAre you absolutely sure?');
        if (!c1) return;

        const c2 = confirm('Last chance: This action cannot be undone.\n\nConfirm Reset?');
        if (!c2) return;

        setLoading(true);
        try {
            await api.post('/system/factory-reset');
            toast.success('System reset successfully.');
            window.location.href = '/dashboard';
        } catch (e) {
            toast.error('Critical error while resetting the system.');
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await api.get('/system/export', { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'wp-autoflow-backup.json');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast.success(t('settings.actions.export_success', 'Backup exportado com sucesso!'));
        } catch (error) {
            toast.error(t('settings.actions.export_error', 'Falha ao exportar backup.'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const parsedData = JSON.parse(content);

                setIsImporting(true);
                await api.post('/system/import', parsedData);

                toast.success(t('settings.actions.import_success', 'Backup importado com sucesso!'));

                setTimeout(() => window.location.reload(), 1500);

            } catch (error) {
                toast.error(t('settings.actions.import_error', 'Arquivo inválido ou erro na importação.'));
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reseta o input
            }
        };
        reader.readAsText(file);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const promise = api.put('/settings', config);
        toast.promise(promise, {
            loading: t('settings.feedback.saving'),
            success: () => { setLoading(false); return t('settings.feedback.success'); },
            error: () => { setLoading(false); return t('settings.feedback.error'); }
        });
    };

    if (!config) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

    return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">{t('settings.title')}</h1>
                            <p className="text-gray-400 text-sm">{t('settings.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <button onClick={save} disabled={loading} className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transform transition-all active:scale-95 ${loading ? 'opacity-70 cursor-wait' : ''}`}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span className="hidden md:inline">{t('settings.save_btn')}</span>
                        </button>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="w-full lg:w-72 shrink-0">
                        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 sticky top-6">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent'}`}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1 min-w-0 space-y-6">
                        {activeTab === 'core' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                <SettingsCard icon={<CalendarClock className="text-purple-400" size={24} />} title={t('settings.sections.scheduling.title')} description={t('settings.sections.scheduling.desc')}>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.scheduling.cron_label')}</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                <select className={`${INPUT_CLASS} pl-10 appearance-none cursor-pointer`} value={cronSelect} onChange={handleCronChange}>
                                                    {CRON_PRESETS.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center h-full pt-6">
                                            <Toggle checked={config.runOnStartup} onChange={c => setConfig({ ...config, runOnStartup: c })} label={t('settings.sections.scheduling.boot_label')} />
                                        </div>
                                    </div>
                                    {cronSelect === 'custom' && (
                                        <div className="mt-4 animate-in fade-in">
                                            <input className={`${INPUT_CLASS} font-mono text-blue-300`} value={config.cronSchedule} onChange={e => setConfig({ ...config, cronSchedule: e.target.value })} placeholder="0 */1 * * *" />
                                        </div>
                                    )}
                                </SettingsCard>

                                <SettingsCard icon={<Zap className="text-yellow-400" size={24} />} title={t('settings.sections.execution.title')} description={t('settings.sections.execution.desc')}>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.execution.mode_label')}</label>
                                            <div className="relative">
                                                <select
                                                    className={`${INPUT_CLASS} appearance-none cursor-pointer pl-4`}
                                                    value={config.execution?.mode || 'sequential'}
                                                    onChange={e => setConfig({ ...config, execution: { ...config.execution, mode: e.target.value } })}
                                                >
                                                    <option value="sequential">{t('settings.sections.execution.modes.sequential')}</option>
                                                    <option value="parallel">{t('settings.sections.execution.modes.parallel')}</option>
                                                    <option value="staggered">{t('settings.sections.execution.modes.staggered')}</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            {config.execution?.mode === 'parallel' && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.execution.concurrency_label')}</label>
                                                    <input
                                                        type="number" min="2" max="20"
                                                        className={INPUT_CLASS}
                                                        value={config.execution?.concurrency || 5}
                                                        onChange={e => setConfig({ ...config, execution: { ...config.execution, concurrency: parseInt(e.target.value) } })}
                                                    />
                                                </div>
                                            )}

                                            {config.execution?.mode === 'staggered' && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.execution.delay_label')}</label>
                                                    <input
                                                        type="number" min="1000" step="500"
                                                        className={INPUT_CLASS}
                                                        value={config.execution?.staggerDelay || 5000}
                                                        onChange={e => setConfig({ ...config, execution: { ...config.execution, staggerDelay: parseInt(e.target.value) } })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {config.execution?.mode === 'sequential' && (
                                            <div className="text-xs text-gray-500 italic bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                                ℹ️ {t('settings.sections.execution.sequencial_message')}
                                            </div>
                                        )}
                                    </div>
                                </SettingsCard>

                                <SettingsCard icon={<ShieldAlert className="text-green-400" size={24} />} title={t('settings.sections.proxy.title')} description={
                                    <span>
                                        {t('settings.sections.proxy.desc')}
                                        {' ->> '}
                                        <a
                                            href="https://www.webshare.io/?referral_code=0gwwdjigq5zu"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline font-medium"
                                        >
                                            Get 10 proxies for free
                                        </a>
                                    </span>
                                }>
                                    <div className="space-y-6">
                                        <Toggle checked={config.proxy.enabled} onChange={c => setConfig({ ...config, proxy: { ...config.proxy, enabled: c } })} label={t('settings.sections.proxy.enabled_label')} />
                                        <div className={`space-y-4 ${!config.proxy.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <input className={INPUT_CLASS} value={config.proxy.scrapeDoToken || ''} onChange={e => setConfig({ ...config, proxy: { ...config.proxy, scrapeDoToken: e.target.value } })} placeholder={t('settings.sections.proxy.scrapedo_placeholder')} />
                                            <input className={INPUT_CLASS} value={config.proxy.url || ''} onChange={e => setConfig({ ...config, proxy: { ...config.proxy, url: e.target.value } })} placeholder={t('settings.sections.proxy.standard_placeholder')} />
                                        </div>
                                    </div>
                                </SettingsCard>
                            </div>
                        )}

                        {activeTab === 'intelligence' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SettingsCard icon={<Bot className="text-emerald-400" size={24} />} title={t('settings.sections.ai.title')} description={t('settings.sections.ai.desc')}>
                                    <div className="space-y-6">
                                        <div className="flex flex-col md:flex-row gap-6 justify-between border-b border-gray-800 pb-6">
                                            <div className="space-y-4">
                                                <Toggle checked={config.ai.enabled} onChange={c => setConfig({ ...config, ai: { ...config.ai, enabled: c } })} label={t('settings.sections.ai.enabled_label')} />
                                                <div className={!config.ai.enabled ? 'opacity-50 pointer-events-none' : ''}>
                                                    <Toggle checked={config.ai.rewriteContent} onChange={c => setConfig({ ...config, ai: { ...config.ai, rewriteContent: c } })} label={t('settings.sections.ai.rewrite_content_label')} />
                                                </div>
                                            </div>
                                            <div className={`w-full md:w-1/3 space-y-2 ${!config.ai.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.ai.language_label')}</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                    <select className={`${INPUT_CLASS} pl-10 appearance-none cursor-pointer`} value={config.ai.language || 'pt'} onChange={e => setConfig({ ...config, ai: { ...config.ai, language: e.target.value } })}>
                                                        <option value="pt">{t('settings.sections.ai.languages.pt')}</option>
                                                        <option value="en">{t('settings.sections.ai.languages.en')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`space-y-4 ${!config.ai.enabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.ai.provider_label')}</label>
                                                    <div className="relative">
                                                        <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <select className={`${INPUT_CLASS} pl-10 appearance-none cursor-pointer`} value={selectedProvider} onChange={handleProviderChange}>
                                                            {Object.entries(AI_PROVIDERS).map(([key, val]: any) => (<option key={key} value={key}>{val.name}</option>))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.ai.model_label')}</label>
                                                    <div className="relative">
                                                        <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        {selectedProvider === 'custom' ? (
                                                            <input className={`${INPUT_CLASS} pl-10`} placeholder="gpt-4o..." value={config.ai.model || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, model: e.target.value } })} />
                                                        ) : (
                                                            <select className={`${INPUT_CLASS} pl-10 appearance-none cursor-pointer`} value={config.ai.model || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, model: e.target.value } })}>
                                                                {AI_PROVIDERS[selectedProvider]?.models.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                    <input type="text" className={`${INPUT_CLASS} pl-10`} placeholder={t('settings.sections.ai.key_placeholder')} value={config.ai.apiKey || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, apiKey: e.target.value } })} />
                                                </div>
                                                {selectedProvider === 'custom' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <input className={INPUT_CLASS} placeholder="https://api.example.com/v1" value={config.ai.baseUrl || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, baseUrl: e.target.value } })} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`pt-6 border-t border-gray-800 ${!config.ai.enabled ? 'hidden' : ''}`}>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Sparkles size={14} /> {t('settings.sections.ai.prompts_group')}
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">{t('settings.sections.ai.title_prompt_label')}</label>
                                                    <textarea className={`${INPUT_CLASS} min-h-[120px] text-sm leading-relaxed`} placeholder={t('settings.sections.ai.title_prompt_placeholder')} value={config.ai.titlePrompt || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, titlePrompt: e.target.value } })} />
                                                </div>
                                                <div className={`space-y-4 ${!config.ai.rewriteContent ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.ai.tone_label')}</label>
                                                        <div className="relative">
                                                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                            <select className={`${INPUT_CLASS} pl-10 appearance-none cursor-pointer`} value={config.ai.contentTone || 'neutral'} onChange={e => setConfig({ ...config, ai: { ...config.ai, contentTone: e.target.value } })}>
                                                                <option value="neutral">{t('settings.sections.ai.tones.neutral')}</option>
                                                                <option value="casual">{t('settings.sections.ai.tones.casual')}</option>
                                                                <option value="seo">{t('settings.sections.ai.tones.seo')}</option>
                                                                <option value="clickbait">{t('settings.sections.ai.tones.clickbait')}</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-300">{t('settings.sections.ai.content_prompt_label')}</label>
                                                        <textarea className={`${INPUT_CLASS} min-h-[100px] text-sm leading-relaxed`} placeholder={t('settings.sections.ai.content_prompt_placeholder')} value={config.ai.contentPrompt || ''} onChange={e => setConfig({ ...config, ai: { ...config.ai, contentPrompt: e.target.value } })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SettingsCard>

                                <SettingsCard icon={<ImageIcon className="text-pink-400" size={24} />} title={t('settings.sections.images.title')} description={t('settings.sections.images.desc')}>
                                    <div className="space-y-6">
                                        <Toggle checked={config.images.uploadEnabled} onChange={c => setConfig({ ...config, images: { ...config.images, uploadEnabled: c } })} label={t('settings.sections.images.upload_label')} />
                                        <div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input className={`${INPUT_CLASS} pl-10`} value={config.images.watermarkUrl || ''} onChange={e => setConfig({ ...config, images: { ...config.images, watermarkUrl: e.target.value } })} placeholder={t('settings.sections.images.watermark_placeholder')} /></div>
                                    </div>
                                </SettingsCard>
                            </div>
                        )}

                        {activeTab === 'connections' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SettingsCard icon={<Globe className="text-blue-400" size={24} />} title={t('settings.sections.wordpress.title')} description={t('settings.sections.wordpress.desc')}>
                                    <div className="space-y-4">
                                        <div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input className={`${INPUT_CLASS} pl-10`} value={config.wp.api} onChange={e => setConfig({ ...config, wp: { ...config.wp, api: e.target.value } })} placeholder={t('settings.sections.wordpress.api_placeholder')} /></div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input className={`${INPUT_CLASS} pl-10`} value={config.wp.user} onChange={e => setConfig({ ...config, wp: { ...config.wp, user: e.target.value } })} placeholder={t('settings.sections.wordpress.user_placeholder')} /></div>
                                            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="password" className={`${INPUT_CLASS} pl-10`} value={config.wp.password} onChange={e => setConfig({ ...config, wp: { ...config.wp, password: e.target.value } })} placeholder={t('settings.sections.wordpress.pass_placeholder')} /></div>
                                        </div>

                                        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700 mt-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Database size={20} /></div>
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('settings.sections.seo.stats_label')}</p>
                                                    <p className="text-xl font-bold text-white">{indexedPostsCount} <span className="text-xs font-normal text-gray-500">posts</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button type="button" onClick={handleSeoSync} disabled={syncingSeo} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20">
                                                    {syncingSeo ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                                    {t('settings.sections.seo.stats_btn')}
                                                </button>
                                                <button type="button" onClick={handleTestConnection} disabled={testingWP} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 ${testingWP ? 'opacity-70' : ''}`}>
                                                    {testingWP ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                                                    {testingWP ? t('settings.sections.wordpress.test_conn_btn') : t('settings.sections.wordpress.test_conn_btn')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </SettingsCard>

                                <SettingsCard icon={<Webhook className="text-cyan-400" size={24} />} title={t('settings.sections.integrations.title')} description={t('settings.sections.integrations.desc')}>
                                    <div className="space-y-6">
                                        <Toggle
                                            checked={config.integrations?.webhook?.enabled || false}
                                            onChange={c => setConfig({ ...config, integrations: { ...config.integrations, webhook: { ...config.integrations?.webhook, enabled: c } } })}
                                            label={t('settings.sections.integrations.webhook_enabled_label')}
                                        />
                                        <div className={!config.integrations?.webhook?.enabled ? 'opacity-50 pointer-events-none' : ''}>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.sections.integrations.webhook_url_label')}</label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                    <input
                                                        className={`${INPUT_CLASS} pl-10`}
                                                        value={config.integrations?.webhook?.url || ''}
                                                        onChange={e => setConfig({ ...config, integrations: { ...config.integrations, webhook: { ...config.integrations?.webhook, url: e.target.value } } })}
                                                        placeholder={t('settings.sections.integrations.webhook_url_placeholder')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SettingsCard>
                            </div>
                        )}

                        {activeTab === 'seo' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SettingsCard icon={<Rocket className="text-purple-400" size={24} />} title={t('settings.sections.seo.title')} description={t('settings.sections.seo.desc')}>
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 mb-4">
                                            <h4 className="font-bold text-gray-200 text-sm mb-1">{t('settings.sections.seo.link_building_label')}</h4>
                                            <p className="text-xs text-gray-400 mb-4">{t('settings.sections.seo.link_building_desc')}</p>
                                            <Toggle
                                                checked={config.seo?.linkBuildingEnabled}
                                                onChange={c => setConfig({ ...config, seo: { ...config.seo, linkBuildingEnabled: c } })}
                                                label={t('settings.sections.seo.link_building_label')}
                                            />
                                        </div>
                                    </div>
                                </SettingsCard>

                                <SettingsCard icon={<LineChart className="text-orange-400" size={24} />} title={t('settings.sections.indexing.title')} description={t('settings.sections.indexing.desc')}>
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-gray-200 border-b border-gray-800 pb-2 flex items-center gap-2">
                                                <Globe size={16} className="text-blue-400" /> IndexNow (Bing / Yandex)
                                            </h3>
                                            <Toggle checked={config.indexing?.indexNow?.enabled || false} onChange={c => setConfig({ ...config, indexing: { ...config.indexing, indexNow: { ...config.indexing?.indexNow, enabled: c } } })} label={t('settings.sections.indexing.enabled_label')} />
                                            <div className={!config.indexing?.indexNow?.enabled ? 'opacity-50 pointer-events-none' : ''}>
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <input className={`${INPUT_CLASS} pl-10`} value={config.indexing?.indexNow?.apiKey || ''} onChange={e => setConfig({ ...config, indexing: { ...config.indexing, indexNow: { ...config.indexing?.indexNow, apiKey: e.target.value } } })} placeholder={t('settings.sections.indexing.key_placeholder')} />
                                                    </div>
                                                    <p className="text-xs text-gray-500">{t('settings.sections.indexing.helper_text')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4 border-t border-gray-800">
                                            <h3 className="text-sm font-bold text-gray-200 border-b border-gray-800 pb-2 flex items-center gap-2">
                                                <Zap size={16} className="text-yellow-400" /> SpeedyIndex (Google) <a
                                            href="https://app.speedyindex.com/r/grqnf5"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline font-medium"
                                        >
                                            Get 200 tokens for free
                                        </a>
                                            </h3>
                                            <Toggle checked={config.indexing?.speedyIndex?.enabled || false} onChange={c => setConfig({ ...config, indexing: { ...config.indexing, speedyIndex: { ...config.indexing?.speedyIndex, enabled: c } } })} label={t('settings.sections.indexing.speedy_enabled_label')} />
                                            <div className={!config.indexing?.speedyIndex?.enabled ? 'opacity-50 pointer-events-none' : ''}>
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <input className={`${INPUT_CLASS} pl-10`} value={config.indexing?.speedyIndex?.apiKey || ''} onChange={e => setConfig({ ...config, indexing: { ...config.indexing, speedyIndex: { ...config.indexing?.speedyIndex, apiKey: e.target.value } } })} placeholder="SpeedyIndex API Key" />
                                                    </div>

                                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                                                        <Toggle
                                                            checked={config.indexing?.speedyIndex?.payPerIndexed || false}
                                                            onChange={c => setConfig({ ...config, indexing: { ...config.indexing, speedyIndex: { ...config.indexing?.speedyIndex, payPerIndexed: c } } })}
                                                            label={t('settings.sections.indexing.speedy_pay_label')}
                                                        />
                                                        <p className="text-xs text-yellow-500/70 mt-2 pl-12">
                                                            {t('settings.sections.indexing.speedy_pay_helper')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </SettingsCard>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                <SettingsCard
                                    icon={<FileJson className="text-blue-400" size={24} />}
                                    title={t('settings.sections.backup.title', 'Backup & Restauração')}
                                    description={t('settings.sections.backup.desc', 'Exporte ou importe as configurações e sites. Ideal para migrações.')}
                                >
                                    <div className="space-y-4">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <button
                                                type="button"
                                                onClick={handleExport}
                                                disabled={isExporting}
                                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all ${isExporting
                                                    ? 'bg-blue-500/5 text-blue-500/50 border-blue-500/10 cursor-not-allowed'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                                    }`}
                                            >
                                                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                {t('settings.sections.backup.export_btn', 'Exportar Backup (JSON)')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isImporting}
                                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all ${isImporting
                                                    ? 'bg-emerald-500/5 text-emerald-500/50 border-emerald-500/10 cursor-not-allowed'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                    }`}
                                            >
                                                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                                {t('settings.sections.backup.import_btn', 'Importar Backup')}
                                            </button>

                                            <input
                                                type="file"
                                                accept=".json"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleImportFile}
                                            />
                                        </div>

                                        <p className="text-xs text-gray-500 mt-4 border-l-2 border-gray-700 pl-3">
                                            {t('settings.sections.backup.helper', 'A importação irá sobrescrever configurações existentes e mesclar sites novos. O histórico de logs e posts não é exportado para manter o arquivo leve.')}
                                        </p>
                                    </div>
                                </SettingsCard>

                                <SettingsCard
                                    icon={<AlertTriangle className="text-red-500" size={24} />}
                                    title={t('settings.sections.danger.title')}
                                    description={t('settings.sections.danger.desc')}
                                >
                                    <div className="space-y-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-800">
                                            <div>
                                                <h4 className="font-bold text-orange-400 flex items-center gap-2">
                                                    <Database size={16} /> {t('settings.sections.danger.clear_history_title')}
                                                </h4>
                                                <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                                    {t('settings.sections.danger.clear_history_desc')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleClearHistory}
                                                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                                            >
                                                <Trash2 size={16} /> {t('settings.sections.danger.clear_btn')}
                                            </button>
                                        </div>

                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-red-500 flex items-center gap-2">
                                                    <RotateCcw size={16} /> {t('settings.sections.danger.reset_title')}
                                                </h4>
                                                <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                                    {t('settings.sections.danger.reset_desc')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleFactoryReset}
                                                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all"
                                            >
                                                <AlertTriangle size={16} /> {t('settings.sections.danger.reset_btn')}
                                            </button>
                                        </div>

                                    </div>
                                </SettingsCard>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function SettingsCard({ icon, title, description, children }: any) {
    return (
        <section className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-6 transition-all hover:border-gray-700 shadow-xl">
            <div className="flex items-start gap-4 mb-8 pb-4 border-b border-gray-800">
                <div className="p-3 bg-gray-800 rounded-xl shrink-0 border border-gray-700">{icon}</div>
                <div><h2 className="text-xl font-bold text-gray-100">{title}</h2><p className="text-sm text-gray-400 mt-0.5">{description}</p></div>
            </div>
            <div className="pl-0">{children}</div>
        </section>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-gray-700 shadow-inner'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 transform flex items-center justify-center ${checked ? 'translate-x-6' : 'translate-x-0'}`}>
                    {checked ? <Check size={14} className="text-blue-600" /> : <X size={14} className="text-gray-400" />}
                </div>
            </div>
            <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{label}</span>
        </label>
    );
}