import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/Store';

export const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { t, user } = useStore();

    useEffect(() => {
        // Check if user exists and has a creation date
        if (!user || !user.created_at) return;

        const accountCreatedAt = new Date(user.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

        // Show modal for first 3 days after account creation
        if (daysSinceCreation < 3) {
            // Check if user has dismissed it today
            const lastDismissed = localStorage.getItem('welcomeModalLastDismissed');
            const today = now.toDateString();

            if (lastDismissed !== today) {
                setIsOpen(true);
            }
        }
    }, [user]);

    const handleClose = () => {
        setIsOpen(false);
        // Store today's date so we don't show it again today
        const today = new Date().toDateString();
        localStorage.setItem('welcomeModalLastDismissed', today);
    };

    const handleAction = (path: string) => {
        handleClose();
        navigate(path);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-surface-dark rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary-600 to-secondary-600 opacity-10"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <span className="material-symbols-outlined text-4xl text-primary-600 dark:text-primary-400">waving_hand</span>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Welcome to Lenden!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                We're excited to have you on board. Here are a few quick steps to get your shop up and running smoothly.
                            </p>

                            <div className="space-y-3 mb-8">
                                <button
                                    onClick={() => handleAction('/products')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">inventory_2</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Add Your First Product</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Start building your inventory</p>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto text-gray-400 group-hover:text-primary-500">arrow_forward</span>
                                </button>

                                <button
                                    onClick={() => handleAction('/settings')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">settings</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Configure Shop Settings</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Set up invoice details & preferences</p>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto text-gray-400 group-hover:text-primary-500">arrow_forward</span>
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg hover:shadow-gray-900/20 transition-all"
                            >
                                Let's Get Started
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
