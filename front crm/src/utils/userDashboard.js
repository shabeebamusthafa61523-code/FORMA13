/**
 * Dynamically resolves the primary dashboard path for any logged-in user.
 * Always routes users to the universal Fabtec Operations Dashboard (/dashboard).
 */

export const ALL_DASHBOARD_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', aliases: ['admin dashboard', 'main dashboard', 'superadmin dashboard'] }
];

export const resolveUserDashboardPath = () => {
  return '/dashboard';
};
