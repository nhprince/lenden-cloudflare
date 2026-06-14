import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { Layout } from '../components/Layout';
import { ProductImage } from '../components/ProductImage';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { useStore } from '../context/Store';
import { formatCurrency } from '../utils/formatters';
import api from '../utils/api';
import { exportToCSV } from '../utils/export';
import { compressImage } from '../utils/imageCompression';
import { Product } from '../types';

export const ProductsScreen: React.FC = () => {
    const { t, shopDetails, can } = useStore();
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'low_stock'>(searchParams.get('filter') === 'low_stock' ? 'low_stock' : 'all');

    const handleExport = () => {
        if (products.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = products.map(p => ({
            'Name': p.name,
            'SKU': p.sku,
            'Category': p.category,
            'Quantity': p.qty,
            'Unit': p.unit || 'pcs',
            'Cost Price': p.costPrice,
            'Selling Price': p.sellingPrice,
            'Stock Value': p.qty * p.costPrice,
            'Min Stock Level': p.minStockLevel
        }));
        exportToCSV(exportData, 'inventory');
    };

    // Pagination state
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialProductState: Partial<Product> = {
        name: '', subText: '', sku: '', category: 'General', qty: 0, costPrice: 0, sellingPrice: 0, imageUrl: '', minStockLevel: 5, unit: 'pcs'
    };

    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>(initialProductState);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const fetchProducts = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const params: any = { limit, offset };
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (filter === 'low_stock') params.low_stock = true;

            const { data } = await api.get('/products', { params });
            setProducts(data.products);
            setTotal(data.pagination.total);
        } catch (error) {
            console.error("Failed to fetch products", error);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [shopDetails.id, offset, filter, debouncedSearchTerm]);

    // Reset offset when search term changes (with debounce)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setOffset(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            try {
                const loadingToast = toast.loading('Compressing image...');
                const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200 });
                setCurrentProduct({ ...currentProduct, imageUrl: compressed });
                toast.dismiss(loadingToast);
                toast.success('Image compressed successfully');
            } catch (error: any) {
                console.error('Image compression error:', error);
                toast.error(error.message || 'Failed to compress image');
            }
        }
    };

    const handleEditClick = (product: any) => {
        setEditingId(product.id);
        setCurrentProduct(product);
        setIsModalOpen(true);
    };

    const handleAddNewClick = () => {
        setEditingId(null);
        setCurrentProduct(initialProductState);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        // Optimistic Update: Immediately remove from UI
        const previousProducts = [...products];
        setProducts(products.filter(p => p.id !== deleteId));
        setDeleteId(null); // Close modal immediately

        try {
            setIsDeleting(true);
            await api.delete(`/products/${deleteId}`);
            toast.success("Product deleted successfully");
            // No need to fetchProducts() if successful, as list is already correct
        } catch (error) {
            console.error("Failed to delete product", error);
            // Rollback on error
            setProducts(previousProducts);
            toast.error("Failed to delete product");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Bug #31: Product Validation
        if (!currentProduct.name?.trim()) {
            toast.error(t('productNameRequired' as any) || "Product name is required");
            return;
        }
        if (!currentProduct.sku?.trim()) {
            toast.error(t('skuRequired' as any) || "SKU is required");
            return;
        }
        if ((currentProduct.qty || 0) < 0) {
            toast.error(t('invalidQuantity' as any) || "Quantity cannot be negative");
            return;
        }
        if ((currentProduct.sellingPrice || 0) < 0 || (currentProduct.costPrice || 0) < 0) {
            toast.error(t('invalidPrice' as any) || "Prices cannot be negative");
            return;
        }

        setSubmitting(true);
        try {
            const productData = {
                name: currentProduct.name,
                category: currentProduct.category,
                sku: currentProduct.sku,
                stock_quantity: currentProduct.qty,
                selling_price: currentProduct.sellingPrice,
                cost_price: currentProduct.costPrice,
                min_stock_level: currentProduct.minStockLevel || 5,
                unit: currentProduct.unit || 'pcs',
                engine_no: currentProduct.engineNo || null,
                chassis_no: currentProduct.chassisNo || null,
                model_year: currentProduct.modelYear || null,
                material_cost: currentProduct.materialCost || null,
                image_url: currentProduct.imageUrl || null
            };

            if (editingId) {
                await api.put(`/products/${editingId}`, productData);
                toast.success("Product updated successfully");
            } else {
                await api.post('/products', productData);
                toast.success("Product added successfully");
            }

            setIsModalOpen(false);
            setCurrentProduct(initialProductState);
            fetchProducts();
        } catch (error: any) {
            console.error("Failed to save product", error);
            // Show specific error message from backend if available
            toast.error(error.response?.data?.message || "Failed to save product");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title={t('inventory')}><div className="w-full max-w-7xl flex flex-col gap-8 mx-auto relative h-full">

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">{t('inventory')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">{t('inventorySubtitle' as any)}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleAddNewClick} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>{t('addProduct')}</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-[#f0f2f5] dark:border-[#2d3748] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-6 border-b border-[#f0f2f5] dark:border-[#2d3748] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="relative flex-1 max-w-lg">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">search</span>
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-900 border border-[#e5e7eb] dark:border-[#2d3748] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 dark:text-white"
                            placeholder={`${t('search')} products...`}
                            type="text"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-[#f8fafc] dark:bg-slate-900 p-1.5 rounded-2xl border border-[#e5e7eb] dark:border-[#2d3748]">
                        <button className={`whitespace-nowrap px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`} onClick={() => setFilter('all')}>{t('allItems' as any)}</button>
                        <button className={`whitespace-nowrap px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'low_stock' ? 'bg-white dark:bg-slate-800 text-red-500 shadow-sm' : 'text-slate-500 hover:text-red-500'}`} onClick={() => setFilter('low_stock')}>{t('lowStock' as any)}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f8fafc]/50 dark:bg-slate-900/50 border-b border-[#f0f2f5] dark:border-[#2d3748]">
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('productName')}</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('sku')}</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('category')}</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('quantity')}</th>
                                {can('view_profits') && <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">{t('costPrice')}</th>}
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">{t('price')}</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#2d3748]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 font-bold">{t('noProductsFound' as any)}</td>
                                </tr>
                            ) : products.map((prod: Product) => (
                                <tr key={prod.id} className="group hover:bg-[#f8fafc] dark:hover:bg-slate-800/30 transition-all">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-4">
                                            <ProductImage
                                                src={prod.image_url ? (prod.image_url.startsWith('http') || prod.image_url.startsWith('data:') ? prod.image_url : `${import.meta.env.VITE_API_URL || 'https://api.lenden.cyberslayersagency.com'}${prod.image_url.startsWith('/') ? '' : '/'}${prod.image_url}`) : undefined}
                                                alt={prod.name}
                                                className="w-12 h-12 rounded-2xl border border-[#e5e7eb] dark:border-[#2d3748]"
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">{prod.name}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prod.sub_text}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6"><span className="font-mono text-[11px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-[#e5e7eb] dark:border-[#2d3748]">{prod.sku}</span></td>
                                    <td className="py-5 px-6"><span className="text-xs font-bold text-slate-600 dark:text-slate-400">{prod.category}</span></td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black ${prod.stock_quantity <= (prod.min_stock_level || 5) ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{prod.stock_quantity}</span>
                                            {prod.stock_quantity <= (prod.min_stock_level || 5) && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-[9px] font-black text-red-600 uppercase tracking-tighter border border-red-100 dark:border-red-500/20">{t('lowStock' as any)}</span>
                                            )}
                                        </div>
                                    </td>
                                    {can('view_profits') && <td className="py-5 px-6 hidden md:table-cell"><span className="text-sm font-bold text-slate-500">৳ {prod.cost_price?.toLocaleString()}</span></td>}
                                    <td className="py-5 px-6 text-right font-black text-slate-900 dark:text-white text-sm">৳ {prod.selling_price?.toLocaleString()}</td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditClick({
                                                ...prod,
                                                qty: prod.stock_quantity,
                                                sellingPrice: prod.selling_price,
                                                costPrice: prod.cost_price,
                                                imageUrl: prod.image_url,
                                                minStockLevel: prod.min_stock_level,
                                                subText: prod.sub_text,
                                                engineNo: prod.engine_no,
                                                chassisNo: prod.chassis_no,
                                                modelYear: prod.model_year,
                                                materialCost: prod.material_cost
                                            })} className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                                                title={t('editProduct' as any) || "Edit Product"}
                                                aria-label={`Edit ${prod.name}`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            {can('delete_product') && (
                                                <button onClick={() => handleDeleteClick(prod.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title={t('deleteProduct' as any) || "Delete Product"}
                                                    aria-label={`Delete ${prod.name}`}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-[#f0f2f5] dark:border-[#2d3748] flex items-center justify-between bg-[#f8fafc]/30 dark:bg-slate-900/30">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} OF {total} ITEMS
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - limit))}
                            className="w-10 h-10 rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] flex items-center justify-center disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button
                            disabled={offset + limit >= total}
                            onClick={() => setOffset(offset + limit)}
                            className="w-10 h-10 rounded-xl border border-[#e5e7eb] dark:border-[#2d3748] flex items-center justify-center disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal with AnimatePresence */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#f0f2f5] dark:border-[#2d3748]"
                        >
                            <div className="px-10 pt-10 pb-6 flex items-center justify-between border-b border-[#f0f2f5] dark:border-[#2d3748]">
                                <div>
                                    <h3 className="text-2xl font-black text-text-main dark:text-white tracking-tight">{editingId ? t('editProduct' as any) : t('registerProduct' as any)}</h3>
                                    <p className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-[0.2em]">{t('inventoryManagement' as any)}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-[#111621] text-text-muted hover:text-primary transition-all active:scale-95 border border-[#f0f2f5] dark:border-[#2d3748]">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-10 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
                                <div className="flex justify-center mb-8">
                                    <div
                                        className="relative w-28 h-28 rounded-[2rem] bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-[#e5e7eb] dark:border-[#2d3748] flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary transition-all shadow-sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {currentProduct.imageUrl && currentProduct.imageUrl !== 'https://picsum.photos/id/1/100/100' ? (
                                            <ProductImage src={currentProduct.imageUrl?.startsWith('http') || currentProduct.imageUrl?.startsWith('data:') ? currentProduct.imageUrl : `${import.meta.env.VITE_API_URL}${currentProduct.imageUrl}`} alt="Preview" className="w-full h-full" imgClassName="group-hover:scale-110 transition-transform" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 group-hover:text-primary">
                                                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                                <span className="text-[10px] font-black uppercase mt-1 tracking-widest">{t('uploadPhoto' as any)}</span>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
                                    <div className="col-span-1 sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('productName')}</label>
                                        <input required placeholder="Item name" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.name} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('sku')}</label>
                                        <input required placeholder="SKU-XXXX" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.sku} onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('category')}</label>
                                        <input placeholder="Category" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.category} onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('stockLevel' as any)}</label>
                                        <input required type="number" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.qty || ''} onChange={e => setCurrentProduct({ ...currentProduct, qty: parseInt(e.target.value) })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('unit' as any)}</label>
                                        <select className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none" value={currentProduct.unit || 'pcs'} onChange={e => setCurrentProduct({ ...currentProduct, unit: e.target.value })}>
                                            <option value="pcs">Pieces (pcs)</option>
                                            <option value="kg">Kilograms (kg)</option>
                                            <option value="gm">Grams (gm)</option>
                                            <option value="ltr">Liters (ltr)</option>
                                            <option value="ml">Milliliters (ml)</option>
                                            <option value="ft">Feet (ft)</option>
                                            <option value="mtr">Meters (mtr)</option>
                                            <option value="box">Box</option>
                                            <option value="pkt">Packet</option>
                                        </select>
                                    </div>

                                    {can('view_profits') && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('costPrice')}</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">৳</span>
                                                <input required type="number" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-10 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.costPrice || ''} onChange={e => setCurrentProduct({ ...currentProduct, costPrice: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-1 sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('retailPrice' as any)}</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-lg">৳</span>
                                            <input required type="number" className="w-full bg-primary/5 border border-primary/20 dark:border-primary/40 rounded-2xl px-10 py-5 text-xl font-black text-primary dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all font-display" value={currentProduct.sellingPrice || ''} onChange={e => setCurrentProduct({ ...currentProduct, sellingPrice: parseFloat(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-[#f0f2f5] dark:border-[#2d3748]">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('stockValue' as any)}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                                            ৳ {((currentProduct.costPrice || 0) * (currentProduct.qty || 0)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-r border-[#e5e7eb] dark:border-[#2d3748]">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profitPerUnit' as any)}</p>
                                        <p className={`text-sm font-bold mt-1 ${(currentProduct.sellingPrice || 0) - (currentProduct.costPrice || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            ৳ {((currentProduct.sellingPrice || 0) - (currentProduct.costPrice || 0)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('margin' as any)}</p>
                                        <p className={`text-sm font-bold mt-1 ${(currentProduct.costPrice || 0) > 0 ? (((currentProduct.sellingPrice || 0) - (currentProduct.costPrice || 0)) / (currentProduct.costPrice || 0) * 100) >= 0 ? 'text-green-500' : 'text-red-500' : 'text-slate-500'}`}>
                                            {(currentProduct.costPrice || 0) > 0
                                                ? (((currentProduct.sellingPrice || 0) - (currentProduct.costPrice || 0)) / (currentProduct.costPrice || 0) * 100).toFixed(1) + '%'
                                                : '0%'}
                                        </p>
                                    </div>
                                </div>

                                {/* Specialized Fields */}
                                <div className="col-span-2 border-t border-[#f0f2f5] dark:border-[#2d3748] pt-8 mt-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                                        </div>
                                        <h4 className="text-[10px] font-black text-text-main dark:text-white uppercase tracking-[0.2em]">{t('industrySpecificData' as any)}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        {shopDetails.businessType === 'bike_sales' && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('engineNumber' as any)}</label>
                                                    <input className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.engineNo || ''} onChange={e => setCurrentProduct({ ...currentProduct, engineNo: e.target.value })} placeholder="ENG-XXXX" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('chassisNumber' as any)}</label>
                                                    <input className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.chassisNo || ''} onChange={e => setCurrentProduct({ ...currentProduct, chassisNo: e.target.value })} placeholder="CHS-XXXX" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('modelYear' as any)}</label>
                                                    <select className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none" value={currentProduct.modelYear || ''} onChange={e => setCurrentProduct({ ...currentProduct, modelYear: e.target.value })}>
                                                        <option value="">{t('selectYear' as any)}</option>
                                                        {Array.from({ length: 15 }, (_, i) => 2026 - i).map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {shopDetails.businessType === 'furniture' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t('materialProductionCost' as any)}</label>
                                                <div className="relative">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                                                    <input type="number" className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-10 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" value={currentProduct.materialCost || ''} onChange={e => setCurrentProduct({ ...currentProduct, materialCost: parseFloat(e.target.value) })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-10 flex gap-4 sticky bottom-0 bg-white dark:bg-surface-dark pb-4 border-t border-[#f0f2f5] dark:border-[#2d3748]">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-4 rounded-2xl text-sm font-black text-text-muted hover:bg-gray-50 transition-all border border-[#e5e7eb] dark:border-[#2d3748]"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-[2] bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            editingId ? t('saveChanges' as any) : t('completeRegistration' as any)
                                        )}
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
                title={t('confirmDelete' as any) || "Delete Product"}
                message={t('deleteProductMessage' as any) || "Are you sure you want to delete this product? This action cannot be undone."}
                confirmText={t('delete' as any) || "Delete"}
                cancelText={t('cancel' as any) || "Cancel"}
                isLoading={isDeleting}
                variant="danger"
            />

        </div ></Layout >
    );
};

export default ProductsScreen;