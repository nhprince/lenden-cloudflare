import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/export';

interface StaffMember {
    id: string;
    name: string;
    username?: string;
    email: string;
    phone: string;
    role: string;
    salary: number;
    joining_date: string;
    status: 'active' | 'inactive';
}

const Staff = () => {
    const { t, shopDetails, can, language } = useStore();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'Staff',
        salary: 0,
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active' as 'active' | 'inactive'
    });

    const handleExport = () => {
        if (staff.length === 0) {
            toast.error("No data to export");
            return;
        }
        const exportData = staff.map(s => ({
            'Name': s.name,
            'Username': s.username || 'N/A',
            'Email': s.email || 'N/A',
            'Phone': s.phone || 'N/A',
            'Role': s.role,
            'Salary': s.salary,
            'Joining Date': s.joining_date ? formatDate(s.joining_date, language) : 'N/A',
            'Status': s.status
        }));
        exportToCSV(exportData, 'staff');
    };

    const fetchStaff = async () => {
        if (!shopDetails.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await api.get('/staff');
            setStaff(data);
        } catch (error) {
            console.error("Failed to fetch staff", error);
            toast.error("Failed to load staff list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [shopDetails.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStaff) {
                await api.put(`/staff/${editingStaff.id}`, formData);
                toast.success("Staff updated successfully");
            } else {
                await api.post('/staff', formData);
                toast.success("Staff added successfully");
            }
            setIsModalOpen(false);
            setEditingStaff(null);
            resetForm();
            fetchStaff();
        } catch (error) {
            console.error("Failed to save staff", error);
            toast.error("Failed to save staff information");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this staff member?")) return;
        try {
            await api.delete(`/staff/${id}`);
            toast.success("Staff member removed");
            fetchStaff();
        } catch (error) {
            console.error("Failed to delete staff", error);
            toast.error("Failed to remove staff member");
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            phone: '',
            role: 'Staff',
            salary: 0,
            joining_date: new Date().toISOString().split('T')[0],
            status: 'active'
        });
    };

    const openEditModal = (member: StaffMember) => {
        setEditingStaff(member);
        setFormData({
            name: member.name,
            username: member.username || '',
            email: member.email || '',
            password: '', // Leave blank when editing unless changing
            phone: member.phone || '',
            role: member.role || 'Staff',
            salary: member.salary || 0,
            joining_date: member.joining_date ? member.joining_date.split('T')[0] : '',
            status: member.status || 'active'
        });
        setIsModalOpen(true);
    };

    return (
        <Layout title={t('staff')}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-text-main dark:text-white">Team Members</h3>
                        <p className="text-sm text-text-muted mt-1">Manage rolls, permissions and payroll for your shop staff.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleExport}
                            className="bg-white dark:bg-surface-dark border-2 border-primary/20 dark:border-primary/10 text-primary px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-primary/5 transition-all active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            <span>CSV</span>
                        </button>
                        {can('manage_staff') && (
                            <button
                                onClick={() => { resetForm(); setEditingStaff(null); setIsModalOpen(true); }}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                <span>{t('addStaff' as any)}</span>
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : staff.length === 0 ? (
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-12 border border-[#f0f2f5] dark:border-[#2d3748] text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-[#111621] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f0f2f5] dark:border-[#2d3748]">
                            <span className="material-symbols-outlined text-4xl text-text-muted/40 font-light">group</span>
                        </div>
                        <h4 className="text-lg font-bold text-text-main dark:text-white">No staff found</h4>
                        <p className="text-sm text-text-muted max-w-xs mx-auto mt-2">Start by adding your first employee to manage their performance and salary.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {staff.map((member) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={member.id}
                                className="bg-white dark:bg-surface-dark rounded-3xl border border-[#f0f2f5] dark:border-[#2d3748] shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center border border-primary/10 group-hover:from-primary group-hover:to-blue-600 transition-all duration-500">
                                            <span className="material-symbols-outlined text-primary text-2xl group-hover:text-white transition-colors">
                                                {member.role?.toLowerCase() === 'owner' ? 'shield_person' : member.role?.toLowerCase() === 'manager' ? 'manage_accounts' : 'person'}
                                            </span>
                                        </div>
                                        {can('manage_staff') && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(member)} className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(member.id)} className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-text-main dark:text-white truncate">{member.name}</h4>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary uppercase tracking-wider mt-1 border border-primary/20">{member.role}</span>
                                    </div>
                                    <div className="mt-6 space-y-3 border-t border-[#f0f2f5] dark:border-[#2d3748] pt-6">
                                        <div className="flex items-center gap-3 text-text-muted">
                                            <span className="material-symbols-outlined text-[18px]">call</span>
                                            <span className="text-xs font-semibold">{member.phone || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-text-muted">
                                            <span className="material-symbols-outlined text-[18px]">mail</span>
                                            <span className="text-xs font-semibold truncate uppercase tracking-tighter">{member.email || 'No email'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-text-muted">
                                            <span className="material-symbols-outlined text-[18px]">payments</span>
                                            <span className="text-xs font-black text-secondary">৳{member.salary?.toLocaleString()} / month</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-6 py-4 flex items-center justify-between ${member.status === 'active' ? 'bg-green-50/50 dark:bg-green-400/5' : 'bg-red-50/50 dark:bg-red-400/5'} border-t border-[#f0f2f5] dark:border-[#2d3748]`}>
                                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Status</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className={`text-[10px] font-black uppercase ${member.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{member.status}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
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
                            className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-[2rem] shadow-2xl overflow-hidden border border-[#f0f2f5] dark:border-[#2d3748]"
                        >
                            <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-[#f0f2f5] dark:border-[#2d3748]">
                                <div>
                                    <h4 className="text-2xl font-black text-text-main dark:text-white capitalize tracking-tight">{editingStaff ? 'Update Staff Info' : 'Add New Member'}</h4>
                                    <p className="text-xs text-text-muted mt-1 uppercase font-bold tracking-[0.1em]">Employee Details</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-[#111621] text-text-muted hover:text-primary transition-all active:scale-95 border border-[#f0f2f5] dark:border-[#2d3748]">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Staff Name</label>
                                        <input
                                            required
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Username (Login ID)</label>
                                        <input
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="staff_01"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="017xxxxxxxx"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="staff@lenden.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">
                                            {editingStaff ? 'New Password (Optional)' : 'Staff Password'}
                                        </label>
                                        <input
                                            type="password"
                                            required={!editingStaff}
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Job Role</label>
                                        <input
                                            list="roles"
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="Select or type role"
                                        />
                                        <datalist id="roles">
                                            <option value="Manager" />
                                            <option value="Salesman" />
                                            <option value="Technician" />
                                            <option value="Accountant" />
                                            <option value="Staff" />
                                        </datalist>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Monthly Salary</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-10 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                                value={formData.salary}
                                                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Joining Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={formData.joining_date}
                                            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted dark:text-gray-400 uppercase tracking-widest ml-1">Active Status</label>
                                        <select
                                            className="w-full bg-[#f8fafc] dark:bg-[#111621] border border-[#e5e7eb] dark:border-[#2d3748] rounded-2xl px-5 py-4 text-sm font-bold text-text-main dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        >
                                            <option value="active">Active (On Duty)</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4 sticky bottom-0 bg-white dark:bg-surface-dark pb-4 border-t border-[#f0f2f5] dark:border-[#2d3748]">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-text-muted hover:bg-gray-50 dark:hover:bg-[#111621] transition-all active:scale-95 border border-[#e5e7eb] dark:border-[#2d3748]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                        <span>{editingStaff ? 'Update Staff Member' : 'Add Member Now'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default Staff;
