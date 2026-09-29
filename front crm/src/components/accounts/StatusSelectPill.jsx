import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const STATUS_OPTIONS = [
  {
    value: 'PENDING',
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
    dotClass: 'bg-amber-500',
    hoverClass: 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300'
  },
  {
    value: 'PARTIALLY_PAID',
    label: 'Partially Paid',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700',
    dotClass: 'bg-sky-500',
    hoverClass: 'hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-800 dark:text-sky-300'
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
    dotClass: 'bg-emerald-500',
    hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
  }
];

const StatusSelectPill = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const currentVal = value || 'PENDING';
  const currentOpt = STATUS_OPTIONS.find(
    opt => opt.value === currentVal || (currentVal === 'APPROVED' && opt.value === 'COMPLETED')
  ) || STATUS_OPTIONS[0];

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 125;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const dropdownWidth = 145;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = Math.max(10, rect.right - dropdownWidth);
    }

    setDropdownCoords({
      top: openUpward ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
      left: left,
      openUpward
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    setIsOpen(false);
    if (val !== currentVal && onChange) {
      onChange(val);
    }
  };

  return (
    <div className={`inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black border tracking-wide shadow-2xs transition-all duration-150 cursor-pointer ${currentOpt.badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentOpt.dotClass} animate-pulse`} />
        <span>{currentOpt.label}</span>
        <ChevronDown size={11} className={`opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              zIndex: 999999
            }}
            className="min-w-[145px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1 space-y-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
          >
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = opt.value === currentVal || (currentVal === 'APPROVED' && opt.value === 'COMPLETED');
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${opt.hoverClass} ${
                    isSelected ? 'bg-slate-100 dark:bg-slate-800 font-extrabold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-slate-600 dark:text-slate-300" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default StatusSelectPill;
