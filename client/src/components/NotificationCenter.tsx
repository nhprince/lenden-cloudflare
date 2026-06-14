import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications?limit=10');
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            await api.patch('/notifications/mark-all-read');
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        if (notif.action_url) {
            navigate(notif.action_url);
            onClose();
        }
    };

    const getNotificationIcon = (type: string) => {
        const icons: Record<string, string> = {
            low_stock: 'inventory_2',
            payment_due: 'payments',
            new_sale: 'point_of_sale',
            system: 'info',
            staff_action: 'group',
            onboarding: 'school'
        };
        return icons[type] || 'notifications';
    };

    const getNotificationColor = (type: string) => {
        const colors: Record<string, string> = {
            low_stock: 'text-red-600 bg-red-50 dark:bg-red-900/20',
            payment_due: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
            new_sale: 'text-green-600 bg-green-50 dark:bg-green-900/20',
            system: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
            staff_action: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
            onboarding: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
        };
        return colors[type] || 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <>
            {/* Notification Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={loading}
                                    className="text-sm text-primary-600 dark:text-primary-400 font-semibold hover:underline disabled:opacity-50"
                                >
                                    {loading ? 'Marking...' : 'Mark all read'}
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <span className="material-symbols-outlined text-5xl mb-2">notifications_off</span>
                                    <p className="text-sm">No notifications</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-lg ${getNotificationColor(notif.type)} flex items-center justify-center flex-shrink-0`}>
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {getNotificationIcon(notif.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                    {notif.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {formatTime(notif.created_at)}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
