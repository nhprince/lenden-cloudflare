import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../context/Store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Vendor, Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PurchaseModalProps {
    vendor: Vendor;
    onClose: () => void;
    onSuccess: () => void;
}

interface PurchaseItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ vendor, onClose, onSuccess }) => {
    const { t } = useStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<PurchaseItem[]>([]);
    const [searchResults, setSearchResults] = useState<Product[]>([]);

    // Payment details
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'due'>('cash');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products?limit=1000'); // Fetch all for now, optimize later with search API
            setProducts(res.data.products);
        } catch (error) {
            console.error("Failed to fetch products");
        }
    };

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter(p =>
            p.name.toLowerCase().includes(lowerTerm) ||
            p.sku.toLowerCase().includes(lowerTerm)
        );
        setSearchResults(results);
    }, [searchTerm, products]);

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            toast.error("Product already in list");
            return;
        }

        setCart([...cart, {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.cost_price || 0,
            subtotal: (product.cost_price || 0) * 1
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const updateItem = (index: number, field: 'quantity' | 'unit_price', value: number) => {
        const newCart = [...cart];
        const item = newCart[index];

        if (value < 0) return;

        if (field === 'quantity') item.quantity = value;
        if (field === 'unit_price') item.unit_price = value;

        item.subtotal = item.quantity * item.unit_price;
        setCart(newCart);
    };

    const removeItem = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const calculateTotals = () => {
        const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
        return { totalAmount };
    };

    const { totalAmount } = calculateTotals();

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error("Please add at least one product");
            return;
        }

        const paid = Number(paidAmount) || 0;
        if (paid > totalAmount) {
            toast.error("Paid amount cannot exceed total amount");
            return;
        }

        setLoading(true);
        try {
            const purchaseData = {
                vendor_id: vendor.id,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.subtotal
                })),
                total_amount: totalAmount,
                paid_amount: paid,
                payment_method: paymentMethod,
                note: notes
            };

            await api.post('/transactions/purchase', purchaseData);
            toast.success("Purchase recorded successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Purchase failed", error);
            toast.error(error.response?.data?.message || "Failed to record purchase");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('recordPurchase' as any)}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Vendor: <span className="font-semibold text-primary-600 dark:text-primary-400">{vendor.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Product Selection & List */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 dark:border-gray-700">
                        {/* Search */}
                        <div className="relative mb-6">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search products to add..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-10">
                                    {searchResults.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b border-gray-50 dark:border-gray-700 last:border-0"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(product.cost_price || 0)}</p>
                                                <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product List */}
                        <div className="space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">production_quantity_limits</span>
                                    <p>No items added yet</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={item.product_id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 relative group">
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>

                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{item.product_name}</h4>
                                            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</span>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-1 block">Cost Price</label>
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm focus:border-primary-500 outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => updateItem(idx, 'quantity', item.quantity - 1)}
                                                        className="w-8 h-[38px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-l-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                        className="w-full h-[38px] text-center bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-600 text-sm focus:border-primary-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
                                                        className="w-8 h-[38px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-r-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Totals & Payment */}
                    <div className="w-full md:w-80 p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span className="text-gray-900 dark:text-white">Total Amount</span>
                                <span className="text-primary-600 dark:text-primary-400">{formatCurrency(totalAmount)}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Paid Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">৳</span>
                                    <input
                                        type="number"
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {Number(paidAmount) < totalAmount && (
                                <div className="flex justify-between text-sm text-red-500 font-medium px-1">
                                    <span>Due Amount:</span>
                                    <span>{formatCurrency(totalAmount - Number(paidAmount))}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Method
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['cash', 'bank', 'due'] as const).map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${paymentMethod === method
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm resize-none"
                                    placeholder="Add any additional notes..."
                                />
                            </div>
                        </div>

                        <div className="mt-auto space-y-3">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                <span>Confirm Purchase</span>
                            </button>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
