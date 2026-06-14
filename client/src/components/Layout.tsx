import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../context/Store';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';

interface LayoutProps {
    children?: React.ReactNode;
    title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title = 'Lenden' }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const activePath = location.pathname;
    const { user, logout, t, language, setLanguage, shopDetails, can } = useStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { unreadCount } = useNotifications();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [searchFocused, setSearchFocused] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const NavLink = ({ to, icon, label, badge }: { to: string, icon: string, label: string, badge?: string }) => {
        const isActive = activePath === to;
        return (
            <Link to={to} className="group relative">
                <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    {isActive && (
                        <motion.span
                            layoutId="activeTab"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    )}
                    <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${isActive ? 'fill-current' : 'group-hover:scale-110'}`}>
                        {icon}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                    {badge && (
                        <span className="ml-auto bg-danger-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </motion.div>
            </Link>
        );
    };

    const sidebarVariants = {
        open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
        closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } }
    } as const;

    return (
        <div className="font-display bg-gradient-to-br from-background-light via-gray-50 to-gray-100 dark:from-background-dark dark:via-gray-950 dark:to-gray-900 text-text-main dark:text-white antialiased h-screen flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={!isMobile ? "open" : (isSidebarOpen ? "open" : "closed")}
                variants={sidebarVariants}
                className={`
                    fixed md:static inset-y-0 left-0 z-50 w-72 
                    bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                    border-r border-gray-200 dark:border-gray-800 
                    flex flex-col h-full shadow-2xl md:shadow-none
                    ${isSidebarOpen ? '' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white/50 dark:bg-gray-900/50">
                    <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl blur-md opacity-75"></div>
                            <div className="relative bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-2.5 shadow-lg">
                                <span className="material-symbols-outlined text-white text-2xl font-bold">storefront</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-gray-900 dark:text-white text-xl font-bold tracking-tight">Lenden</h1>
                            <p className="text-primary-600 dark:text-primary-400 text-[10px] uppercase font-bold tracking-wider">Premium Manager</p>
                        </div>
                    </motion.div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col scrollbar-thin">
                    {/* Main Navigation */}
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-3 px-2">
                            Main Menu
                        </p>
                        <nav className="space-y-1">
                            <NavLink to="/dashboard" icon="dashboard" label={t('dashboard')} />
                            <NavLink to="/pos" icon="point_of_sale" label={t('pos')} />
                            <NavLink to="/products" icon="inventory_2" label={t('inventory')} />
                            <NavLink to="/purchases" icon="shopping_bag" label={t('purchases' as any) || 'Purchases'} />
                            <NavLink to="/transactions" icon="receipt_long" label={t('transactions')} />
                        </nav>
                    </div>

                    {/* Secondary Navigation */}
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-3 px-2">
                            Operations
                        </p>
                        <nav className="space-y-1">
                            <NavLink to="/expenses" icon="payments" label={t('expenses' as any) || 'Expenses'} />
                            <NavLink to="/trips" icon="directions_car" label={t('trips' as any) || 'Trips'} />
                            <NavLink to="/customers" icon="people" label={t('customers')} />
                            {can('manage_vendors') && <NavLink to="/vendors" icon="store" label={t('vendors' as any) || 'Vendors'} />}
                            <NavLink to="/services" icon="home_repair_service" label={t('services' as any) || 'Services'} />
                            {can('manage_staff') && <NavLink to="/staff" icon="badge" label={t('staff' as any) || 'Staff'} />}
                            {can('view_reports') && <NavLink to="/reports" icon="bar_chart" label={t('reports')} />}
                        </nav>
                    </div>

                    {/* User Profile Section */}
                    <div className="mt-auto pt-6 px-2">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-3">
                            Account
                        </p>
                        <nav className="space-y-1 mb-4">
                            {can('manage_shop_settings') && <NavLink to="/settings" icon="settings" label={t('settings')} />}
                        </nav>

                        {/* User Card */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-soft"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 p-0.5">
                                        <img
                                            src={user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user?.name}
                                            alt="Avatar"
                                            className="w-full h-full rounded-[10px] object-cover bg-white dark:bg-gray-800"
                                        />
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {user?.name || 'Guest User'}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate capitalize">
                                        {user?.role || 'Viewer'}
                                    </p>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/30 hover:bg-danger-100 dark:hover:bg-danger-900/40 transition-all border border-danger-200 dark:border-danger-900/50"
                                aria-label="Logout"
                            >
                                <span className="material-symbols-outlined text-[16px]">logout</span>
                                <span>{t('logout')}</span>
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                {/* Top Navbar */}
                <header className="h-20 flex items-center justify-between px-6 sm:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 z-30 sticky top-0 flex-shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all hover:bg-primary-50 dark:hover:bg-primary-950/30 border border-gray-200 dark:border-gray-700"
                            aria-label="Open Request Sidebar"
                        >
                            <span className="material-symbols-outlined text-[22px]">menu</span>
                        </motion.button>
                        <div className="hidden sm:block">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                                {shopDetails?.name && (
                                    <button
                                        onClick={() => navigate('/select-shop')}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[10px] font-black rounded-full border border-primary-100 dark:border-primary-900/50 hover:bg-primary-100 transition-all group"
                                        aria-label={`Switch Shop (${shopDetails.name})`}
                                    >
                                        <span className="material-symbols-outlined text-[14px] font-light group-hover:rotate-180 transition-transform duration-500">sync_alt</span>
                                        {shopDetails.name}
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-pulse"></span>
                                Lenden Cloud Dashboard
                            </p>
                        </div>
                        <div className="sm:hidden flex flex-col min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">{title}</h2>
                            {shopDetails?.name && (
                                <button
                                    onClick={() => navigate('/select-shop')}
                                    className="flex items-center gap-1 text-[10px] font-bold text-primary-600 truncate"
                                    aria-label={`Switch Shop (${shopDetails.name})`}
                                >
                                    <span className="material-symbols-outlined text-[12px]">sync_alt</span>
                                    {shopDetails.name}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group shadow-sm bg-white dark:bg-gray-900"
                            aria-label={`Switch Language to ${language === 'en' ? 'Bengali' : 'English'}`}
                        >
                            <span className="material-symbols-outlined text-[18px] text-gray-600 dark:text-gray-400 group-hover:rotate-180 transition-transform duration-500">
                                language
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                {language}
                            </span>
                        </motion.button>



                        <div className="relative">
                            <NotificationBell />
                        </div>

                        <Link to="/pos">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                <span className="hidden sm:inline">{t('newSale')}</span>
                            </motion.button>
                        </Link>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {children || <Outlet />}
                    </motion.div>
                </div>
            </main>
        </div >
    );
};
