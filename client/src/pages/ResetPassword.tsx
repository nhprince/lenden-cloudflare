import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../context/Store';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const ResetPasswordScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { resetPassword } = useStore();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Get params from URL
    const query = new URLSearchParams(location.search);
    const email = query.get('email') || '';
    const token = query.get('token') || '';
    const code = query.get('code') || '';

    useEffect(() => {
        if (!email || (!token && !code)) {
            toast.error("Invalid reset link or code");
            navigate('/');
        }
    }, [email, token, code, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const success = await resetPassword(email, password, token || undefined, code || undefined);
            if (success) {
                toast.success("Password reset successfully! Please login.");
                navigate('/');
            }
        } catch (error) {
            toast.error("Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col relative overflow-hidden font-display">
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        <div className="p-8 sm:p-10">
                            <div className="mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-4 text-primary-600 dark:text-primary-400">
                                    <span className="material-symbols-outlined text-4xl">key</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set New Password</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Please enter your new secure password</p>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">New Password</label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm Password</label>
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading}
                                    type="submit"
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Reset Password'}
                                </motion.button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                                <Link to="/" className="text-sm font-bold text-gray-500 hover:text-primary-600 transition-colors">
                                    Cancel and Return to Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
