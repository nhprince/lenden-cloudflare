import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Vendor } from '../types';
import { formatCurrency } from '../utils/formatters';

import { PurchaseModal } from '../components/PurchaseModal';
import { VendorPaymentModal } from '../components/VendorPaymentModal';
import { VendorHistoryModal } from '../components/VendorHistoryModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const VendorsScreen: React.FC = () => {
    const { t, shopDetails } = useStore();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedVendorForPurchase, setSelectedVendorForPurchase] = useState<Vendor | null>(null);
    const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<Vendor | null>(null);
    const [selectedVendorForHistory, setSelectedVendorForHistory] = useState<Vendor | null>(null);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        company_name: '',
        phone: ''
    });

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleExport = () => {
        if (vendors.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = vendors.map(v => ({
            'Name': v.name,
            'Company': v.company_name || 'N/A',
            'Phone': v.phone || 'N/A',
            'Payable': v.total_payable || 0
        }));
        const { exportToCSV } = require('../utils/export');
        exportToCSV(exportData, 'vendors');
    };

    useEffect(() => {
        fetchVendors();
    }, [shopDetails.id]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch (error) {
            console.error("Failed to fetch vendors", error);
            toast.error("Failed to load vendors");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Bug #31: Form Validation
        if (!formData.name.trim()) {
            toast.error(t('vendorNameRequired' as any) || "Vendor name is required");
            return;
        }
        // Basic phone validation (optional, allows digits, spaces, +, -)
        if (formData.phone && !/^[\d\s\+\-]+$/.test(formData.phone)) {
            toast.error(t('invalidPhoneFormat' as any) || "Invalid phone number format");
            return;
        }

        setSubmitting(true);
        try {
            if (editingVendor) {
                await api.put(`/vendors/${editingVendor.id}`, formData);
                toast.success("Vendor updated successfully");
            } else {
                await api.post('/vendors', formData);
                toast.success("Vendor added successfully");
            }
            fetchVendors();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save vendor", error);
            toast.error("Failed to save vendor");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        // Optimistic Update
        const previousVendors = [...vendors];
        setVendors(vendors.filter(v => v.id !== deleteId));
        setDeleteId(null);

        try {
            setIsDeleting(true);
            await api.delete(`/vendors/${deleteId}`);
            toast.success(t('vendorDeleted' as any) || "Vendor deleted successfully");
        } catch (error) {
            console.error("Failed to delete vendor", error);
            // Rollback
            setVendors(previousVendors);
            toast.error(t('errorDeletingVendor' as any) || "Failed to delete vendor");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name,
            company_name: vendor.company_name || '',
            phone: vendor.phone || ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingVendor(null);
        setFormData({ name: '', company_name: '', phone: '' });
    };

    const handlePurchaseClick = (vendor: Vendor) => {
        setSelectedVendorForPurchase(vendor);
        setShowPurchaseModal(true);
    };

    const handlePurchaseSuccess = () => {
        fetchVendors();
        setShowPurchaseModal(false);
        setSelectedVendorForPurchase(null);
    };

    const handlePaymentClick = (vendor: Vendor) => {
        setSelectedVendorForPayment(vendor);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        fetchVendors();
        setShowPaymentModal(false);
        setSelectedVendorForPayment(null);
    };

    const handleHistoryClick = (vendor: Vendor) => {
        setSelectedVendorForHistory(vendor);
        setShowHistoryModal(true);
    };

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm)
    );

    return (
        <Layout title={t('vendors')}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder={t('search' as any)}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleExport}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 hover:border-primary transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            <span>{t('export' as any)}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <span className="material-symbols-outlined">add</span>
                            {t('addVendor' as any)}
                        </motion.button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
                            <AnimatePresence>
                                {filteredVendors.map((vendor, idx) => (
                                    <motion.div
                                        key={vendor.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                                                    {vendor.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{vendor.name}</h3>
                                                    {vendor.company_name && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{vendor.company_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(vendor)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
                                                    title={t('editVendor' as any) || "Edit Vendor"}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(vendor.id)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                    title={t('deleteVendor' as any) || "Delete Vendor"}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            {vendor.phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="material-symbols-outlined text-[18px]">call</span>
                                                    {vendor.phone}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                                {t('payable' as any)}: <span className="font-bold text-red-500">{formatCurrency(vendor.payable || 0)}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleHistoryClick(vendor)}
                                                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-primary transition-colors flex-shrink-0"
                                                title={t('vendorHistory' as any) || 'History'}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">history</span>
                                            </button>
                                            <button
                                                onClick={() => handlePaymentClick(vendor)}
                                                className="flex-1 min-w-[100px] py-2 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                                            >
                                                {t('payVendor' as any) || 'Pay Vendor'}
                                            </button>
                                            <button
                                                onClick={() => handlePurchaseClick(vendor)}
                                                className="flex-1 min-w-[120px] py-2 px-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-xs sm:text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors whitespace-nowrap"
                                            >
                                                {t('recordPurchase' as any)}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {showPurchaseModal && selectedVendorForPurchase && (
                        <PurchaseModal
                            vendor={selectedVendorForPurchase}
                            onClose={() => setShowPurchaseModal(false)}
                            onSuccess={handlePurchaseSuccess}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showPaymentModal && selectedVendorForPayment && (
                        <VendorPaymentModal
                            isOpen={showPaymentModal}
                            onClose={() => setShowPaymentModal(false)}
                            onSuccess={handlePaymentSuccess}
                            initialVendorId={selectedVendorForPayment.id.toString()}
                            vendorName={selectedVendorForPayment.name}
                            currentBalance={Number(selectedVendorForPayment.payable)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showHistoryModal && selectedVendorForHistory && (
                        <VendorHistoryModal
                            isOpen={showHistoryModal}
                            onClose={() => setShowHistoryModal(false)}
                            vendor={selectedVendorForHistory}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingVendor ? t('editVendor' as any) : t('addVendor' as any)}
                                    </h3>
                                    <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('vendorName' as any)} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('companyName' as any)}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_name}
                                            onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('phone' as any)}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            {t('cancel' as any)}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {t('save' as any)}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={confirmDelete}
                    title={t('confirmDelete' as any) || "Delete Vendor"}
                    message={t('deleteVendorMessage' as any) || "Are you sure you want to delete this vendor? This action cannot be undone."}
                    confirmText={t('delete' as any) || "Delete"}
                    cancelText={t('cancel' as any) || "Cancel"}
                    isLoading={isDeleting}
                    variant="danger"
                />
            </div>
        </Layout>
    );
};
