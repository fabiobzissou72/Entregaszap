import React from 'react';
import { X, Trash2 } from './Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Confirmar Exclusão'
}) => {
    if (!isOpen) return null;

    // Using a keydown event listener for accessibility (e.g., closing with Escape key)
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 animate-fade-in" 
            aria-labelledby="confirmation-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all animate-fade-in-up">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Trash2 className="text-red-600" size={24} />
                        </div>
                        <h2 id="confirmation-modal-title" className="text-xl font-bold text-gray-800">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Fechar modal">
                        <X size={24} />
                    </button>
                </div>
                <div className="pl-0 sm:pl-[60px]">
                    <p className="text-gray-600 mb-8">{message}</p>
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <button onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm hover:shadow-md">
                            <Trash2 size={18} />
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
