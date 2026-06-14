import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock': return 'inventory_2';
            case 'overdue_payment': return 'warning';
            case 'payment_received': return 'payments';
            case 'new_sale':
            case 'transaction': return 'shopping_cart';
            case 'daily_report': return 'assessment';
            case 'password_reset': return 'lock_reset';
            case 'system': return 'info';
            case 'onboarding': return 'flag';
            default: return 'notifications';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'low_stock': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
            case 'overdue_payment': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
            case 'payment_received': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
            case 'new_sale':
            case 'transaction': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
            case 'daily_report': return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
            case 'password_reset': return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
            default: return 'text-primary-500 bg-primary-100 dark:bg-primary-900/30';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Notifications"
            >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-2xl">
                    notifications
                </span>

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 transform scale-100 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group relative ${!notification.is_read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${getColor(notification.type)}`}>
                                                    <span className="material-symbols-outlined text-xl">
                                                        {getIcon(notification.type)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all self-start text-gray-400 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="absolute top-4 right-4 h-2 w-2 bg-primary-500 rounded-full"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
