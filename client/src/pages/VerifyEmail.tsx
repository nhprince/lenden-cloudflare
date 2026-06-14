import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export const VerifyEmailScreen: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const { data } = await api.get(`/auth/verify-email/${token}`);
                setStatus('success');
                setMessage(data.message);
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
            }
        };

        if (token) {
            verifyToken();
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                        <h1 className="text-2xl font-bold text-slate-900">Verifying Email...</h1>
                        <p className="text-slate-600">Please wait while we confirm your account.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <span className="material-symbols-outlined text-[80px] text-emerald-500">check_circle</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Email Verified!</h1>
                            <p className="text-slate-600 font-medium">{message}</p>
                            <p className="text-sm text-slate-500 italic">Welcome to the Lenden family.</p>
                        </div>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            Continue to Login
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <span className="material-symbols-outlined text-[80px] text-rose-500">cancel</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Verification Failed</h1>
                            <p className="text-rose-600 font-medium">{message}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all border border-slate-200"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-8 text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} Lenden POS. All rights reserved.
            </p>
        </div>
    );
};

