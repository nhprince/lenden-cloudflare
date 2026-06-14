import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, LineChart, Line } from 'recharts';
import { useStore } from '../context/Store';
import api from '../utils/api';
import { Transaction, Product } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { WelcomeModal } from '../components/WelcomeModal';

// Fake chart data removed

export const DashboardScreen: React.FC = () => {
    const { user, t, shopDetails, can, language } = useStore();
    const [stats, setStats] = useState<any>(null);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);

    const calculateTrend = (data: any[]) => {
        if (!data || data.length < 2) return 0;
        const first = data[0].value || 0;
        const last = data[data.length - 1].value || 0;
        if (first === 0) return last > 0 ? 100 : 0;
        return ((last - first) / first) * 100;
    };
    const trendPercentage = calculateTrend(trendData);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!shopDetails.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Use local date (YYYY-MM-DD) to avoid timezone issues
                const today = new Date().toLocaleDateString('en-CA');

                const [summaryRes, transactionsRes, lowStockRes, trendRes] = await Promise.all([
                    api.get(`/reports/summary?start_date=${today}&end_date=${today}`),
                    api.get('/transactions?limit=5'),
                    api.get('/products?low_stock=true&limit=5'),
                    api.get('/reports/trend?days=7')
                ]);

                setStats(summaryRes.data || {
                    total_sales: 0,
                    sales_count: 0,
                    total_expenses: 0,
                    product_count: 0,
                    inventory_value: 0,
                    customer_count: 0,
                    net_profit: 0
                });
                setRecentTransactions(transactionsRes.data.transactions || []);
                setLowStockProducts(lowStockRes.data.products || []);

                // Format trend data for Recharts
                const formattedTrend = trendRes.data.map((item: any) => ({
                    name: formatDate(item.date).split(',')[0], // Just get the day/month part
                    value: parseFloat(item.sales) || 0
                }));
                setTrendData(formattedTrend);

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [shopDetails.id]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">{t('loadingDashboard' as any)}</p>
                    </div>
                </div>
            </div>
        );
    }

    const StatCard = ({ title, value, icon, trend, trendUp, colorClass, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${colorClass} backdrop-blur-sm border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all group`}
        >
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-8xl">{icon}</span>
            </div>
            <div className="relative z-10">
                <p className="text-white/90 font-medium text-sm mb-2 truncate">{title}</p>
                <h3 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold mb-3 tracking-tight truncate" title={String(value)}>{value}</h3>
                {trend && (
                    <div className="flex items-center gap-2">
                        <span className={`${trendUp ? 'bg-white/20' : 'bg-white/20'} text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                            <span className="material-symbols-outlined text-[14px]">
                                {trendUp ? 'trending_up' : 'trending_down'}
                            </span>
                            {trend}
                        </span>
                        <span className="text-white/70 text-xs font-medium">{t('vsYesterday')}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );

    // Ensure stats is never null
    const safeStats = stats || {
        total_sales: 0,
        sales_count: 0,
        total_expenses: 0,
        total_purchases: 0,
        product_count: 0,
        inventory_value: 0,
        customer_count: 0,
        total_due: 0,
        active_trips: 0,
        vendor_count: 0
    };

    return (
        <Layout title={t('dashboard')}><div className="max-w-7xl mx-auto space-y-8 pb-10">
            <WelcomeModal />
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        {t('goodMorning')}, <span className="font-semibold text-gray-900 dark:text-white">{user?.name.split(' ')[0]}</span>
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {t('whatsHappening')}
                    </h1>
                </div>
                {can('view_reports') && (
                    <Link to="/reports">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-600 dark:hover:border-primary-500 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all shadow-sm hover:shadow-md"
                        >
                            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                            <span>{t('viewFullReport')}</span>
                        </motion.button>
                    </Link>
                )}
            </motion.div >

            {/* Stats Grid */}
            < div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" >
                <StatCard
                    title={t('todaysSales')}
                    value={formatCurrency(safeStats.total_sales)}
                    icon="payments"
                    colorClass="from-primary-600 to-primary-500"
                    delay={0.1}
                />
                {
                    can('view_profits') && (
                        <StatCard
                            title={t('expenses')}
                            value={formatCurrency(safeStats.total_expenses + safeStats.total_purchases)}
                            icon="receipt_long"
                            colorClass="from-danger-600 to-danger-500"
                            delay={0.2}
                        />
                    )
                }
                <StatCard
                    title={t('inventoryValue')}
                    value={formatCurrency(safeStats.inventory_value)}
                    icon="inventory_2"
                    colorClass="from-accent-600 to-accent-500"
                    delay={0.3}
                />
                <StatCard
                    title={t('totalCustomers')}
                    value={formatNumber(safeStats.customer_count)}
                    icon="people"
                    colorClass="from-purple-600 to-purple-500"
                    delay={0.4}
                />
                {(safeStats.active_trips > 0) && (
                    <StatCard
                        title={t('trips')}
                        value={safeStats.active_trips}
                        icon="directions_car"
                        colorClass="from-blue-600 to-blue-500"
                        delay={0.5}
                    />
                )}
                {can('manage_vendors') && (
                    <StatCard
                        title={t('vendors')}
                        value={safeStats.vendor_count}
                        icon="storefront"
                        colorClass="from-orange-600 to-orange-500"
                        delay={0.6}
                    />
                )}
            </div >

            {/* Charts Section */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >
                {/* Sales Chart */}
                < motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-soft hover:shadow-hard transition-all"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                {t('salesOverview')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('last7Days' as any)}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${trendPercentage >= 0 ? 'bg-secondary-100 dark:bg-secondary-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                            <span className={`material-symbols-outlined text-[16px] ${trendPercentage >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-red-600 dark:text-red-400'}`}>
                                {trendPercentage >= 0 ? 'trending_up' : 'trending_down'}
                            </span>
                            <span className={`text-xs font-bold ${trendPercentage >= 0 ? 'text-secondary-700 dark:text-secondary-300' : 'text-red-700 dark:text-red-300'}`}>
                                {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full" style={{ minHeight: '300px' }}>
                        {trendData && trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCurrency(value).replace('৳', '')}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
                                            padding: '12px'
                                        }}
                                        labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500 dark:text-gray-400">{t('noSalesData' as any)}</p>
                            </div>
                        )}
                    </div>
                </motion.div >

                {/* Orders Chart */}
                < motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-soft hover:shadow-hard transition-all"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                {t('orderActivity')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dailyOrderVolume')}</p>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-accent-100 dark:bg-accent-950/30 rounded-lg">
                            <span className="material-symbols-outlined text-accent-600 dark:text-accent-400 text-[16px]">local_fire_department</span>
                            <span className="text-xs font-bold text-accent-700 dark:text-accent-300">{t('hot')}</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full" style={{ minHeight: '300px' }}>
                        {trendData && trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={trendData}>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
                                            padding: '12px'
                                        }}
                                        labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill="#10b981"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500 dark:text-gray-400">{t('noSalesData' as any)}</p>
                            </div>
                        )}
                    </div>
                </motion.div >
            </div >

            {/* Recent Transactions & Low Stock */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >
                {/* Recent Transactions */}
                < motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-soft"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {t('recentTransactions')}
                        </h3>
                        <Link to="/transactions" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                            {t('viewAll' as any)}
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {(recentTransactions || []).filter(tx => tx && tx.amount > 0).length > 0 ? (
                            (recentTransactions || []).filter(tx => tx && tx.amount > 0).map((tx, idx) => (
                                <motion.div
                                    key={tx?.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8 + idx * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx?.status === 'Completed'
                                            ? 'bg-secondary-100 dark:bg-secondary-950/30'
                                            : 'bg-accent-100 dark:bg-accent-950/30'
                                            }`}>
                                            <span className={`material-symbols-outlined text-[20px] ${tx?.status === 'Completed'
                                                ? 'text-secondary-600 dark:text-secondary-400'
                                                : 'text-accent-600 dark:text-accent-400'
                                                }`}>
                                                {tx?.status === 'Completed' ? 'check_circle' : 'schedule'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {tx?.customerName || 'Walk-in Customer'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {tx?.orderId}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(tx?.amount || 0)}
                                        </p>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.status === 'Completed'
                                            ? 'bg-secondary-100 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300'
                                            : 'bg-accent-100 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-3">receipt_long</span>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('noTransactionsYet' as any)}</p>
                            </div>
                        )}
                    </div>
                </motion.div >

                {/* Low Stock Alerts */}
                < motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-soft"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {t('lowStockAlerts')}
                            </h3>
                            {lowStockProducts.length > 0 && (
                                <span className="bg-danger-100 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {lowStockProducts.length}
                                </span>
                            )}
                        </div>
                        <Link to="/products?filter=low_stock" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                            {t('viewAll' as any)}
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {lowStockProducts.length > 0 ? (
                            lowStockProducts.map((product, idx) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9 + idx * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-900/30 hover:border-danger-300 dark:hover:border-danger-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${import.meta.env.VITE_API_URL || 'https://api.lenden.cyberslayersagency.com'}${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`) : 'https://placehold.co/100x100?text=No+Image'}
                                            alt={product.name}
                                            className="w-10 h-10 rounded-lg object-cover bg-white dark:bg-gray-800"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                SKU: {product.sku}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-danger-600 dark:text-danger-400">
                                            {product.qty} left
                                        </p>
                                        <span className="text-xs text-danger-600 dark:text-danger-400 font-medium">
                                            Reorder now
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-3">inventory_2</span>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('allStockLevelsGood' as any)}</p>
                            </div>
                        )}
                    </div>
                </motion.div >
            </div >
        </div ></Layout>
    );
};
