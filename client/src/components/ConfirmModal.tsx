import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export function ConfirmModal({
    isOpen, onClose, onConfirm,
    title, description,
    confirmText = "Confirmar", cancelText = "Cancelar",
    isDestructive = false
}: ConfirmModalProps) {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 relative transform transition-all scale-100">

                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="flex gap-4">
                    <div className={`p-3 rounded-full h-fit shrink-0 ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        <AlertTriangle size={24} />
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            {description}
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                {cancelText}
                            </button>

                            <button
                                onClick={() => { onConfirm(); onClose(); }}
                                className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-lg transition-all transform active:scale-95 ${isDestructive
                                        ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}