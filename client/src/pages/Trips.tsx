import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/export';

export const TripsScreen: React.FC = () => {
    const { t, shopDetails, language } = useStore();
    const [trips, setTrips] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTrip, setNewTrip] = useState({
        vehicle_no: '',
        driver_name: '',
        destination: '',
        trip_fare: '',
        expenses: '',
        customer_id: ''
    });

    const fetchData = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [tripsRes, customersRes] = await Promise.all([
                api.get('/trips'),
                api.get('/customers')
            ]);
            setTrips(tripsRes.data);
            setCustomers(customersRes.data);
        } catch (error) {
            console.error("Failed to fetch trips", error);
            toast.error("Failed to load trips");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [shopDetails.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/trips', {
                ...newTrip,
                trip_fare: parseFloat(newTrip.trip_fare),
                expenses: parseFloat(newTrip.expenses || '0'),
                customer_id: newTrip.customer_id || null
            });
            toast.success("Trip recorded successfully");
            setIsModalOpen(false);
            setNewTrip({ vehicle_no: '', driver_name: '', destination: '', trip_fare: '', expenses: '', customer_id: '' });
            fetchData();
        } catch (error) {
            console.error("Failed to save trip", error);
            toast.error("Failed to save trip");
        }
    };

    const handleExport = () => {
        if (trips.length === 0) {
            toast.error("No trips to export");
            return;
        }
        const exportData = trips.map(trip => ({
            'Status': trip.status.toUpperCase(),
            'Vehicle': trip.vehicle_no,
            'Driver': trip.driver_name,
            'Destination': trip.destination,
            'Customer': trip.customer_name || 'Walking Customer',
            'Trip Fare': trip.trip_fare,
            'Expenses': trip.expenses,
            'Net Amount': (trip.trip_fare - (trip.expenses || 0)),
            'Start Date': formatDate(trip.start_date, language)
        }));
        exportToCSV(exportData, 'rental_trips');
    };

    const handleComplete = async (id: number) => {
        try {
            await api.post(`/trips/${id}/complete`);
            toast.success("Trip completed and transactions generated");
            fetchData();
        } catch (error) {
            console.error("Failed to complete trip", error);
            toast.error("Failed to complete trip");
        }
    };

    return (
        <Layout title={t('trips' as any) || 'Rental Trips'}>
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4 text-text-main dark:text-white">New Rental Trip</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-text-muted">Vehicle No</label>
                                    <input required className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.vehicle_no} onChange={e => setNewTrip({ ...newTrip, vehicle_no: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-text-muted">Driver Name</label>
                                    <input required className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.driver_name} onChange={e => setNewTrip({ ...newTrip, driver_name: e.target.value })} />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-sm font-medium text-text-muted">Destination</label>
                                    <input required className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.destination} onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-text-muted">Trip Fare (৳)</label>
                                    <input required type="number" className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.trip_fare} onChange={e => setNewTrip({ ...newTrip, trip_fare: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-text-muted">Estimated Expenses (৳)</label>
                                    <input type="number" className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.expenses} onChange={e => setNewTrip({ ...newTrip, expenses: e.target.value })} />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-sm font-medium text-text-muted">Customer (Optional)</label>
                                    <select className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" value={newTrip.customer_id} onChange={e => setNewTrip({ ...newTrip, customer_id: e.target.value })}>
                                        <option value="">Walking Customer</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 sm:col-span-2 border-t pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Start Trip</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-white">Pickup Rentals (Trips)</h2>
                        <p className="text-text-muted">Manage ongoing and completed vehicle rentals</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm whitespace-nowrap">
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            <span className="font-bold text-sm">{t('export')}</span>
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[20px]">directions_car</span>
                            <span className="font-bold text-sm">New Trip</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
                        <table className="w-full text-left min-w-[900px] border-collapse h-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Vehicle / Driver</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Destination</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Fare / Exp</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && trips.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </td>
                                    </tr>
                                ) : trips.map(trip => (
                                    <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {trip.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-main dark:text-white">{trip.vehicle_no}</div>
                                            <div className="text-xs text-text-muted">{trip.driver_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-text-main dark:text-white">{trip.destination}</div>
                                            <div className="text-xs text-text-muted">{formatDate(trip.start_date, language)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">{trip.customer_name || 'Walking Customer'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-green-600">৳{parseFloat(trip.trip_fare).toLocaleString()}</div>
                                            <div className="text-xs text-red-500">- ৳{parseFloat(trip.expenses).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {trip.status === 'ongoing' ? (
                                                <button onClick={() => handleComplete(trip.id)} className="text-primary font-bold text-sm hover:underline">Complete</button>
                                            ) : (
                                                <span className="text-text-muted text-sm">Finished</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!loading && trips.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                                            No trips found
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
