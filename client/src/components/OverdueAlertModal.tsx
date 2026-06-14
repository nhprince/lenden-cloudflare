import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../types';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatters';
import { useStore } from '../context/Store';

interface OverdueAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    overdueTransactions: Transaction[];
}

const OverdueAlertModal: FC<OverdueAlertModalProps> = ({ isOpen, onClose, overdueTransactions }) => {
    const navigate = useNavigate();
    const { t, language } = useStore();

    const totalOverdue = overdueTransactions.reduce((sum, t) => {
        const due = (t.due_amount || (t.amount - (t.paid_amount || 0)));
        return sum + due;
    }, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 flex gap-4 border-b border-red-100 dark:border-red-800/50">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{language === 'bn' ? 'বকেয়া পেমেন্ট সতর্কতা' : 'Overdue Payments Alert'}</h2>
                                <p className="text-gray-600 dark:text-gray-300 mt-1">
                                    {language === 'bn' ? (
                                        <>
                                            আপনার <span className="font-bold text-red-600 dark:text-red-400">{overdueTransactions.length}</span> টি লেনদেন নির্ধারিত তারিখের পরে রয়েছে।
                                        </>
                                    ) : (
                                        <>
                                            You have <span className="font-bold text-red-600 dark:text-red-400">{overdueTransactions.length}</span> transaction(s) that are past due date.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">{language === 'bn' ? 'মনোযোগ প্রয়োজন এমন লেনদেন' : 'Transactions requiring attention'}</h3>
                            <div className="space-y-3">
                                {overdueTransactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900 transition-colors">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">
                                                {t.customerName || 'Customer'}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                {language === 'bn' ? 'নির্ধারিত তারিখ' : 'Due'}: {t.due_date ? formatDate(t.due_date, language) : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600 dark:text-red-400">
                                                ৳{(t.due_amount || (t.amount - (t.paid_amount || 0))).toLocaleString()}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    // This would ideally open the transaction details, 
                                                    // but for now we just close and let user find it. 
                                                    // Implementing "View" would require passing a handler or route change.
                                                }}
                                                className="text-xs font-bold text-primary-600 hover:text-primary-700 mt-1"
                                            >
                                                {language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">{language === 'bn' ? 'মোট বকেয়া' : 'Total Overdue'}</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">৳{totalOverdue.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                            >
                                {language === 'bn' ? 'বুঝেছি' : 'Acknowledge'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OverdueAlertModal;
