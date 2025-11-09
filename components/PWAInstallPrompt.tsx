import React, { useEffect, useState } from 'react';
import { X, Download } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Verifica se o usuário já dispensou o prompt antes
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Mostrar botão manual após 3 segundos se não for instalado
    const timer = setTimeout(() => {
      // Verifica se já está instalado
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInstalled) {
        setShowManualButton(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Salva que o usuário dispensou (válido por 7 dias)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', expiryDate.toISOString());
  };

  const handleManualInstall = () => {
    if (deferredPrompt) {
      // Android/Chrome - usa o prompt nativo
      handleInstallClick();
    } else {
      // iOS/Safari - mostra instruções
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Para instalar no iOS:\n\n1. Toque no ícone de compartilhar\n2. Role e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"');
      } else {
        alert('Para instalar:\n\nNo menu do navegador (⋮), selecione "Instalar aplicativo" ou "Adicionar à tela inicial"');
      }
    }
  };

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-slide-up">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <img
                    src="/logo/icon-192x192.png"
                    alt="Entregas ZAP"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base">Instalar Entregas ZAP</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Acesso rápido ao app</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Instale o aplicativo na sua tela inicial para acesso rápido e experiência completa, mesmo offline.
            </p>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download size={18} />
                <span>Instalar</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão fixo de instalação manual */}
      {showManualButton && !showPrompt && (
        <button
          onClick={handleManualInstall}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-40"
          title="Instalar App"
        >
          <Download size={24} />
        </button>
      )}
    </>
  );
}
