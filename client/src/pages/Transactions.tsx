import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import { Transaction } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/export';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import OverdueAlertModal from '../components/OverdueAlertModal';

export const TransactionsScreen = () => {
    const { t, shopDetails, invoiceSettings, language } = useStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
    const [showOverdueAlert, setShowOverdueAlert] = useState(false);
    const [overdueTransactions, setOverdueTransactions] = useState<Transaction[]>([]);

    const fetchTransactions = async (offset = 0) => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await api.get(`/transactions?limit=50&offset=${offset}`);
            const mappedTransactions = data.transactions.map((t: any) => ({
                ...t,
                customerName: t.customerName || t.customer_name || 'Walk-in',
                orderId: t.orderId || t.id?.toString()
            }));
            if (offset === 0) {
                setTransactions(mappedTransactions);

                // Check for overdue transactions
                const overdue = mappedTransactions.filter((t: Transaction) =>
                    t.status === 'Pending' &&
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    (t.amount - (t.paid_amount || 0)) > 0
                );

                if (overdue.length > 0) {
                    setOverdueTransactions(overdue);
                    setShowOverdueAlert(true);
                }
            } else {
                setTransactions(prev => [...prev, ...mappedTransactions]);
            }
            setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions(0);
    }, [shopDetails.id]);

    const fetchTransactionDetails = async (id: string) => {
        try {
            const { data } = await api.get(`/transactions/${id}`);
            setSelectedTransaction(data);
        } catch (error) {
            console.error("Failed to fetch transaction details", error);
            toast.error("Failed to load transaction details");
        }
    };

    const handleTransactionClick = (transaction: Transaction) => {
        fetchTransactionDetails(transaction.id);
    };

    const isOverdue = (dateString: string, status: string, dueDate?: string) => {
        if (status === 'Completed') return false;
        if (dueDate) {
            return new Date(dueDate) < new Date();
        }
        // Fallback to old logic if no due date
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 30;
    };

    const handleExport = () => {
        if (transactions.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = transactions.map(t => ({
            'Order ID': t.orderId || t.id,
            'Customer': t.customerName || 'Walk-in',
            'Date': new Date(t.date).toLocaleString(),
            'Total Amount': t.amount,
            'Paid Amount': t.paid_amount || 0,
            'Due Amount': t.due_amount || 0,
            'Status': t.status,
            'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'
        }));
        exportToCSV(exportData, 'transactions');
    };

    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const handleMarkPaid = async () => {
        if (selectedTransaction) {
            try {
                await api.put(`/transactions/${selectedTransaction.id}/status`, { status: 'Completed' });
                toast.success("Transaction marked as completed");
                setSelectedTransaction({ ...selectedTransaction, status: 'Completed' });
                fetchTransactions(0);
            } catch (error) {
                console.error("Failed to update status", error);
                toast.error("Failed to update status");
            }
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const search = searchTerm.toLowerCase();
        const orderId = (t.orderId || t.id || '').toString().toLowerCase();
        const customerName = (t.customerName || (t as any).customer_name || 'Walk-in').toLowerCase();
        return orderId.includes(search) || customerName.includes(search);
    });

    return (
        <Layout title={t('transactions')}>
            <OverdueAlertModal
                isOpen={showOverdueAlert}
                onClose={() => setShowOverdueAlert(false)}
                overdueTransactions={overdueTransactions}
            />
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {/* Printable Invoice Component */}
                {selectedTransaction && (
                    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black">
                        <div className="max-w-3xl mx-auto border-2 border-gray-800 p-8">
                            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
                                <div className="flex gap-4">
                                    {invoiceSettings.showLogo && shopDetails.logoUrl && (
                                        <img src={shopDetails.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                                    )}
                                    <div>
                                        <h1 className="text-4xl font-bold uppercase tracking-wide">{shopDetails.name}</h1>
                                        <p className="text-gray-600 mt-2 whitespace-pre-line">{shopDetails.address}</p>
                                        <p className="text-gray-600">Phone: {shopDetails.phone}</p>
                                        <p className="text-gray-600">Email: {shopDetails.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-2xl font-bold text-gray-400">{invoiceSettings.headerTitle}</h2>
                                    <p className="font-bold text-xl mt-2">#{selectedTransaction.orderId || selectedTransaction.id}</p>
                                    <p className="text-gray-600">Date: {new Date(selectedTransaction.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="font-bold text-gray-500 mb-2 uppercase text-sm">Bill To:</h3>
                                <p className="text-xl font-bold">{selectedTransaction.customer_name || 'Walking Customer'}</p>
                                {selectedTransaction.customer_phone && <p>{selectedTransaction.customer_phone}</p>}
                                {selectedTransaction.customer_address && <p>{selectedTransaction.customer_address}</p>}
                            </div>

                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b-2 border-gray-800">
                                        <th className="text-left py-2 font-bold uppercase text-sm">Description</th>
                                        <th className="text-right py-2 font-bold uppercase text-sm">Qty</th>
                                        <th className="text-right py-2 font-bold uppercase text-sm">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedTransaction.items || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-gray-300">
                                            <td className="py-3">{item.product_name || item.service_name}</td>
                                            <td className="text-right py-3">{item.quantity}</td>
                                            <td className="text-right py-3">৳ {item.subtotal.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end mb-12">
                                <div className="w-1/2">
                                    <div className="flex justify-between py-2 border-b border-gray-300">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold text-xl">৳ {selectedTransaction.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="font-medium text-gray-500">Paid Amount</span>
                                        <span>৳ {selectedTransaction.paid_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="font-medium text-gray-500">Due Amount</span>
                                        <span className="font-bold">৳ {selectedTransaction.due_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center text-gray-500 text-sm mt-12 pt-8 border-t border-gray-200">
                                <p className="font-bold mb-2">{invoiceSettings.footerNote}</p>
                                <p className="text-xs whitespace-pre-wrap">{invoiceSettings.terms}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {selectedTransaction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden overflow-y-auto">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg overflow-hidden my-auto relative">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <h3 className="text-lg font-bold text-text-main dark:text-white">#{selectedTransaction.orderId || selectedTransaction.id}</h3>
                                    <p className="text-sm text-text-muted">{formatDate(selectedTransaction.date, language, true)}</p>
                                </div>
                                <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {isOverdue(selectedTransaction.date, selectedTransaction.status) && (
                                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                                        <div>
                                            <h4 className="font-bold text-red-800 dark:text-red-300 text-sm">{t('paymentOverdue')}</h4>
                                            <p className="text-red-600 dark:text-red-400 text-xs mt-1">{t('overdueMessage')}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-text-muted">{t('customer')}</span>
                                        <span className="font-medium text-text-main dark:text-white">{selectedTransaction.customer_name || 'Walking Customer'}</span>
                                    </div>
                                    <div className="border-b border-gray-100 dark:border-gray-800 py-3">
                                        <span className="text-text-muted block mb-2">{t('items')}</span>
                                        <div className="space-y-2">
                                            {(selectedTransaction.items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span>{item.product_name || item.service_name} x {item.quantity}</span>
                                                    <span>৳{(item.subtotal).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-text-muted">{t('total')}</span>
                                        <span className="font-bold text-lg text-primary">৳{selectedTransaction.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-text-muted">{t('status')}</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedTransaction.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {t(selectedTransaction.status.toLowerCase() as any)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button onClick={handlePrint} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-text-muted hover:bg-gray-50 dark:hover:bg-gray-700">{t('printReceipt')}</button>
                                    <button onClick={() => generateInvoicePDF(selectedTransaction, shopDetails, invoiceSettings)} className="flex-1 py-2.5 border border-primary text-primary rounded-lg font-medium hover:bg-primary/5">
                                        Download PDF
                                    </button>
                                    {selectedTransaction.status !== 'Completed' && (
                                        <button onClick={handleMarkPaid} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90">{t('markPaid')}</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-white">{t('transactions')}</h2>
                        <p className="text-text-muted">{t('recentTransactions')}</p>
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm w-full sm:w-64 focus:ring-2 focus:ring-primary/50"
                            placeholder={t('search')}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-text-muted hover:text-primary transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>{t('export')}</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
                        <table className="w-full text-left min-w-[800px] border-collapse h-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('orderId')}</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('customer')}</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('date')}</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Due Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Paid Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('total')}</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('status')}</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.map(transaction => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => handleTransactionClick(transaction)}>
                                        <td className="px-6 py-4 font-medium text-text-main dark:text-white">#{transaction.orderId || transaction.id}</td>
                                        <td className="px-6 py-4 text-text-muted">{transaction.customerName || 'Walking Customer'}</td>
                                        <td className="px-6 py-4 text-sm text-text-muted">{formatDate(transaction.date, language)}</td>
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            {transaction.due_date ? (
                                                <span className={`${isOverdue(transaction.date, transaction.status, transaction.due_date) ? 'text-red-600 font-bold' : ''}`}>
                                                    {formatDate(transaction.due_date, language)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-text-main dark:text-white">৳{(transaction.paid_amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-text-main dark:text-white">৳{(transaction.amount || transaction.total).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {t(transaction.status?.toLowerCase() as any)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 hover:text-primary p-1">
                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-text-muted">
                                            No transactions found matching "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {pagination.hasMore && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
                            <button
                                onClick={() => fetchTransactions(pagination.offset + pagination.limit)}
                                className="text-primary font-bold text-sm hover:underline"
                                disabled={loading}
                            >
                                {loading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div></Layout>
    );
};