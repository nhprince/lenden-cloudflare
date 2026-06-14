import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import { Customer } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/export';

export const CustomersScreen: React.FC = () => {
    const { t, shopDetails, can, language } = useStore();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleExport = () => {
        if (customers.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = customers.map(c => ({
            'Name': c.name,
            'Email': c.email || 'N/A',
            'Phone': c.phone,
            'Total Spent': c.totalSpent || 0,
            'Last Visit': c.lastVisit ? formatDate(c.lastVisit, language) : 'N/A'
        }));
        exportToCSV(exportData, 'customers');
    };

    const fetchCustomers = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await api.get('/customers');
            // Map database fields to frontend format
            const mappedCustomers = data.map((c: any) => ({
                ...c,
                totalSpent: c.total_spent || 0,
                lastVisit: c.updated_at || c.created_at
            }));
            setCustomers(mappedCustomers);
        } catch (error) {
            console.error("Failed to fetch customers", error);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [shopDetails.id]);

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        customer.phone.includes(searchTerm)
    );

    const handleAddNew = () => {
        setEditingId(null);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (customer: any) => {
        setEditingId(customer.id);
        setNewCustomer({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone,
            address: customer.address || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this customer?")) {
            try {
                await api.delete(`/customers/${id}`);
                toast.success("Customer deleted successfully");
                fetchCustomers();
            } catch (error) {
                console.error("Failed to delete customer", error);
                toast.error("Failed to delete customer");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                await api.put(`/customers/${editingId}`, newCustomer);
                toast.success("Customer updated successfully");
            } else {
                await api.post('/customers', newCustomer);
                toast.success("Customer added successfully");
            }

            setIsModalOpen(false);
            setNewCustomer({ name: '', email: '', phone: '', address: '' });
            setEditingId(null);
            fetchCustomers();
        } catch (error) {
            console.error("Failed to save customer", error);
            toast.error("Failed to save customer");
        }
    };

    return (
        <Layout title={t('customers')}><div className="max-w-6xl mx-auto h-full flex flex-col">
            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4 text-text-main dark:text-white">
                            {editingId ? t('editCustomer') : t('addCustomer')}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">{t('name')}</label>
                                <input
                                    required
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">{t('email')}</label>
                                <input
                                    type="email"
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">{t('phone')}</label>
                                <input
                                    required
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">{t('address')}</label>
                                <textarea
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    value={newCustomer.address}
                                    onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-blue-700">{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-white">{t('customers')}</h2>
                    <p className="text-text-muted">Manage your customer database</p>
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
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-text-muted hover:text-primary transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>{t('export')}</span>
                    </button>
                    <button onClick={handleAddNew} className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                        <span className="font-bold text-sm">{t('addCustomer')}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
                    <table className="w-full text-left min-w-[700px] border-collapse h-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('customer')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('phone')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('totalSpent')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t('lastVisit')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </td>
                                </tr>
                            ) : filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-text-main dark:text-white">{customer.name}</div>
                                                <div className="text-xs text-text-muted">{customer.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-muted">{customer.phone}</td>
                                    <td className="px-6 py-4 font-bold text-text-main dark:text-white">৳{customer.totalSpent || 0}</td>
                                    <td className="px-6 py-4 text-sm text-text-muted">{customer.lastVisit ? formatDate(customer.lastVisit, language) : 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(customer)} className="text-gray-400 hover:text-primary p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            {can('delete_customer') && (
                                                <button onClick={() => handleDelete(customer.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                                        No customers found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div></Layout>
    );
};