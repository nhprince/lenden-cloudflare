import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/Store';

export const SignupScreen: React.FC = () => {
    const { register } = useStore();
    const navigate = useNavigate();
    const [shopName, setShopName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Pass shopName to register
        const success = await register(ownerName, email, password, shopName);
        setLoading(false);
        if (success) {
            setIsSuccess(true);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-text-main dark:text-white antialiased min-h-screen flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-800">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px] text-emerald-600 dark:text-emerald-400 font-bold">mail</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Check your email</h1>
                    <p className="text-[#4e6797] dark:text-gray-400 mb-8 leading-relaxed">
                        We've sent a verification link to <span className="text-primary font-bold">{email}</span>.
                        Please click the link to verify your account and start using Lenden.
                    </p>
                    <div className="space-y-4">
                        <Link
                            to="/"
                            className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            Back to Login
                        </Link>
                        <p className="text-sm text-[#4e6797] dark:text-gray-500">
                            Didn't receive the email? Check your spam folder.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-text-main dark:text-white antialiased min-h-screen flex flex-col">
            <header className="w-full border-b border-[#d0d7e7] dark:border-[#2a3447] bg-surface-light dark:bg-surface-dark px-6 py-4 lg:px-10">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-text-main dark:text-white">Lenden</h2>
                    </div>
                    <div className="hidden sm:flex items-center gap-4">
                        <span className="text-sm font-medium text-[#4e6797] dark:text-gray-400">Already have an account?</span>
                        <Link to="/" className="flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700">Log In</Link>
                    </div>
                </div>
            </header>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark relative overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] rounded-full bg-blue-400/5 blur-3xl pointer-events-none"></div>

                <div className="w-full max-w-[520px] relative z-10">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-text-main dark:text-white sm:text-4xl">Start managing your shop today</h1>
                        <p className="mt-3 text-base text-[#4e6797] dark:text-gray-400">Join thousands of shop owners in Bangladesh managing sales, inventory, and staff with ease.</p>
                    </div>
                    <div className="rounded-xl border border-[#d0d7e7] dark:border-[#2a3447] bg-surface-light dark:bg-surface-dark shadow-sm p-6 sm:p-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-text-main dark:text-white">Shop Name</label>
                                <div className="relative">
                                    <input required value={shopName} onChange={e => setShopName(e.target.value)} className="block w-full rounded-lg border border-[#d0d7e7] bg-background-light px-4 py-3 text-base text-text-main placeholder:text-[#4e6797] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#2a3447] dark:bg-background-dark dark:text-white dark:focus:border-primary" placeholder="e.g. Bhai Bhai Store" type="text" />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#4e6797] dark:text-gray-500"><span className="material-symbols-outlined text-[20px]">storefront</span></div>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-text-main dark:text-white">Owner Name</label>
                                <div className="relative">
                                    <input required value={ownerName} onChange={e => setOwnerName(e.target.value)} className="block w-full rounded-lg border border-[#d0d7e7] bg-background-light px-4 py-3 text-base text-text-main placeholder:text-[#4e6797] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#2a3447] dark:bg-background-dark dark:text-white dark:focus:border-primary" placeholder="e.g. Rahim Uddin" type="text" />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#4e6797] dark:text-gray-500"><span className="material-symbols-outlined text-[20px]">person</span></div>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-text-main dark:text-white">Email Address</label>
                                <div className="relative">
                                    <input required value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-lg border border-[#d0d7e7] bg-background-light px-4 py-3 text-base text-text-main placeholder:text-[#4e6797] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#2a3447] dark:bg-background-dark dark:text-white dark:focus:border-primary" placeholder="name@example.com" type="email" />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#4e6797] dark:text-gray-500"><span className="material-symbols-outlined text-[20px]">mail</span></div>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-text-main dark:text-white">Password</label>
                                <div className="relative">
                                    <input required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-lg border border-[#d0d7e7] bg-background-light px-4 py-3 text-base text-text-main placeholder:text-[#4e6797] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#2a3447] dark:bg-background-dark dark:text-white dark:focus:border-primary" placeholder="Min. 8 characters" type={showPassword ? "text" : "password"} />
                                    <button className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#4e6797] transition hover:text-primary dark:text-gray-500 dark:hover:text-primary" type="button" onClick={() => setShowPassword(!showPassword)}><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                                </div>
                            </div>
                            <button disabled={loading} className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50" type="submit">
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>

                        </form>
                    </div>
                    <p className="mt-8 text-center text-sm text-[#4e6797] dark:text-gray-400 sm:hidden">Already have an account? <Link to="/" className="font-bold text-primary hover:underline">Log in</Link></p>
                    <p className="mt-6 text-center text-xs text-[#4e6797]/70 dark:text-gray-500">By clicking "Create Account", you agree to our <a className="underline hover:text-text-main dark:hover:text-white" href="#">Terms of Service</a> and <a className="underline hover:text-text-main dark:hover:text-white" href="#">Privacy Policy</a>.</p>
                </div>
            </main>
        </div>
    );
};