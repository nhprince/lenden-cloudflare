import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/Store';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const LoginScreen: React.FC = () => {
    const navigate = useNavigate();
    const { login, resendVerification } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showVerifyAlert, setShowVerifyAlert] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [view, setView] = useState<'login' | 'resend'>('login');

    const handleResend = async () => {
        if (!unverifiedEmail) return;
        setIsResending(true);
        try {
            await resendVerification(unverifiedEmail);
            setShowVerifyAlert(false);
        } finally {
            setIsResending(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const success = await login(email, password);
            if (success) {
                toast.success('Welcome back!');
                setTimeout(() => navigate('/dashboard'), 500);
            }
        } catch (error: any) {
            if (error.response?.data?.needsVerification) {
                setShowVerifyAlert(true);
                setUnverifiedEmail(error.response.data.email || email);
            } else {
                toast.error(error.response?.data?.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/10 dark:bg-secondary-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-300"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/5 dark:bg-accent-500/3 rounded-full blur-3xl animate-pulse-slow animation-delay-500"></div>
            </div>

            {/* Dot Grid Pattern */}
            <div
                className="absolute inset-0 opacity-30 dark:opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            ></div>

            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Logo Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="flex flex-col items-center gap-4 mb-8"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl blur-2xl opacity-60 animate-pulse-slow"></div>
                            <div className="relative w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-600/30 transform hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-white text-[36px] font-bold">storefront</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                Lenden
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                                Premium Shop Management
                            </p>
                        </div>
                    </motion.div>

                    {/* Login Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                    >
                        <div className="p-8 sm:p-10">
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Welcome Back
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Sign in to access your dashboard
                                </p>
                            </div>

                            {/* View Switcher */}
                            {view === 'login' ? (
                                <form className="space-y-5" onSubmit={handleLogin}>
                                    {/* Verification Alert */}
                                    <AnimatePresence>
                                        {showVerifyAlert && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col gap-3">
                                                    <div className="flex gap-3">
                                                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">info</span>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">Verify your email</h4>
                                                            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                                                                Your account is not verified yet. Please check <b>{unverifiedEmail}</b> for a verification link.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={isResending}
                                                        onClick={handleResend}
                                                        className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 flex items-center justify-end gap-1.5 transition-colors disabled:opacity-50"
                                                    >
                                                        {isResending ? 'Sending...' : 'Resend verification link'}
                                                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {/* Email Field */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Email or Username
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-gray-400 text-[20px] group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 transition-colors">
                                                    person
                                                </span>
                                            </div>
                                            <input
                                                required
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm font-medium"
                                                placeholder="Email or Username"
                                                type="text"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Password
                                            </label>
                                            <Link
                                                to="/forgot-password"
                                                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                                            >
                                                Forgot?
                                            </Link>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-gray-400 text-[20px] group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 transition-colors">
                                                    lock
                                                </span>
                                            </div>
                                            <input
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm font-medium"
                                                placeholder="••••••••"
                                                type={showPassword ? "text" : "password"}
                                            />
                                            <button
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember Me */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                id="remember-me"
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 focus:ring-2"
                                            />
                                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                Remember me for 30 days
                                            </label>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Signing in...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Sign In</span>
                                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                            </>
                                        )}
                                    </motion.button>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setView('resend')}
                                            className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Haven't received verification email?
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-5">
                                    <div className="text-center mb-6">
                                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="material-symbols-outlined text-primary-600 dark:text-primary-400">mark_email_unread</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resend Verification</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Enter your email address and we'll send you a new link.
                                        </p>
                                    </div>

                                    <form onSubmit={(e) => { e.preventDefault(); setUnverifiedEmail(email); handleResend(); }}>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Email Address
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-gray-400 text-[20px] group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 transition-colors">
                                                        mail
                                                    </span>
                                                </div>
                                                <input
                                                    required
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm font-medium"
                                                    placeholder="Enter your email"
                                                    type="email"
                                                />
                                            </div>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            disabled={isResending || !email}
                                            className="w-full mt-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isResending ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Sending Link...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Send Verification Link</span>
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                </>
                                            )}
                                        </motion.button>

                                        <button
                                            type="button"
                                            onClick={() => setView('login')}
                                            className="w-full text-center text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mt-4"
                                        >
                                            Back to Login
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-gray-900 px-3 text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                                        New to Lenden?
                                    </span>
                                </div>
                            </div>

                            {/* Sign Up Link */}
                            <Link to="/signup">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full border-2 border-gray-200 dark:border-gray-700 hover:border-primary-600 dark:hover:border-primary-500 bg-white dark:bg-gray-900 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center"
                                >
                                    Create a free account
                                </motion.button>
                            </Link>
                        </div>

                        {/* Security Footer */}
                        <div className="bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-[16px]">lock</span>
                                    <span className="font-medium">256-bit SSL Encryption</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                                    <span className="font-medium">Verified Secure</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Help Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="mt-6 text-center"
                    >
                        <a
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium inline-flex items-center gap-1"
                            href="https://wa.me/8801948558461"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="material-symbols-outlined text-[16px]">help</span>
                            Need help? Contact Support
                        </a>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};
