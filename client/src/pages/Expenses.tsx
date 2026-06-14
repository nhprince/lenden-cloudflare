import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/export';

export const ExpensesScreen: React.FC = () => {
    const { t, shopDetails, language } = useStore();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newExpense, setNewExpense] = useState({
        amount: '',
        description: '',
        payment_method: 'cash'
    });

    const handleExport = () => {
        if (expenses.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = expenses.map(e => ({
            'Description': e.description,
            'Amount': e.amount,
            'Date': new Date(e.date || new Date()).toLocaleString(),
            'Payment Method': e.payment_method
        }));
        exportToCSV(exportData, 'expenses');
    };

    const fetchExpenses = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await api.get('/transactions?type=expense');
            setExpenses(data.transactions);
        } catch (error) {
            console.error("Failed to fetch expenses", error);
            toast.error("Failed to load expenses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [shopDetails.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/transactions/expense', {
                ...newExpense,
                amount: parseFloat(newExpense.amount)
            });
            toast.success("Expense recorded successfully");
            setIsModalOpen(false);
            setNewExpense({ amount: '', description: '', payment_method: 'cash' });
            fetchExpenses();
        } catch (error) {
            console.error("Failed to save expense", error);
            toast.error("Failed to save expense");
        }
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.amount.toString().includes(searchTerm)
    );

    return (
        <Layout title={t('expenses' as any) || 'Expenses'}>
            <div className="max-w-6xl mx-auto h-full flex flex-col">
                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold mb-4 text-text-main dark:text-white">Record Expense</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Amount (৳)</label>
                                    <input
                                        required
                                        type="number"
                                        className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Description</label>
                                    <textarea
                                        required
                                        className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Payment Method</label>
                                    <select
                                        className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                        value={newExpense.payment_method}
                                        onChange={e => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bkash">bKash</option>
                                        <option value="bank">Bank Transfer</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">{t('cancel')}</button>
                                    <button type="submit" className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600">{t('save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-white">{t('expenses' as any) || 'Expenses'}</h2>
                        <p className="text-text-muted">Track your business spending</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm w-full focus:ring-2 focus:ring-primary/50"
                                placeholder={t('search')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            <span className="font-bold text-sm">Add Expense</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
                        <table className="w-full text-left min-w-[600px] border-collapse h-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Description</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Method</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </td>
                                    </tr>
                                ) : filteredExpenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            {formatDate(expense.date, language)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-main dark:text-white">{expense.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize text-sm text-text-muted">{expense.payment_method}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-500">
                                            ৳{parseFloat(expense.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                                            No expenses found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
