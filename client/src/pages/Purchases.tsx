import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import { Transaction } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

export const PurchasesScreen: React.FC = () => {
    const { t, shopDetails, language } = useStore();
    const [purchases, setPurchases] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

    const fetchPurchases = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // Fetch transactions and filter for 'purchase'
            const { data } = await api.get('/transactions?limit=100');
            const purchaseList = data.transactions
                .filter((tx: any) => tx.type === 'purchase')
                .map((tx: any) => ({
                    ...tx,
                    vendorName: tx.vendorName || tx.vendor_name || 'N/A',
                    orderId: tx.orderId || tx.id?.toString()
                }));
            setPurchases(purchaseList);
        } catch (error) {
            console.error("Failed to fetch purchases", error);
            toast.error("Failed to load purchases");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, [shopDetails.id]);

    const handlePurchaseClick = async (purchase: Transaction) => {
        try {
            const { data } = await api.get(`/transactions/${purchase.id}`);
            setSelectedPurchase(data);
        } catch (error) {
            toast.error("Failed to load details");
        }
    };

    const filteredPurchases = purchases.filter(p =>
        p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout title={t('recordPurchase' as any) || 'Purchases'}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Search by vendor or order ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Date</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Vendor</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Total</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Paid</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Due</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        </td>
                                    </tr>
                                ) : filteredPurchases.map(purchase => (
                                    <tr key={purchase.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                                            {formatDate(purchase.date, language)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-main dark:text-white">{purchase.vendorName}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{purchase.orderId || `#${purchase.id}`}</div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900 dark:text-white">
                                            {formatCurrency(purchase.amount)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-green-600">
                                            {formatCurrency(purchase.paid_amount || 0)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-500">
                                            {formatCurrency(purchase.due_amount || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handlePurchaseClick(purchase)}
                                                className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 group-hover:text-primary transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredPurchases.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold">
                                            No purchase records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Modal */}
                <AnimatePresence>
                    {selectedPurchase && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                            >
                                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Purchase Details</h3>
                                        <p className="text-sm font-bold text-primary mt-1">{selectedPurchase.orderId || `#${selectedPurchase.id}`}</p>
                                    </div>
                                    <button onClick={() => setSelectedPurchase(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                        <span className="material-symbols-outlined text-gray-500">close</span>
                                    </button>
                                </div>

                                <div className="p-8 overflow-y-auto space-y-8">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Vendor</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{selectedPurchase.vendor_name}</p>
                                            <p className="text-sm text-gray-500">{selectedPurchase.vendor_phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{formatDate(selectedPurchase.date, language)}</p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Purchased Items</p>
                                        <table className="w-full text-left">
                                            <thead className="border-b border-gray-100 dark:border-gray-700">
                                                <tr>
                                                    <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Item</th>
                                                    <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Qty</th>
                                                    <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {selectedPurchase.items?.map((item: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="py-4 font-bold text-gray-900 dark:text-white">{item.product_name}</td>
                                                        <td className="py-4 text-center font-bold">{item.quantity}</td>
                                                        <td className="py-4 text-right font-black">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-500">Subtotal</span>
                                            <span className="font-black text-gray-900 dark:text-white">{formatCurrency(selectedPurchase.amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <span className="font-black text-gray-900 dark:text-white">Amount Paid</span>
                                            <span className="font-black text-green-600">{formatCurrency(selectedPurchase.paid_amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-gray-900 dark:text-white">Due Balance</span>
                                            <span className="font-black text-red-500">{formatCurrency(selectedPurchase.due_amount)}</span>
                                        </div>
                                    </div>

                                    {selectedPurchase.description && (
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Internal Notes</p>
                                            <p className="text-sm p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl text-yellow-800 dark:text-yellow-200">
                                                {selectedPurchase.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};
