import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useStore } from '../context/Store';
import toast from 'react-hot-toast';

interface Shop {
    id: string;
    name: string;
    business_type: string;
    address?: string;
    phone?: string;
}

const ShopSelector: React.FC = () => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newShop, setNewShop] = useState({ name: '', business_type: 'general', address: '', phone: '' });
    const navigate = useNavigate();
    const { updateShopDetails, t, user, logout } = useStore();

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/shops');
            setShops(data);
        } catch (error) {
            console.error('Failed to fetch shops');
            toast.error('Failed to load shops');
        } finally {
            setLoading(false);
        }
    };

    const handleShopSelect = (shop: Shop) => {
        localStorage.setItem('currentShop', JSON.stringify(shop));
        updateShopDetails(shop as any);
        navigate('/dashboard');
    };

    const handleCreateShop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/shops', newShop);
            toast.success('Your new shop is ready!');
            setShowModal(false);
            setNewShop({ name: '', business_type: 'general', address: '', phone: '' });
            fetchShops();
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bike_sales': return 'two_wheeler';
            case 'garage': return 'home_repair_service';
            case 'showroom': return 'electronics';
            case 'pickup_rental': return 'local_shipping';
            case 'furniture': return 'chair';
            default: return 'storefront';
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-background-dark selection:bg-primary selection:text-white">
            {/* Nav Header */}
            <nav className="h-24 px-8 sm:px-12 flex items-center justify-between border-b border-[#f0f2f5] dark:border-[#2d3748] bg-white/50 dark:bg-surface-dark/50 backdrop-blur-xl fixed top-0 w-full z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-3xl font-light">antigravity</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-text-main dark:text-white tracking-tighter">LENDEN</h1>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] -mt-1">Business Suite</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">{user?.name}</span>
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest -mt-1">Authorized User</span>
                    </div>
                    <button
                        onClick={logout}
                        className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined font-light">logout</span>
                    </button>
                </div>
            </nav>

            <main className="pt-40 pb-20 px-8 sm:px-12 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2 className="text-5xl font-black text-text-main dark:text-white tracking-tighter mb-4">Welcome Back.</h2>
                        <p className="text-lg text-text-muted font-medium max-w-xl leading-relaxed">Select the workshop or showroom you'd like to manage today, or launch a brand new branch.</p>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 flex items-center gap-3 transition-all"
                    >
                        <span className="material-symbols-outlined">add_business</span>
                        Launch New Branch
                    </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="h-64 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-[#f0f2f5] dark:border-[#2d3748] animate-pulse" />
                        ))
                    ) : (
                        <>
                            {shops.map((shop, idx) => (
                                <motion.div
                                    key={shop.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <button
                                        onClick={() => handleShopSelect(shop)}
                                        className="w-full text-left bg-white dark:bg-surface-dark rounded-[2.5rem] border border-[#f0f2f5] dark:border-[#2d3748] shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-500 group overflow-hidden flex flex-col h-full"
                                    >
                                        <div className="p-10 flex-1">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                                    <span className="material-symbols-outlined text-3xl font-light">{getTypeIcon(shop.business_type)}</span>
                                                </div>
                                                <span className="px-4 py-1.5 rounded-full bg-slate-50 dark:bg-[#111621] text-[10px] font-black text-text-muted uppercase tracking-widest border border-[#f0f2f5] dark:border-[#2d3748] group-hover:border-primary/20 transition-colors">
                                                    {shop.business_type.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-black text-text-main dark:text-white mb-3 group-hover:text-primary transition-colors tracking-tight">{shop.name}</h3>
                                            <p className="text-sm font-medium text-text-muted leading-relaxed line-clamp-2">{shop.address || 'Location data not configured for this branch.'}</p>
                                        </div>

                                        <div className="px-10 py-8 bg-[#f8fafc] dark:bg-slate-900 border-t border-[#f0f2f5] dark:border-[#2d3748] flex items-center justify-between group-hover:bg-primary transition-all duration-500">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover:text-white/80 transition-colors">Enter Management Panel</span>
                                            <span className="material-symbols-outlined text-primary group-hover:text-white transition-all duration-500 group-hover:translate-x-2">arrow_right_alt</span>
                                        </div>
                                    </button>
                                </motion.div>
                            ))}

                            <motion.button
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: (shops.length || 0) * 0.1 }}
                                onClick={() => setShowModal(true)}
                                className="w-full min-h-[320px] rounded-[2.5rem] border-2 border-dashed border-[#e5e7eb] dark:border-[#2d3748] hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group flex flex-col items-center justify-center p-10"
                            >
                                <div className="w-20 h-20 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-[#f0f2f5] dark:border-[#2d3748] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-4xl font-light">add_circle</span>
                                </div>
                                <h3 className="text-xl font-black text-text-main dark:text-white mb-2">Grow Your Empire</h3>
                                <p className="text-sm font-medium text-text-muted">Register a new business branch</p>
                            </motion.button>
                        </>
                    ) || (
                        <div className="col-span-full py-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 font-light">storefront</span>
                            <h3 className="text-2xl font-black text-text-main dark:text-white">No Branches Found</h3>
                            <p className="text-text-muted mt-2">Start your business journey by creating your first shop.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Premium Create Shop Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white dark:bg-surface-dark rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-[#f0f2f5] dark:border-[#2d3748]"
                        >
                            <div className="p-10 border-b border-[#f0f2f5] dark:border-[#2d3748] bg-[#f8fafc] dark:bg-slate-900/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-text-main dark:text-white tracking-tighter">New Branch</h2>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Setup your business profile</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-surface-dark text-text-muted hover:text-primary shadow-sm border border-[#f0f2f5] dark:border-[#2d3748] transition-all">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateShop} className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Shop Visual Identity</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-6 py-5 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                        placeholder="Business Legal Name"
                                        value={newShop.name}
                                        onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Industry Type</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-6 py-5 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
                                            value={newShop.business_type}
                                            onChange={e => setNewShop({ ...newShop, business_type: e.target.value })}
                                        >
                                            <option value="general">General Commerce</option>
                                            <option value="bike_sales">Automobile Showroom (Bikes)</option>
                                            <option value="garage">Engineering Workshop / Garage</option>
                                            <option value="furniture">Furniture Manufacturing</option>
                                            <option value="showroom">Electronics / Digital Showroom</option>
                                            <option value="pickup_rental">Logistics & Pickup Rental</option>
                                        </select>
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Contact Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-6 py-5 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            placeholder="+8801..."
                                            value={newShop.phone}
                                            onChange={e => setNewShop({ ...newShop, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Primary Location</label>
                                        <input
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-6 py-5 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            placeholder="City, Area"
                                            value={newShop.address}
                                            onChange={e => setNewShop({ ...newShop, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted bg-[#f8fafc] dark:bg-slate-900 overflow-hidden rounded-2xl border border-[#e5e7eb] dark:border-[#2d3748] transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-primary text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95"
                                    >
                                        Initialize Business
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ShopSelector;
