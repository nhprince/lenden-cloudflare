import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import { ServiceHistoryModal } from '../components/ServiceHistoryModal';
import { ProductImage } from '../components/ProductImage';

interface Service {
    id: number;
    name: string;
    description: string;
    service_charge: number;
    image_url?: string;
}

export const ServicesScreen: React.FC = () => {
    const { t, shopDetails } = useStore();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [editingService, setEditingService] = useState<Service | null>(null);
    const [selectedServiceForHistory, setSelectedServiceForHistory] = useState<Service | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        service_charge: '',
        image_url: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExport = () => {
        if (services.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = services.map(s => ({
            'Name': s.name,
            'Description': s.description || 'N/A',
            'Service Charge': s.service_charge
        }));
        const { exportToCSV } = require('../utils/export');
        exportToCSV(exportData, 'services');
    };

    useEffect(() => {
        fetchServices();
    }, [shopDetails.id]);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/services');
            setServices(res.data);
        } catch (error) {
            console.error("Failed to fetch services", error);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                service_charge: Number(formData.service_charge)
            };

            if (editingService) {
                await api.put(`/services/${editingService.id}`, payload);
                toast.success("Service updated successfully");
            } else {
                await api.post('/services', payload);
                toast.success("Service added successfully");
            }
            fetchServices();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save service", error);
            toast.error("Failed to save service");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('confirmDelete' as any))) return;
        try {
            await api.delete(`/services/${id}`);
            toast.success("Service deleted successfully");
            fetchServices();
        } catch (error) {
            console.error("Failed to delete service", error);
            toast.error("Failed to delete service");
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            service_charge: String(service.service_charge),
            image_url: service.image_url || ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingService(null);
        setFormData({ name: '', description: '', service_charge: '', image_url: '' });
    };

    const handleHistoryClick = (service: Service) => {
        setSelectedServiceForHistory(service);
        setShowHistoryModal(true);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout title={t('services' as any)}>
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
                            className="flex-[2] sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <span className="material-symbols-outlined">add</span>
                            {t('addNew' as any)} Service
                        </motion.button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredServices.map((service, idx) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xl">
                                                <span className="material-symbols-outlined">home_repair_service</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{service.name}</h3>
                                                <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(service.service_charge)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(service)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {service.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                            {service.description}
                                        </p>
                                    )}

                                    <div className="mt-auto">
                                        <button
                                            onClick={() => handleHistoryClick(service)}
                                            className="w-full py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-500 hover:text-primary transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">history</span>
                                            View Usage History
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

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
                                        {editingService ? t('edit' as any) : t('addNew' as any)} Service
                                    </h3>
                                    <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    <div className="flex justify-center mb-6">
                                        <div
                                            className="relative w-28 h-28 rounded-[2rem] bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-[#e5e7eb] dark:border-[#2d3748] flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary transition-all shadow-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {formData.image_url && formData.image_url !== 'https://placehold.co/100x100?text=Service' ? (
                                                <ProductImage
                                                    src={formData.image_url?.startsWith('http') || formData.image_url?.startsWith('data:') ? formData.image_url : `${import.meta.env.VITE_API_URL}${formData.image_url}`}
                                                    alt="Preview"
                                                    className="w-full h-full"
                                                    imgClassName="group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-primary">
                                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                                    <span className="text-[10px] font-black uppercase mt-1 tracking-widest">{t('uploadPhoto' as any)}</span>
                                                </div>
                                            )}
                                            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Service Name *
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
                                            Service Charge *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={formData.service_charge}
                                                onChange={e => setFormData({ ...formData, service_charge: e.target.value })}
                                                className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('description' as any)}
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
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
                                            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                t('save' as any)
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showHistoryModal && selectedServiceForHistory && (
                        <ServiceHistoryModal
                            isOpen={showHistoryModal}
                            onClose={() => setShowHistoryModal(false)}
                            service={selectedServiceForHistory}
                        />
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};
