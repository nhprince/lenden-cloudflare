import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Vendor } from '../types';
import { formatCurrency } from '../utils/formatters';

interface VendorPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialVendorId?: string;
    vendorName?: string;
    currentBalance?: number;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialVendorId,
    vendorName,
    currentBalance
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setNotes('');
            setMethod('cash');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!initialVendorId) {
            toast.error('No vendor selected');
            return;
        }

        const payAmount = parseFloat(amount);
        if (!payAmount || payAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setLoading(true);
            await api.post('/transactions/payment-made', {
                vendor_id: initialVendorId,
                amount: payAmount,
                method,
                notes
            });

            toast.success('Payment recorded successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="text-lg font-black text-text-main dark:text-white">Make Payment</h3>
                                {vendorName && (
                                    <p className="text-xs font-bold text-primary mt-0.5">{vendorName}</p>
                                )}
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Balance Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Current Payable</span>
                                <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                                    {formatCurrency(currentBalance || 0)}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Payment Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">৳</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-lg font-black focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cash', 'bkash', 'bank'].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMethod(m)}
                                            className={`py-2 px-3 rounded-lg text-sm font-bold capitalize transition-all border ${method === m
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Reference / Notes</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Check number, Transaction ID, etc."
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">payments</span>
                                            <span>Pay Now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
