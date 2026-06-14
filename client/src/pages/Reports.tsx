import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';

export const ReportsScreen = () => {
    const { t, shopDetails } = useStore();
    const [summary, setSummary] = useState<any>(null);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [summaryRes, trendRes, distRes] = await Promise.all([
                api.get('/reports/summary'),
                api.get('/reports/trend'),
                api.get('/reports/distribution')
            ]);
            setSummary(summaryRes.data);

            // Format trend data for display
            const formattedTrend = trendRes.data.map((item: any) => ({
                date: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                sales: parseFloat(item.sales)
            }));
            setTrendData(formattedTrend);
            setDistributionData(distRes.data);
        } catch (error) {
            console.error("Failed to fetch report data", error);
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [shopDetails.id]);

    const COLORS = ['#1754cf', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title={t('reports')}><div className="max-w-7xl mx-auto flex flex-col gap-6 pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-white">{t('performanceAnalytics')}</h2>
                    <p className="text-text-muted">{t('financialHealthOverview' as any)}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const headers = ['Date', 'Sales'];
                            const csvContent = [
                                headers.join(','),
                                ...trendData.map(row => `${row.date},${row.sales}`)
                            ].join('\n');

                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            if (link.download !== undefined) {
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                            toast.success('CSV exported successfully!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        Export CSV
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                if (!summary) {
                                    toast.error('Please wait for data to load');
                                    return;
                                }
                                const { generateReportPDF } = await import('../utils/reportPdfGenerator');
                                const today = new Date().toISOString().split('T')[0];
                                generateReportPDF(summary, shopDetails, { start: today, end: today });
                                toast.success('PDF generated successfully!');
                            } catch (error) {
                                console.error('PDF generation error:', error);
                                toast.error('Failed to generate PDF');
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium shadow-sm hover:bg-red-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                        Export PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-text-muted text-sm font-medium mb-2">{t('totalRevenue')}</p>
                    <h3 className="text-3xl font-bold text-text-main dark:text-white">{formatCurrency(summary?.total_sales || 0)}</h3>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-text-muted text-sm font-medium mb-2">{t('transactions')}</p>
                    <h3 className="text-3xl font-bold text-text-main dark:text-white">{summary?.sales_count || 0}</h3>
                    <div className="mt-2 text-text-muted text-sm">{t('totalOrdersProcessed' as any)}</div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-text-muted text-sm font-medium mb-2">{t('avgOrderValue')}</p>
                    <h3 className="text-3xl font-bold text-text-main dark:text-white">
                        {formatCurrency(summary?.sales_count > 0 ? (summary.total_sales / summary.sales_count) : 0)}
                    </h3>
                    <div className="mt-2 text-text-muted text-sm">{t('perTransaction' as any)}</div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-text-muted text-sm font-medium mb-2">{t('pendingPayments')}</p>
                    <h3 className="text-3xl font-bold text-amber-500">{formatCurrency(summary?.pending_amount || 0)}</h3>
                    <div className="mt-2 text-amber-600/70 text-sm font-medium">{t('needsAttention' as any)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Chart */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-6">{t('salesTrend7Days' as any)}</h3>
                    <div className="flex-1 w-full min-h-[280px] overflow-hidden">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb33" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                                        cursor={{ fill: '#f3f4f6' }}
                                    />
                                    <Bar dataKey="sales" fill="#1754cf" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-muted">{t('noSalesData' as any)}</div>
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-6">{t('inventoryDistribution' as any)}</h3>
                    <div className="flex-1 w-full min-h-[280px] overflow-hidden">
                        {distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distributionData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-muted">{t('noInventoryData' as any)}</div>
                        )}
                    </div>
                    <div className="flex justify-center flex-wrap gap-4 mt-[-20px] pb-2">
                        {distributionData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-sm text-text-muted">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div ></Layout>
    );
};