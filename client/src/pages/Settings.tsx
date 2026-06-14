import React, { useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useStore } from '../context/Store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const SettingsScreen: React.FC = () => {
    const {
        shopDetails, updateShopDetails,
        invoiceSettings, updateInvoiceSettings,
        user, updateUserProfile,
        t
    } = useStore();


    // Local state for forms to handle inputs before saving
    const [shopForm, setShopForm] = useState(shopDetails);
    const [invoiceForm, setInvoiceForm] = useState(invoiceSettings);

    const [activeTab, setActiveTab] = useState<'shop' | 'invoice' | 'user' | 'security' | 'data'>('shop');
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userFileInputRef = useRef<HTMLInputElement>(null);

    // Initial user form state including potential profile_picture if available in user object
    // Note: user object might not have profile_picture yet, we might need to update type or just cast it
    const [userForm, setUserForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        profile_picture: (user as any)?.profile_picture || null
    });

    const handleUserAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserForm({ ...userForm, profile_picture: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const { changePassword } = useStore();

    const handleFetchRecoveryCode = async () => {
        try {
            const res = await api.get('/auth/recovery-code');
            setRecoveryCode(res.data.recovery_code);
            setShowCode(true);
        } catch (error) {
            toast.error("Failed to fetch recovery code");
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setIsPasswordLoading(true);
        const success = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
        if (success) {
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        }
        setIsPasswordLoading(false);
    };

    const handleSaveShop = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!shopForm.name.trim()) {
            toast.error("Shop name is required");
            return;
        }

        if (shopForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopForm.email)) {
            toast.error("Invalid shop email address");
            return;
        }

        try {
            await api.put(`/shops/${shopDetails.id}`, shopForm);
            updateShopDetails(shopForm);
            toast.success(t('savedSuccessfully'));
        } catch (error) {
            console.error("Failed to save shop settings", error);
            toast.error("Failed to save settings");
        }
    };

    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Invoice settings are currently part of shop details in the backend update
            await api.put(`/shops/${shopDetails.id}`, {
                ...shopForm,
                header_title: invoiceForm.headerTitle,
                footer_note: invoiceForm.footerNote,
                terms: invoiceForm.terms,
                show_logo: invoiceForm.showLogo
            });
            updateInvoiceSettings(invoiceForm);
            toast.success(t('savedSuccessfully'));
        } catch (error) {
            console.error("Failed to save invoice settings", error);
            toast.error("Failed to save settings");
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userForm.name.trim()) {
            toast.error("User name is required");
            return;
        }

        if (!userForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
            toast.error("Invalid user email address");
            return;
        }

        try {
            await api.put('/auth/profile', userForm);
            updateUserProfile(userForm);
            toast.success(t('savedSuccessfully'));
        } catch (error) {
            console.error("Failed to save user profile", error);
            toast.error("Failed to save settings");
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setShopForm({ ...shopForm, logoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExportBackup = async () => {
        try {
            const response = await api.get('/backup/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lenden_backup_${shopDetails.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Backup downloaded successfully");
        } catch (error) {
            console.error("Backup export failed", error);
            toast.error("Failed to export backup");
        }
    };

    // Fetch shop settings on mount to get latest invoice config
    React.useEffect(() => {
        const fetchShopSettings = async () => {
            if (!shopDetails?.id) return;
            try {
                const res = await api.get(`/shops/${shopDetails.id}`);
                const data = res.data;

                // Update invoice form with fetched data
                setInvoiceForm(prev => ({
                    headerTitle: data.header_title || '',
                    footerNote: data.footer_note || '',
                    terms: data.terms || '',
                    showLogo: data.show_logo !== undefined ? Boolean(data.show_logo) : true,
                    currencySymbol: prev.currencySymbol // Keep existing or default
                }));

                // Also update shop form to ensure it's in sync
                setShopForm(prev => ({
                    ...prev,
                    ...data,
                    logoUrl: data.logo_url || data.logoUrl || prev.logoUrl // Ensure camelCase mapping
                }));
            } catch (error) {
                console.error('Failed to load shop settings', error);
            }
        };
        fetchShopSettings();
    }, [shopDetails?.id]);

    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonObj = JSON.parse(event.target?.result as string);
                await api.post('/backup/import', { backupData: jsonObj });
                toast.success("Backup import processed");
            } catch (error) {
                console.error("Import failed", error);
                toast.error("Invalid backup file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <Layout title={t('settings')}><div className="max-w-4xl mx-auto pb-10">

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'shop' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <span className="material-symbols-outlined">storefront</span>
                        <span className="font-medium">{t('shopProfile')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('invoice')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'invoice' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <span className="material-symbols-outlined">receipt_long</span>
                        <span className="font-medium">{t('invoiceSettings')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('user')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'user' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <span className="material-symbols-outlined">person</span>
                        <span className="font-medium">{t('userProfile')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <span className="material-symbols-outlined">shield</span>
                        <span className="font-medium">{t('security')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'data' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <span className="material-symbols-outlined">database</span>
                        <span className="font-medium">{t('dataBackup')}</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {/* Shop Profile Tab */}
                    {activeTab === 'shop' && (
                        <form onSubmit={handleSaveShop} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in duration-300">
                            <h3 className="text-xl font-bold mb-6 text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">storefront</span>
                                {t('shopProfile')}
                            </h3>

                            <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors relative group"
                                    >
                                        {shopForm.logoUrl ? (
                                            <img src={shopForm.logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-text-main dark:text-white">Shop Logo</h4>
                                        <p className="text-sm text-text-muted mb-2">Recommended size 200x200px</p>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-primary font-medium hover:underline">Upload new image</button>
                                        <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('name')}</label>
                                        <input
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={shopForm.name}
                                            onChange={e => setShopForm({ ...shopForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('address')}</label>
                                        <textarea
                                            rows={3}
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={shopForm.address}
                                            onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">{t('phone')}</label>
                                            <input
                                                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                                value={shopForm.phone}
                                                onChange={e => setShopForm({ ...shopForm, phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">{t('email')}</label>
                                            <input
                                                type="email"
                                                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                                value={shopForm.email}
                                                onChange={e => setShopForm({ ...shopForm, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('website')}</label>
                                        <input
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={shopForm.website}
                                            onChange={e => setShopForm({ ...shopForm, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                    <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                        {t('saveChanges')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Invoice Settings Tab */}
                    {activeTab === 'invoice' && (
                        <form onSubmit={handleSaveInvoice} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in duration-300">
                            <h3 className="text-xl font-bold mb-6 text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                {t('invoiceSettings')}
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('invoiceTitle')}</label>
                                        <input
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            placeholder="e.g. INVOICE, MEMO, BILL"
                                            value={invoiceForm.headerTitle}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, headerTitle: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('footerNote')}</label>
                                        <input
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            placeholder="e.g. Thank you for your business!"
                                            value={invoiceForm.footerNote}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, footerNote: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('termsConditions')}</label>
                                        <textarea
                                            rows={4}
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            placeholder="Enter terms and conditions..."
                                            value={invoiceForm.terms}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="showLogo"
                                            checked={invoiceForm.showLogo}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, showLogo: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="showLogo" className="text-sm font-medium text-text-main dark:text-white">Show Shop Logo on Invoice</label>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                    <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                        {t('saveChanges')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* User Profile Tab */}
                    {activeTab === 'user' && (
                        <form onSubmit={handleSaveUser} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in duration-300">
                            <h3 className="text-xl font-bold mb-6 text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person</span>
                                {t('userProfile')}
                            </h3>

                            <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div
                                        onClick={() => userFileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors relative group"
                                    >
                                        {(userForm.profile_picture || user?.avatarUrl) ? (
                                            <img src={userForm.profile_picture || user?.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-text-main dark:text-white">{user?.name}</h4>
                                        <p className="text-sm text-text-muted">{user?.role}</p>
                                        <button type="button" onClick={() => userFileInputRef.current?.click()} className="text-sm text-primary font-medium hover:underline mt-1">Change profile picture</button>
                                        <input type="file" ref={userFileInputRef} onChange={handleUserAvatarChange} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('name')}</label>
                                        <input
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={userForm.name}
                                            onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('email')}</label>
                                        <input
                                            type="email"
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                    <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                        {t('saveChanges')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Password Change Section */}
                            <form onSubmit={handlePasswordChange} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                                <h3 className="text-xl font-bold mb-6 text-text-main dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">lock</span>
                                    {t('changePassword')}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1">{t('oldPassword')}</label>
                                        <input
                                            required
                                            type="password"
                                            className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                            value={passwordForm.oldPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">{t('newPassword')}</label>
                                            <input
                                                required
                                                type="password"
                                                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                                value={passwordForm.newPassword}
                                                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1">{t('confirmPassword')}</label>
                                            <input
                                                required
                                                type="password"
                                                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                                value={passwordForm.confirmPassword}
                                                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isPasswordLoading}
                                            className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {isPasswordLoading ? 'Updating...' : t('changePassword')}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Recovery Code Section (Owners Only) */}
                            {(user?.role === 'owner' || user?.role === 'admin') && (
                                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                                    <h3 className="text-xl font-bold mb-2 text-text-main dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">vaping_rooms</span>
                                        {t('accountRecovery')}
                                    </h3>
                                    <p className="text-sm text-text-muted mb-6">Use this code to recover your account if you lose access to your email.</p>

                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 flex flex-col items-center">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="px-6 py-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary/20 font-mono text-2xl font-bold tracking-widest text-primary shadow-inner">
                                                {showCode ? (recoveryCode || '********') : '********'}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => showCode ? setShowCode(false) : handleFetchRecoveryCode()}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined">{showCode ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-center text-red-500 font-medium max-w-sm">
                                            WARNING: Store this code securely. Anyone with this code can reset your account password.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data Backup & Restore Tab */}
                    {activeTab === 'data' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                                <h3 className="text-xl font-bold mb-2 text-text-main dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">cloud_download</span>
                                    {t('exportData')}
                                </h3>
                                <p className="text-sm text-text-muted mb-6">{t('backupDescription')}</p>

                                <button
                                    onClick={handleExportBackup}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined">download</span>
                                    {t('exportData')}
                                </button>
                            </div>

                            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                                <h3 className="text-xl font-bold mb-2 text-text-main dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">cloud_upload</span>
                                    {t('importData')}
                                </h3>
                                <p className="text-sm text-text-muted mb-4">{t('importDescription')}</p>

                                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-800/30 p-4 rounded-xl mb-6">
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">warning</span>
                                        {t('restoreWarning')}
                                    </p>
                                </div>

                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary transition-all bg-gray-50 dark:bg-gray-900/50 group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all mb-2">upload_file</span>
                                        <p className="text-sm text-gray-500 font-bold">Click to upload backup file</p>
                                    </div>
                                    <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div></Layout>
    );
};