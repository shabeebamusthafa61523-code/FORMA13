import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ duration = 3000, onComplete }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="forma-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="fixed inset-0 z-99999 flex items-center justify-center select-none"
          style={{ backgroundColor: '#131e06' }}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="w-72 h-72 sm:w-96 sm:h-96 max-w-[85vw] max-h-[75vh] flex items-center justify-center">
              <img
                src="/splash_logo.png"
                alt="FORMA B INTERIORS"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Glowing luxury gold loading progress line */}
            <div className="w-40 sm:w-48 h-1 bg-amber-950/50 rounded-full mt-4 overflow-hidden relative">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-500 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.7)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
