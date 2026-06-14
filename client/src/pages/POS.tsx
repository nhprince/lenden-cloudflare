import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import { Product, CartItem, Customer } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductImage } from '../components/ProductImage';
import { generateInvoicePDF } from '../utils/invoiceGenerator';

export const POSScreen: React.FC = () => {
    const { t, shopDetails, invoiceSettings } = useStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [customerSearch, setCustomerSearch] = useState(t('walkInCustomer' as any));
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>(['All']);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'bkash' | 'bank' | 'due'>('cash');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Helper to resolve image URL
    const resolveImageUrl = (url: string | null | undefined, name: string) => {
        if (!url) return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const baseUrl = import.meta.env.VITE_API_URL || 'https://api.lenden.cyberslayersagency.com';
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Fetch Initial Data
    const fetchInitialData = async () => {
        if (!shopDetails.id) return;
        try {
            const [custRes, prodRes, servRes] = await Promise.all([
                api.get('/customers'),
                api.get('/products?limit=50'),
                api.get('/services')
            ]);
            setCustomers(custRes.data);

            const fetchedProducts = prodRes.data.products.map((p: any) => ({
                id: p.id,
                name: p.name,
                subText: p.sub_text,
                sku: p.sku,
                category: p.category,
                qty: p.stock_quantity,
                costPrice: p.cost_price,
                sellingPrice: p.selling_price,
                imageUrl: resolveImageUrl(p.image_url, p.name),
                type: 'product'
            }));

            const fetchedServices = servRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                subText: 'Service',
                sku: 'SVC-' + s.id,
                category: 'Services',
                qty: 9999,
                costPrice: 0,
                sellingPrice: s.service_charge,
                imageUrl: resolveImageUrl(s.image_url, s.name),
                type: 'service'
            }));

            setProducts([...fetchedProducts, ...fetchedServices]);

            const cats = ['All', ...new Set(fetchedProducts.map((p: any) => p.category))];
            setCategories(cats as string[]);
        } catch (error) {
            console.error("Failed to fetch POS data", error);
            toast.error("Failed to load POS data");
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [shopDetails.id]);

    // Search Products
    const fetchProducts = useCallback(async (search: string, category: string) => {
        if (!shopDetails.id) return;
        try {
            setLoading(true);
            const params: any = { limit: 50 };
            if (search) params.search = search;

            const [prodRes, servRes] = await Promise.all([
                api.get('/products', { params }),
                api.get('/services')
            ]);

            const fetchedProducts = prodRes.data.products.map((p: any) => ({
                id: `p-${p.id}`,
                originalId: p.id,
                name: p.name,
                subText: p.sub_text,
                sku: p.sku,
                category: p.category,
                qty: Number(p.stock_quantity || 0),
                costPrice: p.cost_price,
                sellingPrice: p.selling_price,
                imageUrl: resolveImageUrl(p.image_url, p.name),
                type: 'product'
            }));

            let fetchedServices = servRes.data.map((s: any) => ({
                id: `s-${s.id}`,
                originalId: s.id,
                name: s.name,
                subText: 'Service',
                sku: 'SVC-' + s.id,
                category: 'Services',
                qty: 9999,
                costPrice: 0,
                sellingPrice: s.service_charge,
                imageUrl: resolveImageUrl(s.image_url, s.name),
                type: 'service'
            }));

            if (search) {
                fetchedServices = fetchedServices.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));
            }

            const allItems = [...fetchedProducts, ...fetchedServices];

            if (category !== 'All') {
                if (category === 'Services') {
                    setProducts(allItems.filter((p: any) => p.type === 'service'));
                } else {
                    setProducts(allItems.filter((p: any) => p.category === category));
                }
            } else {
                setProducts(allItems);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    }, [shopDetails.id]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchProducts(searchTerm, selectedCategory);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm, selectedCategory, fetchProducts]);

    const addToCart = (product: Product) => {
        if (product.qty <= 0) {
            toast.error("Out of stock");
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.cartQty >= product.qty) {
                    toast.error("Cannot add more than available stock");
                    return prev;
                }
                toast.success(`Added another ${product.name}`);
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, cartQty: item.cartQty + 1 }
                        : item
                );
            }
            toast.success(`${product.name} added to cart`);
            return [...prev, { ...product, cartQty: 1 }];
        });
    };

    const updateCartQuantity = (id: string, newQty: number) => {
        const product = products.find(p => p.id === id);
        if (newQty <= 0) {
            removeFromCart(id);
            return;
        }
        if (product && newQty > product.qty) {
            toast.error("Quantity exceeds available stock");
            return;
        }
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, cartQty: newQty } : item
        ));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
        toast.success("Item removed from cart");
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
        setCustomerSearch(t('walkInCustomer' as any));
        setSelectedCustomerId(null);
        toast.success("Cart cleared");
    };

    const calculateTotal = () => {
        const subtotal = cart.reduce((sum, item) => {
            const price = item.sellingPrice || item.selling_price || 0;
            return sum + (price * item.cartQty);
        }, 0);
        const discountAmount = (subtotal * discount) / 100;
        return {
            subtotal,
            discount: discountAmount,
            total: subtotal - discountAmount
        };
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        try {
            setCheckoutLoading(true);
            const totals = calculateTotal();
            const saleData = {
                customer_id: selectedCustomerId || null,
                customer_name: customerSearch,
                items: cart.map(item => {
                    const price = item.sellingPrice || item.selling_price || 0;
                    return {
                        product_id: item.type === 'service' ? undefined : (item.originalId || item.id),
                        service_id: item.type === 'service' ? (item.originalId || item.id) : undefined,
                        quantity: item.cartQty,
                        unit_price: price,
                        subtotal: price * item.cartQty
                    };
                }),
                amount: totals.total,
                paid_amount: Number(paidAmount) || 0,
                discount: totals.discount,
                payment_method: paymentMethod,
                notes: notes,
                status: 'Completed',
                due_date: dueDate || null
            };

            const res = await api.post('/transactions/sale', saleData);
            toast.success("Sale completed successfully!");

            // Prepare transaction object for invoice
            const transactionObj = {
                id: res.data.transactionId,
                date: new Date().toISOString(),
                customerName: customerSearch,
                amount: totals.total,
                paid_amount: Number(paidAmount) || 0,
                due_amount: totals.total - (Number(paidAmount) || 0),
                discount: totals.discount,
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.cartQty,
                    unit_price: item.sellingPrice,
                    subtotal: item.sellingPrice * item.cartQty
                }))
            };
            setLastTransaction(transactionObj);
            setShowSuccessModal(true);

            clearCart();
            setIsCheckoutOpen(false);
            setPaidAmount(0);
            setNotes('');
        } catch (error: any) {
            console.error("Checkout failed", error);
            const errMsg = error.response?.data?.message || "Failed to complete sale";
            const validationErrors = error.response?.data?.errors;

            if (validationErrors && Array.isArray(validationErrors)) {
                toast.error(`${errMsg}: ${validationErrors[0].message}`);
            } else {
                toast.error(errMsg);
            }
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        setLastTransaction(null);
    };

    const totals = calculateTotal();

    return (
        <Layout title={t('pos')}>
            <div className="max-w-7xl mx-auto h-[calc(100vh-180px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Products Section */}
                    <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                        {/* Search and Filters */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-soft"
                        >
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px] group-focus-within:text-primary-600 transition-colors">
                                            search
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder={t('searchProduct')}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                    />
                                </div>
                                <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                                    {categories.map(cat => (
                                        <motion.button
                                            key={cat}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${selectedCategory === cat
                                                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {cat}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin">
                            {loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
                                            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : products.length > 0 ? (
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        visible: { transition: { staggerChildren: 0.05 } }
                                    }}
                                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                                >
                                    {products.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            variants={{
                                                hidden: { opacity: 0, y: 20 },
                                                visible: { opacity: 1, y: 0 }
                                            }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => addToCart(product)}
                                            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-soft hover:shadow-hard cursor-pointer transition-all group"
                                        >
                                            <div className="relative mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden aspect-video sm:aspect-square">
                                                {product.type === 'service' ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-6xl text-orange-600 dark:text-orange-400">
                                                            home_repair_service
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <ProductImage
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full"
                                                        imgClassName="group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                )}
                                                {product.qty <= 0 && (
                                                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">{t('outOfStock')}</span>
                                                    </div>
                                                )}
                                                {product.qty > 0 && product.qty <= 10 && (
                                                    <div className="absolute top-2 right-2 bg-danger-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Low
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                {product.name}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                                                {product.subText || product.sku}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    ৳{product.sellingPrice}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {t('stock')}: {product.qty}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-3">inventory_2</span>
                                        <p className="text-gray-500 dark:text-gray-400">{t('noProductsFound' as any)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Section */}
                    <div className="flex flex-col gap-4 h-full">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-soft flex flex-col h-full"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('cart')}</h3>
                                {cart.length > 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={clearCart}
                                        className="text-sm font-semibold text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 transition-colors"
                                    >
                                        {t('clearCart')}
                                    </motion.button>
                                )}
                            </div>

                            {/* Customer Selection */}
                            <div className="mb-4 relative">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    {t('customer')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[18px]">person</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={e => {
                                            setCustomerSearch(e.target.value);
                                            setSelectedCustomerId(null);
                                        }}
                                        placeholder={t('searchOrType')}
                                        className="w-full pl-11 pr-10 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                    />
                                    {customerSearch !== t('walkInCustomer') && customerSearch !== '' && (
                                        <button
                                            onClick={() => {
                                                setCustomerSearch(t('walkInCustomer'));
                                                setSelectedCustomerId(null);
                                            }}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Customer Search Results */}
                                {customerSearch && !selectedCustomerId && customerSearch !== t('walkInCustomer' as any) && (
                                    <div className="absolute z-[60] left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto scrollbar-thin">
                                        {customers.filter(c =>
                                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                            (c.phone && c.phone.includes(customerSearch))
                                        ).length > 0 ? (
                                            customers.filter(c =>
                                                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                (c.phone && c.phone.includes(customerSearch))
                                            ).map(customer => (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => {
                                                        setCustomerSearch(customer.name);
                                                        setSelectedCustomerId(customer.id!.toString());
                                                    }}
                                                    className="w-full px-4 py-3 flex flex-col items-start hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700"
                                                >
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{customer.name}</span>
                                                    {customer.phone && <span className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</span>}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">"{customerSearch}" not found</p>
                                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-primary/10">
                                                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                                                    {t('newCustomerEntry')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin mb-4">
                                <AnimatePresence>
                                    {cart.length > 0 ? (
                                        cart.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-2 group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {item.type === 'service' ? (
                                                    <div className="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">
                                                            home_repair_service
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <ProductImage
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        ৳{item.sellingPrice} × {item.cartQty}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateCartQuantity(item.id, item.cartQty - 1)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">remove</span>
                                                    </button>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[20px] text-center">
                                                        {item.cartQty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateCartQuantity(item.id, item.cartQty + 1)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">add</span>
                                                    </button>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger-100 dark:bg-danger-950/30 text-danger-600 dark:text-danger-400 hover:bg-danger-200 dark:hover:bg-danger-900/40 transition-colors ml-2"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center h-full text-center py-12"
                                        >
                                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-3">shopping_cart</span>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('cartIsEmpty' as any)}</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('addProductsToGetStarted' as any)}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Discount */}
                            {cart.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Discount (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discount}
                                        onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                    />
                                </div>
                            )}

                            {/* Totals */}
                            {cart.length > 0 && (
                                <div className="space-y-2 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{t('subtotal')}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">৳{totals.subtotal.toLocaleString()}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('discount')} ({discount}%)</span>
                                            <span className="font-semibold text-danger-600 dark:text-danger-400">-৳{totals.discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="font-bold text-gray-900 dark:text-white">{t('total')}</span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">৳{totals.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Checkout Button */}
                            <motion.button
                                whileHover={{ scale: cart.length > 0 ? 1.02 : 1 }}
                                whileTap={{ scale: cart.length > 0 ? 0.98 : 1 }}
                                onClick={() => cart.length > 0 && setIsCheckoutOpen(true)}
                                disabled={cart.length === 0}
                                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${cart.length > 0
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-lg shadow-primary-600/30 hover:shadow-xl'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                                <span>{t('checkout')} (৳{totals.total.toLocaleString()})</span>
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>


            {/* Checkout Modal */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsCheckoutOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl"
                        >
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('completeSale' as any)}</h3>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        {t('paymentMethod')}
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {(['cash', 'bkash', 'bank', 'card', 'mobile', 'due'] as const).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`px-4 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${paymentMethod === method
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {t(method as any)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Paid Amount (৳)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(Number(e.target.value))}
                                        placeholder={t('paidAmount' as any)}
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                    />
                                </div>

                                {(Number(paidAmount) < calculateTotal().total || paymentMethod === 'due') && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => setDueDate(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Add any notes..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('items')}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{cart.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('subtotal')}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">৳{totals.subtotal.toLocaleString()}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">{t('discount')}</span>
                                        <span className="font-semibold text-danger-600 dark:text-danger-400">-৳{totals.discount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-900 dark:text-white">{t('total')}</span>
                                    <span className="text-primary-600 dark:text-primary-400">৳{totals.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsCheckoutOpen(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                >
                                    {t('cancel')}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCheckout}
                                    disabled={checkoutLoading}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 shadow-lg shadow-secondary-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {checkoutLoading ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        t('confirm')
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {
                    showSuccessModal && lastTransaction && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white dark:bg-surface-dark rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
                            >
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('saleComplete')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">{t('transactionRecorded' as any)}</p>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => generateInvoicePDF(lastTransaction, shopDetails, invoiceSettings)}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-700 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">print</span>
                                        {t('printReceipt' as any)}
                                    </button>
                                    <button
                                        onClick={handleSuccessModalClose}
                                        className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        {t('newSale' as any)}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence>
        </Layout>

    );
};
