import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Global holder for install prompt event so buttons elsewhere in the app can trigger it
let globalDeferredPrompt = null;
const promptListeners = new Set();

const notifyPromptListeners = () => {
  promptListeners.forEach(listener => listener(globalDeferredPrompt));
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyPromptListeners();
  });
}

// Hook to check installability anywhere in the app
export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    setIsIos(isIosDevice);

    const listener = (prompt) => {
      setDeferredPrompt(prompt);
    };

    promptListeners.add(listener);
    return () => {
      promptListeners.delete(listener);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
      return outcome;
    }
    return null;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isStandalone,
    isIos,
    triggerInstall
  };
};

// Bottom Floating Banner / Modal for Mobile Install
export const PwaInstallPrompt = () => {
  const { isInstallable, isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // If running as an installed PWA already, do not show prompt
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    // Check if user dismissed prompt recently (remember for 3 days)
    const dismissedUntil = localStorage.getItem('fabtec_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Show after slight delay to allow smooth page load
    const timer = setTimeout(() => {
      if (isInstallable || isIos) {
        setShowPrompt(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isInstallable, isIos, isStandalone]);

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss for 3 days
    localStorage.setItem('fabtec_pwa_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      setInstalledSuccessfully(true);
      setTimeout(() => setShowPrompt(false), 2000);
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 dark:border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/30 overflow-hidden">
              <img src="/logo2.png" alt="FORMA13 Logo" className="w-9 h-9 object-contain" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  FORMA13 App
                </h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Add to your mobile home screen for fast loading and full-screen app experience.
              </p>

              {installedSuccessfully ? (
                <div className="mt-3 flex items-center gap-2 text-emerald-600 font-semibold text-xs">
                  <Check size={16} /> Added to Home Screen!
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Save to Home Screen</span>
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Not now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* iOS Safari Guide Modal / Popover */}
          {showIosGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2"
            >
              <div className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Smartphone size={14} /> iOS Safari Instructions:
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li className="leading-normal">
                  Tap the <span className="font-bold inline-flex items-center gap-1 text-indigo-600"><Share2 size={12} /> Share</span> button at the bottom of Safari.
                </li>
                <li className="leading-normal">
                  Scroll down and tap <span className="font-bold inline-flex items-center gap-1 text-indigo-600"><PlusSquare size={12} /> Add to Home Screen</span>.
                </li>
                <li className="leading-normal">
                  Tap <span className="font-bold">Add</span> at top right to install.
                </li>
              </ol>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Sidebar / Nav Install Action Button
export const InstallAppSidebarItem = ({ onActionDone }) => {
  const { isInstallable, isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);

  // If already running standalone, show verified status or hide
  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    if (isInstallable) {
      await triggerInstall();
      if (onActionDone) onActionDone();
    } else {
      // In case beforeinstallprompt hasn't fired yet or browser requires menu
      alert("To save FORMA13 to your home screen, open your browser menu (⋮) and select 'Install App' or 'Add to Home screen'.");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-lime-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
        title="Add FORMA13 to Home Screen"
      >
        <Download size={18} className="shrink-0 animate-bounce" />
        <span className="truncate">Add to Home Screen</span>
      </button>

      {/* iOS Modal Helper */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Save on iPhone / iPad</h3>
              <button 
                onClick={() => setShowIosModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Follow these simple steps in Safari to add FORMA13 to your iPhone home screen:
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Tap the <strong>Share</strong> button at bottom center.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <span>Tap <strong>Add</strong> in the top right corner.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaInstallPrompt;
