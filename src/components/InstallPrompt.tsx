import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone || sessionStorage.getItem('fizzypdf_install_dismissed') === 'true') {
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    setIsIos(iosDevice);

    if (iosDevice) {
      const timer = setTimeout(() => setShowPopup(true), 1200);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPopup(true);
    };

    const handleAppInstalled = () => {
      setShowPopup(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPopup(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('fizzypdf_install_dismissed', 'true');
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm mx-auto sm:mx-0 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-xl p-4">
      <div className="flex items-start gap-3">
        <img
          src="/pdflogo.jpg"
          alt="FizzyPDF Editor"
          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                Install App
              </p>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                FizzyPDF Editor
              </h3>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {isIos ? (
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Safari mein <span className="inline-flex items-center align-middle mx-0.5"><Share size={13} /></span>{' '}
              <strong>Share</strong> par tap karein aur{' '}
              <strong>“Add to Home Screen”</strong> chunein.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Fast access aur app-like experience ke liye apne phone par install karein.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-sm transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Install Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}