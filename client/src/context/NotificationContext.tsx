import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';
import { Notification } from '../types';
import toast from 'react-hot-toast';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await api.get('/notifications?limit=50');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();

        // Poll every 60 seconds
        const intervalId = setInterval(fetchNotifications, 60000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const markAsRead = async (id: number) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await api.put(`/notifications/${id}/read`);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            toast.error('Failed to update notification');
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);

            await api.put('/notifications/mark-all-read');
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error('Failed to update notifications');
            fetchNotifications();
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            // Optimistic update
            const notifToDelete = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (notifToDelete && !notifToDelete.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            await api.delete(`/notifications/${id}`);
            toast.success('Notification removed');
        } catch (error) {
            console.error('Failed to delete notification:', error);
            fetchNotifications();
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                isLoading,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                refreshNotifications: fetchNotifications
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
