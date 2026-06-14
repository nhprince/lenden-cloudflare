import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { Vendor, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useStore } from '../context/Store';

interface VendorHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    vendor: Vendor;
}

export const VendorHistoryModal: React.FC<VendorHistoryModalProps> = ({ isOpen, onClose, vendor }) => {
    const { t } = useStore();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && vendor.id) {
            fetchHistory();
        }
    }, [isOpen, vendor.id]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/vendors/${vendor.id}`);
            // getVendorDetails returns { ...vendor, history: [...] }
            setHistory(res.data.history || []);
        } catch (error) {
            console.error("Failed to fetch vendor history", error);
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
                        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('vendorHistory' as any) || 'Vendor History'}</h3>
                                <p className="text-sm font-bold text-primary mt-1">{vendor.name}</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <span className="material-symbols-outlined text-[24px] text-gray-500">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <span className="material-symbols-outlined text-5xl mb-4">history</span>
                                    <p className="font-bold">No transaction history found for this vendor.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:shadow-md transition-all flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${tx.type === 'purchase'
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                                                    }`}>
                                                    <span className="material-symbols-outlined">
                                                        {tx.type === 'purchase' ? 'inventory_2' : 'payments'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 dark:text-white capitalize">
                                                        {tx.type.replace('_', ' ')}
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-500 mt-0.5">
                                                        {new Date(tx.date).toLocaleDateString()} • {tx.payment_method?.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-black text-lg ${tx.type === 'purchase' ? 'text-blue-600' : 'text-green-600'
                                                    }`}>
                                                    {tx.type === 'purchase' ? '-' : '+'}{formatCurrency(tx.amount)}
                                                </div>
                                                {tx.due_amount > 0 && (
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-0.5">
                                                        Due: {formatCurrency(tx.due_amount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Summary Footer */}
                        {!loading && history.length > 0 && (
                            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Balance Payable</p>
                                    <p className="text-2xl font-black text-red-500">{formatCurrency(vendor.payable || 0)}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                                >
                                    Close History
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
