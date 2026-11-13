export const AMOUNT_STATUSES = [
  'Beginning Stage',
  'Pending',
  'Urgent',
  'WIP',
  'Completed'
];

export const AMOUNT_STATUS_CONFIG = {
  'Beginning Stage': {
    label: 'Beginning Stage',
    rowBg: 'bg-sky-50/65 dark:bg-sky-950/25 hover:bg-sky-100/75 dark:hover:bg-sky-900/35 border-l-sky-500',
    badge: 'bg-sky-100/90 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800/80',
    dot: 'bg-sky-500'
  },
  'Pending': {
    label: 'Pending',
    rowBg: 'bg-yellow-50/80 dark:bg-yellow-950/25 hover:bg-yellow-100/90 dark:hover:bg-yellow-900/35 border-l-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80',
    dot: 'bg-yellow-400'
  },
  'Urgent': {
    label: 'Urgent',
    rowBg: 'bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100/90 dark:hover:bg-red-900/40 border-l-red-500',
    badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/80',
    dot: 'bg-red-500'
  },
  'WIP': {
    label: 'WIP',
    rowBg: 'bg-purple-50/70 dark:bg-purple-950/25 hover:bg-purple-100/80 dark:hover:bg-purple-900/35 border-l-purple-500',
    badge: 'bg-purple-100/90 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800/80',
    dot: 'bg-purple-500'
  },
  'Completed': {
    label: 'Completed',
    rowBg: 'bg-emerald-50/65 dark:bg-emerald-950/25 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/35 border-l-emerald-500',
    badge: 'bg-emerald-100/90 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500'
  }
};
