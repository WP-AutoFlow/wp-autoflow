import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import {
    Trash2, Play, Plus, Search,
    Server, Activity, Layers,
    CheckCircle2, AlertCircle, RefreshCw, AlertTriangle,
    Rocket, Settings, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/Logo';

export default function Dashboard() {
    const { t } = useTranslation();

    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [running, setRunning] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [newSite, setNewSite] = useState({ domain: '', categoryId: 1 });

    const [wpCategories, setWpCategories] = useState<any[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [catError, setCatError] = useState(false);

    const [confirmAction, setConfirmAction] = useState<{
        type: 'DELETE' | 'RUN_SINGLE' | 'RUN_ALL';
        data?: any;
        isOpen: boolean;
    }>({ type: 'DELETE', isOpen: false });

    const stats = {
        total: sites.length,
        active: sites.filter(s => s.enabled).length,
        errors: sites.filter(s => s.lastError).length,
        queue: t('dashboard.stats.queue_status')
    };

    const fetchSites = async () => {
        try {
            const { data } = await api.get('/sites');
            setSites(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSites(); }, []);

    const openNewSiteModal = async () => {
        setShowModal(true);
        setLoadingCats(true);
        setCatError(false);
        setWpCategories([]);
        setNewSite({ domain: '', categoryId: 0 });

        try {
            const { data } = await api.get('/wp-categories');
            setWpCategories(data);
            if (data.length > 0) {
                setNewSite(prev => ({ ...prev, categoryId: data[0].id }));
            }
        } catch (error) {
            setCatError(true);
            setNewSite(prev => ({ ...prev, categoryId: 1 }));
        } finally {
            setLoadingCats(false);
        }
    };

    const addSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSite.categoryId === 0) {
            toast.warning(t('toasts.select_category'));
            return;
        }

        const promise = api.post('/sites', newSite);

        toast.promise(promise, {
            loading: t('toasts.saving_site'),
            success: () => {
                setShowModal(false);
                fetchSites();
                return t('toasts.site_added');
            },
            error: (err: any) => {
                const code = err.response?.data?.error;
                return code ? t(`errors.${code}`) : t('toasts.site_add_error');
            }
        });
    };

    const toggleSite = async (site: any) => {
        const updatedSites = sites.map(s => s._id === site._id ? { ...s, enabled: !s.enabled } : s);
        setSites(updatedSites);

        try {
            await api.put(`/sites/${site._id}`, { enabled: !site.enabled });
            const msg = !site.enabled ? t('toasts.site_activated') : t('toasts.site_paused');
            toast.success(msg);
        } catch (error: any) {
            fetchSites();
            const code = error.response?.data?.error;
            toast.error(code ? t(`errors.${code}`) : t('toasts.status_error'));
        }
    };

    const confirmDelete = (site: any) => setConfirmAction({ type: 'DELETE', data: site, isOpen: true });
    const confirmRunSingle = (site: any) => setConfirmAction({ type: 'RUN_SINGLE', data: site, isOpen: true });
    const confirmRunAll = () => setConfirmAction({ type: 'RUN_ALL', isOpen: true });

    const handleFinalConfirm = async () => {
        const { type, data } = confirmAction;

        try {
            if (type === 'DELETE') {
                await api.delete(`/sites/${data._id}`);
                toast.success(t('toasts.site_deleted'));
                fetchSites();
            }
            else if (type === 'RUN_SINGLE') {
                await api.post(`/sites/${data._id}/run`);
                toast.success(t('toasts.job_started', { domain: data.domain }));
            }
            else if (type === 'RUN_ALL') {
                setRunning(true);
                await api.post('/actions/run-now');
                toast.success(t('toasts.job_all_started'));
                setRunning(false);
            }
        } catch (error: any) {
            setRunning(false);
            const code = error.response?.data?.error;
            toast.error(code ? t(`errors.${code}`) : t('toasts.action_error'));
        }
    };

    const filteredSites = sites.filter(site =>
        site.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans">
            <header className="bg-gray-900/50 backdrop-blur border-b border-gray-800 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <Logo className="w-10 h-10" textClassName="text-xl" />
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-green-400">{t('common.system_online')}</span>
                        </div>

                        <div className="hidden md:block w-px h-6 bg-gray-800"></div>

                        <div className="flex items-center gap-3">
                            <LanguageSwitcher />

                            <Link
                                to="/settings"
                                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-all text-sm font-medium group"
                                title={t('common.settings')}
                            >
                                <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                                <span className="hidden md:inline">{t('common.settings')}</span>
                            </Link>

                            <Link
                                to="/queue"
                                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-all text-sm font-medium group"
                                title="Fila de Processamento"
                            >
                                <Layers size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline">{t('queue.title')}</span>
                            </Link>

                            <button
                                onClick={() => { localStorage.clear(); window.location.href = '/login' }}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all text-sm font-medium group"
                                title={t('common.logout')}
                            >
                                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="hidden md:inline">{t('common.logout')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard title={t('dashboard.stats.configured_sites')} value={stats.total} icon={<Server size={20} />} color="blue" />
                    <StatCard title={t('dashboard.stats.active_now')} value={stats.active} icon={<Activity size={20} />} color="green" />
                    <StatCard title={t('dashboard.stats.recent_errors')} value={stats.errors} icon={<AlertCircle size={20} />} color="red" />
                    <StatCard title={t('dashboard.stats.queue_status')} value="Wait" icon={<Layers size={20} />} color="purple" />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={openNewSiteModal}
                            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                        >
                            <Plus size={16} /> {t('dashboard.new_site')}
                        </button>

                        <button
                            onClick={confirmRunAll}
                            disabled={running}
                            className={`flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Play size={16} className={running ? 'hidden' : ''} />
                            {running ? <RefreshCw className="animate-spin" size={16} /> : t('dashboard.run_manual')}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400">
                                    <th className="p-4 font-semibold">{t('dashboard.table.domain')}</th>
                                    <th className="p-4 font-semibold">{t('dashboard.table.category')}</th>
                                    <th className="p-4 font-semibold">{t('dashboard.table.recent_status')}</th>
                                    <th className="p-4 font-semibold text-center">{t('dashboard.table.active')}</th>
                                    <th className="p-4 font-semibold text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredSites.map(site => (
                                    <tr key={site._id} className="group hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xs uppercase border border-gray-700">
                                                    {site.domain.replace(/(^\w+:|^)\/\//, '').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-200 text-sm">{site.domain}</p>
                                                    <p className="text-xs text-gray-500">{t('dashboard.table.added_at')}: {new Date(site.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {t('dashboard.table.id')}: <span className="font-mono text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded">{site.categoryId}</span>
                                        </td>
                                        <td className="p-4">
                                            {site.lastError ? (
                                                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded w-fit" title={site.lastError}>
                                                    <AlertCircle size={14} /> {t('dashboard.status.failure')}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded w-fit">
                                                    <CheckCircle2 size={14} /> {t('dashboard.status.stable')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => toggleSite(site)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${site.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${site.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => confirmRunSingle(site)}
                                                    title={t('dashboard.table.tooltip_run')}
                                                    className="text-gray-400 hover:text-blue-400 p-2 rounded hover:bg-blue-500/10 transition-colors group"
                                                >
                                                    <Rocket size={18} className="group-hover:animate-pulse" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(site)}
                                                    title={t('dashboard.table.tooltip_delete')}
                                                    className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSites.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <Server size={48} className="mb-4 opacity-20" />
                                                <p className="text-lg font-medium">{t('dashboard.table.empty_title')}</p>
                                                <p className="text-sm">{t('dashboard.table.empty_desc')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                                <Plus className="text-blue-500" /> {t('modals.add_site.title')}
                            </h2>
                            <p className="text-sm text-gray-400 mb-6">{t('modals.add_site.desc')}</p>

                            <form onSubmit={addSite} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('modals.add_site.url_label')}</label>
                                    <input
                                        type="url" placeholder="https://exemplo.com.br" required
                                        className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600 transition-all"
                                        value={newSite.domain} onChange={e => setNewSite({ ...newSite, domain: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('modals.add_site.cat_label')}</label>

                                    {loadingCats ? (
                                        <div className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg text-gray-400 text-sm flex items-center gap-2 animate-pulse">
                                            <RefreshCw size={14} className="animate-spin" /> {t('modals.add_site.loading_cats')}
                                        </div>
                                    ) : !catError && wpCategories.length > 0 ? (
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-750 transition-all"
                                                value={newSite.categoryId}
                                                onChange={e => setNewSite({ ...newSite, categoryId: parseInt(e.target.value) })}
                                            >
                                                {wpCategories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name} (ID: {cat.id})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                            <p className="mt-1 text-xs text-green-400/80">{t('modals.add_site.cats_success')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input
                                                type="number" placeholder="ID (Ex: 24)" required
                                                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newSite.categoryId} onChange={e => setNewSite({ ...newSite, categoryId: parseInt(e.target.value) })}
                                            />
                                            <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 p-3 rounded text-xs text-yellow-200/90 leading-relaxed">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>{t('modals.add_site.cats_error_title')}</strong> {t('modals.add_site.cats_error_desc')} <Link to="/settings" className="underline font-bold hover:text-white">{t('modals.add_site.cats_error_link')}</Link>.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">{t('common.cancel')}</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all transform active:scale-95">{t('modals.add_site.btn_save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <ConfirmModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                onConfirm={handleFinalConfirm}

                title={
                    confirmAction.type === 'DELETE' ? t('modals.confirm.delete_title') :
                        confirmAction.type === 'RUN_SINGLE' ? t('modals.confirm.run_single_title') :
                            t('modals.confirm.run_all_title')
                }
                description={
                    confirmAction.type === 'DELETE'
                        ? t('modals.confirm.delete_desc', { domain: confirmAction.data?.domain })
                        : confirmAction.type === 'RUN_SINGLE'
                            ? t('modals.confirm.run_single_desc', { domain: confirmAction.data?.domain })
                            : t('modals.confirm.run_all_desc')
                }
                confirmText={confirmAction.type === 'DELETE' ? t('common.yes_delete') : t('common.yes_start')}
                cancelText={t('common.cancel')}
                isDestructive={confirmAction.type === 'DELETE'}
            />
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    const colors: any = {
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        green: "text-green-500 bg-green-500/10 border-green-500/20",
        red: "text-red-500 bg-red-500/10 border-red-500/20",
        purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    };

    return (
        <div className={`p-5 rounded-xl border ${colors[color].replace('text-', 'border-')} bg-gray-900 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold">{title}</h3>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );
}