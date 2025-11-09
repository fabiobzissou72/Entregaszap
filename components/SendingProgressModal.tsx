import React from 'react';
import { Send } from './Icons';

interface SendingProgressModalProps {
    isOpen: boolean;
    progress: number;
    currentInfo: string;
}

const SendingProgressModal: React.FC<SendingProgressModalProps> = ({ isOpen, progress, currentInfo }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Send className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Enviando Lembretes...</h2>
                </div>
                <p className="text-gray-600 mb-2 text-sm h-5">{currentInfo}</p>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    ></div>
                </div>
                <p className="text-right text-lg font-bold text-gray-800">{Math.round(progress)}%</p>
                <p className="text-xs text-gray-500 mt-4 text-center">Por favor, não feche esta janela. O processo pode levar alguns minutos.</p>
            </div>
        </div>
    );
};

export default SendingProgressModal;
