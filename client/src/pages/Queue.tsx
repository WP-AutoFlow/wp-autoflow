import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, RefreshCw, Trash2, RotateCcw,
    CheckCircle2, XCircle, Clock, PlayCircle, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export default function Queue() {
    const { t } = useTranslation();
    const [counts, setCounts] = useState<any>({});
    const [jobs, setJobs] = useState<any[]>([]);
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, jobsRes] = await Promise.all([
                api.get('/queue/stats'),
                api.get(`/queue/jobs/${status}`)
            ]);
            setCounts(statsRes.data);
            setJobs(jobsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRetry = async (id: string) => {
        try {
            await api.post(`/queue/retry/${id}`);
            toast.success('Job recolocado na fila!');
            fetchData();
        } catch (e) {
            toast.error('Erro ao retentar job.');
        }
    };

    const handleClean = async () => {
        if (!confirm('Limpar lista? Isso apaga o histórico.')) return;
        try {
            await api.post(`/queue/clean/${status}`);
            toast.success('Lista limpa.');
            fetchData();
        } catch (e) {
            toast.error('Erro ao limpar.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans p-6">
            <div className="max-w-6xl mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                {t('queue.title')}
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            </h1>
                            <p className="text-gray-400 text-sm">{t('queue.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <LanguageSwitcher />
                        <button onClick={fetchData} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors" title={t('queue.actions.refresh')}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <StatusTab
                        active={status === 'active'}
                        onClick={() => setStatus('active')}
                        label={t('queue.tabs.active')}
                        count={counts.active || 0}
                        icon={<PlayCircle size={18} />}
                        color="text-blue-400" border="border-blue-500/50" bg="bg-blue-500/10"
                    />
                    <StatusTab
                        active={status === 'waiting'}
                        onClick={() => setStatus('waiting')}
                        label={t('queue.tabs.waiting')}
                        count={counts.waiting || 0}
                        icon={<Clock size={18} />}
                        color="text-yellow-400" border="border-yellow-500/50" bg="bg-yellow-500/10"
                    />
                    <StatusTab
                        active={status === 'failed'}
                        onClick={() => setStatus('failed')}
                        label={t('queue.tabs.failed')}
                        count={counts.failed || 0}
                        icon={<XCircle size={18} />}
                        color="text-red-400" border="border-red-500/50" bg="bg-red-500/10"
                    />
                    <StatusTab
                        active={status === 'completed'}
                        onClick={() => setStatus('completed')}
                        label={t('queue.tabs.completed')}
                        count={counts.completed || 0}
                        icon={<CheckCircle2 size={18} />}
                        color="text-green-400" border="border-green-500/50" bg="bg-green-500/10"
                    />
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl min-h-[400px]">
                    <div className="bg-gray-800/50 p-4 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Showing the last 100 jobs
                        </span>
                        {(status === 'completed' || status === 'failed') && (
                            <button onClick={handleClean} className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors">
                                <Trash2 size={14} /> {t('queue.actions.clean')}
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-gray-800">
                        {jobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <Layers size={48} className="mb-4 opacity-20" />
                                <p>{t('queue.empty')}</p>
                            </div>
                        ) : (
                            jobs.map((job) => (
                                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-mono text-xs text-gray-500">#{job.id}</span>
                                            <h3 className="font-medium text-white truncate pr-4">
                                                {job.name === 'dispatch-sites'
                                                    ? '🤖 Maestro (Orquestrador)'
                                                    : (job.data?.domain || job?.domain || 'Desconhecido')}
                                            </h3>                                        </div>
                                        <div className="text-xs text-gray-400 flex gap-4">
                                            <span>Attempts: {job.attemptsMade}</span>
                                            {job.finishedOn && <span>Finished: {new Date(job.finishedOn).toLocaleTimeString()}</span>}
                                            {job.failedReason && <span className="text-red-400 truncate max-w-md" title={job.failedReason}>Erro: {job.failedReason}</span>}
                                        </div>
                                    </div>

                                    {status === 'failed' && (
                                        <button
                                            onClick={() => handleRetry(job.id)}
                                            className="p-2 text-gray-500 hover:text-white bg-gray-800 hover:bg-blue-600 rounded-lg transition-all"
                                            title={t('queue.actions.retry')}
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatusTab({ active, onClick, label, count, icon, color, border, bg }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                relative p-4 rounded-xl border transition-all duration-200 text-left
                ${active ? `${bg} ${border} ring-1 ring-inset ring-white/10` : 'bg-gray-900 border-gray-800 hover:bg-gray-800'}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className={`${active ? color : 'text-gray-500'}`}>
                    {icon}
                </div>
                <span className={`text-2xl font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
                    {count}
                </span>
            </div>
            <span className={`text-xs font-medium uppercase tracking-wider ${active ? color : 'text-gray-500'}`}>
                {label}
            </span>
        </button>
    );
}