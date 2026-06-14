import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/Store';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const ForgotPasswordScreen: React.FC = () => {
    const navigate = useNavigate();
    const { forgotPassword } = useStore();
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState<'email' | 'code'>('email');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(false);

        if (method === 'email') {
            setLoading(true);
            const success = await forgotPassword(email);
            if (success) {
                toast.success("Instructions sent to your email!");
            }
            setLoading(false);
        } else {
            // If using recovery code, we navigate to reset page with the code
            if (!email || !recoveryCode) {
                toast.error("Please enter both email and recovery code");
                return;
            }
            navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(recoveryCode)}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col relative overflow-hidden font-display">
            {/* Background elements omitted for brevity, keeping same style as Login */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        <div className="p-8 sm:p-10">
                            <div className="mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-4 text-primary-600 dark:text-primary-400">
                                    <span className="material-symbols-outlined text-4xl">lock_reset</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred recovery method</p>
                            </div>

                            {/* Method Toggle */}
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                                <button
                                    onClick={() => setMethod('email')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${method === 'email' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Email Link
                                </button>
                                <button
                                    onClick={() => setMethod('code')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${method === 'code' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Recovery Code
                                </button>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                        placeholder="owner@example.com"
                                    />
                                </div>

                                {method === 'code' && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Recovery Code</label>
                                        <input
                                            required
                                            type="text"
                                            value={recoveryCode}
                                            onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                                            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm font-mono tracking-widest uppercase"
                                            placeholder="XXXX-XXXX"
                                        />
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                            If you're a staff member, please contact your shop owner to reset your password.
                                        </p>
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading}
                                    type="submit"
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : method === 'email' ? 'Send Reset Link' : 'Verify Code'}
                                </motion.button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                                <Link to="/" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary-600 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};