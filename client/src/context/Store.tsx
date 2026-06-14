import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Transaction, Customer, User, ShopDetails, InvoiceSettings } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Translation Dictionary
const translations = {
    en: {
        // Navigation
        dashboard: "Dashboard",
        pos: "POS",
        inventory: "Inventory",
        transactions: "Transactions",
        customers: "Customers",
        vendors: "Vendors",
        reports: "Reports",
        expenses: "Expenses",
        services: "Services",
        trips: "Rental Trips",
        settings: "Settings",
        staff: "Staff",
        purchases: "Purchases",
        logout: "Log out",

        // Common Actions
        name: "Name",
        customer: "Customer",
        addNew: "Add New",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        view: "View",
        search: "Search...",
        export: "Export",
        print: "Print",
        confirm: "Confirm",
        back: "Back",
        actions: "Actions",
        submit: "Submit",
        update: "Update",
        searchOrType: "Search or type...",
        newCustomerEntry: "New Customer Entry",
        allItems: "All Items",
        stockValue: "Stock Value",
        profitPerUnit: "Profit Per Unit",
        margin: "Margin",
        completeRegistration: "Complete Registration",

        // POS & Sales
        newSale: "New Sale",
        viewAll: "View All",
        walkInCustomer: "Walk-in Customer",
        searchProduct: "Search products...",
        cart: "Cart",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        total: "Total",
        checkout: "Checkout",
        payNow: "Pay Now",
        paymentMethod: "Payment Method",
        mobilePayment: "Mobile Pay",
        mobile: "Mobile Pay",
        card: "Card",
        cash: "Cash",
        due: "Due",
        paid: "Paid",
        change: "Change",
        receipt: "Receipt",
        saleComplete: "Sale Completed",
        items: "Items",
        quantity: "Qty",
        price: "Price",
        stock: "Stock",
        outOfStock: "Out of Stock",
        lowStock: "Low Stock",
        addToCart: "Add to Cart",
        clearCart: "Clear Cart",
        note: "Note",
        completed: "Completed",
        pending: "Pending",
        cancelled: "Cancelled",
        bkash: "bKash",
        bank: "Bank Transfer",

        // Products
        addProduct: "Add Product",
        editProduct: "Edit Product",
        productName: "Product Name",
        sku: "SKU / Barcode",
        category: "Category",
        costPrice: "Cost Price",
        sellingPrice: "Selling Price",
        stockQuantity: "Stock Quantity",
        unit: "Unit",
        description: "Description",
        image: "Image",
        lowStockAlert: "Low Stock Alert",
        supplier: "Supplier",
        brand: "Brand",
        model: "Model",

        // Customers
        addCustomer: "Add Customer",
        editCustomer: "Edit Customer",
        customerName: "Customer Name",
        phone: "Phone",
        email: "Email",
        address: "Address",
        totalSpent: "Total Spent",
        totalDue: "Total Due",
        lastVisit: "Last Visit",
        customerHistory: "Customer History",
        makePayment: "Make Payment",
        collectDue: "Collect Due",

        // Vendors
        addVendor: "Add Vendor",
        editVendor: "Edit Vendor",
        vendorName: "Vendor Name",
        companyName: "Company Name",
        payable: "Payable",
        totalPurchases: "Total Purchases",
        recordPurchase: "Record Purchase",
        payVendor: "Pay Vendor",
        vendorHistory: "Vendor History",

        // Expenses
        recordExpense: "Record Expense",
        expenseType: "Expense Type",
        amount: "Amount",
        date: "Date",
        expenseCategory: "Category",

        // Reports
        salesReport: "Sales Report",
        expenseReport: "Expense Report",
        profitReport: "Profit & Loss",
        inventoryReport: "Inventory Report",
        customerReport: "Customer Report",
        dailySummary: "Daily Summary",
        monthlySummary: "Monthly Summary",
        dateRange: "Date Range",
        totalRevenue: "Total Revenue",
        totalProfit: "Total Profit",
        totalExpenses: "Total Expenses",
        netIncome: "Net Income",
        topSelling: "Top Selling",

        // Staff
        addStaff: "Add Staff",
        role: "Role",
        permissions: "Permissions",
        active: "Active",
        inactive: "Inactive",
        salary: "Salary",
        joiningDate: "Joining Date",

        // Shop Settings
        shopName: "Shop Name",
        shopAddress: "Shop Address",
        shopPhone: "Shop Phone",
        currency: "Currency",
        language: "Language",
        invoiceFooter: "Invoice Footer",
        logo: "Logo",
        shopProfile: "Shop Profile",
        invoiceSettings: "Invoice Settings",
        userProfile: "User Profile",
        security: "Security",
        website: "Website",
        invoiceTitle: "Invoice Title",
        footerNote: "Footer Note",
        termsConditions: "Terms & Conditions",

        // Messages
        success: "Success",
        error: "Error",
        savedSuccessfully: "Saved successfully",
        saveChanges: "Save Changes",
        changePassword: "Change Password",
        oldPassword: "Old Password",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        accountRecovery: "Account Recovery",
        deletedSuccessfully: "Deleted successfully",
        confirmDelete: "Are you sure you want to delete?",
        fillRequired: "Please fill all required fields",
        loginSuccess: "Login successful",
        loginFailed: "Login failed",
        noProductsFound: "No products found",
        businessReports: "Business Reports",
        performanceAnalytics: "Performance Analytics",
        avgOrderValue: "Avg. Order Value",
        pendingPayments: "Pending Payments",
        lowStockAlerts: "Low Stock Alerts",

        // Dashboard
        goodMorning: "Good morning",
        todaysSales: "Today's Sales",
        inventoryValue: "Inventory Value",
        totalCustomers: "Total Customers",
        salesOverview: "Sales Overview",
        recentTransactions: "Recent Transactions",
        whatsHappening: "What's happening today",
        viewFullReport: "View Full Report",
        orderActivity: "Order Activity",
        dailyOrderVolume: "Daily Order Volume",
        hot: "Hot",
        vsYesterday: "vs Yesterday",
        cartIsEmpty: "Cart is empty",
        addProductsToGetStarted: "Add products to get started",
        completeSale: "Complete Sale",
        transactionRecorded: "Transaction has been recorded successfully.",
        printReceipt: "Print Receipt",
        newCustomer: "New Customer",
        noTransactionsFound: "No transactions found",
        allTransactions: "All Transactions",
        paymentOverdue: "Payment Overdue",
        overdueMessage: "This transaction is more than 30 days old and still has a pending balance.",
        status: "Status",
        orderId: "Order ID",
        markPaid: "Mark as Paid",
        dataBackup: "Data Backup",
        exportData: "Export All Data",
        importData: "Import Data",
        backupDescription: "Download a backup of all your shop data (Products, Transactions, Customers, etc.) in JSON format.",
        importDescription: "Restore your shop data from a previously exported JSON backup file.",
        restoreWarning: "Restoring data will merge records. Ensure your backup file is from this shop.",
        inventorySubtitle: "Manage your shop's stock levels, track pricing, and organize inventory efficiently.",
        inventoryManagement: "Inventory Management",
        uploadPhoto: "Upload Photo",
        stockLevel: "Stock Level",
        retailPrice: "Retail Price",
        industrySpecificData: "Industry Specific Data",
        engineNumber: "Engine Number",
        chassisNumber: "Chassis Number",
        modelYear: "Model Year",
        materialProductionCost: "Material Production Cost",
        selectYear: "Select Year",
        registerProduct: "Register New Product",
        loadingDashboard: "Loading dashboard...",
        last7Days: "Last 7 Days",
        noTransactionsYet: "No transactions yet",
        allStockLevelsGood: "All stock levels are good",
        financialHealthOverview: "Overview of your shop's financial health",
        totalOrdersProcessed: "Total orders processed",
        perTransaction: "Per transaction",
        needsAttention: "Needs attention",
        salesTrend7Days: "Sales Trend (Last 7 Days)",
        noSalesData: "No sales data available",
        inventoryDistribution: "Inventory Distribution",
        noInventoryData: "No inventory data available",
    },
    bn: {
        // Navigation
        dashboard: "ড্যাশবোর্ড",
        pos: "বিক্রয় কেন্দ্র",
        inventory: "মজুদ পণ্য",
        transactions: "লেনদেন",
        customers: "গ্রাহক তালিকা",
        vendors: "সরবরাহকারী",
        reports: "রিপোর্ট",
        expenses: "খরচপাতি",
        services: "সেবাসমূহ",
        trips: "রেন্টাল ট্রিপ",
        settings: "সেটিংস",
        staff: "কর্মচারী",
        purchases: "ক্রয়",
        logout: "লগ আউট",

        // Common Actions
        name: "নাম",
        customer: "গ্রাহক",
        addNew: "নতুন যোগ করুন",
        edit: "সম্পাদনা",
        delete: "মুছুন",
        save: "সংরক্ষণ",
        cancel: "বাতিল",
        view: "দেখুন",
        search: "অনুসন্ধান...",
        export: "এক্সপোর্ট",
        print: "প্রিন্ট",
        confirm: "নিশ্চিত করুন",
        back: "ফিরে যান",
        actions: "পদক্ষেপ",

        submit: "জমা দিন",
        update: "আপডেট",
        allItems: "সব পণ্য",
        stockValue: "মজুদ মূল্য",
        profitPerUnit: "প্রতি এককে লাভ",
        margin: "মার্জিন",
        completeRegistration: "নিবন্ধন সম্পন্ন করুন",

        // Analytics & Alerts
        avgOrderValue: "গড় অর্ডার মূল্য",
        pendingPayments: "পেমেন্ট বাকি",
        lowStockAlerts: "স্টক অ্যালার্ট",

        // POS & Sales
        newSale: "নতুন বিক্রয়",
        viewAll: "সব দেখুন",
        walkInCustomer: "সাধারণ গ্রাহক",
        searchProduct: "পণ্য খুঁজুন...",
        cart: "কার্ট",
        subtotal: "সাবটোটাল",
        discount: "ছাড়",
        tax: "ভ্যাট/ট্যাক্স",
        total: "সর্বমোট",
        checkout: "চেকআউট",
        payNow: "পেমেন্ট নিন",
        paymentMethod: "পেমেন্ট মাধ্যম",
        cash: "নগদ",
        card: "কার্ড",
        mobilePayment: "মোবাইল পেমেন্ট",
        due: "বাকি",
        paid: "পরিশোধিত",
        change: "ফেরত",
        receipt: "রশিদ",
        saleComplete: "বিক্রয় সম্পন্ন",
        items: "আইটেম",
        quantity: "পরিমাণ",
        price: "মূল্য",
        stock: "মজুদ",
        outOfStock: "স্টক শেষ",
        lowStock: "স্বল্প মজুদ",
        addToCart: "কার্টে যোগ করুন",
        clearCart: "কার্ট খালি করুন",
        note: "নোট",
        completed: "সম্পন্ন",
        pending: "অপেক্ষমান",
        cancelled: "বাতিল",
        bkash: "বিকাশ",
        bank: "ব্যাংক ট্রান্সফার",
        mobile: "মোবাইল পেমেন্ট",

        // Products
        addProduct: "পণ্য যোগ করুন",
        editProduct: "পণ্য সম্পাদনা",
        productName: "পণ্যের নাম",
        sku: "কোড / বারকোড",
        category: "ক্যাটাগরি",
        costPrice: "ক্রয় মূল্য",
        sellingPrice: "বিক্রয় মূল্য",
        stockQuantity: "মজুদ পরিমাণ",
        unit: "একক",
        description: "বিবরণ",
        // Products (Continued)
        image: "ছবি",
        lowStockAlert: "সতর্কতা লেভেল",
        supplier: "সরবরাহকারী",
        brand: "ব্র্যান্ড",
        model: "মডেল",

        // POS - Missing Keys
        searchOrType: "অনুসন্ধান বা লিখুন...",
        newCustomerEntry: "নতুন গ্রাহক এন্ট্রি",

        // Customers
        addCustomer: "গ্রাহক যোগ করুন",
        editCustomer: "গ্রাহক সম্পাদনা",
        customerName: "গ্রাহকের নাম",
        phone: "ফোন", // Fixed from 'স্থায়ী'
        email: "ইমেইল",
        address: "ঠিকানা",
        totalSpent: "মোট কেনাকাটা",
        totalDue: "মোট বাকি",
        lastVisit: "সর্বশেষ আগমন",
        customerHistory: "গ্রাহকের ইতিহাস",
        makePayment: "পেমেন্ট করুন",
        collectDue: "বাকি আদায়",

        // Vendors
        addVendor: "সরবরাহকারী যোগ",
        editVendor: "সরবরাহকারী সম্পাদনা",
        vendorName: "সরবরাহকারীর নাম",
        companyName: "কোম্পানির নাম",
        payable: "পাওনা",
        totalPurchases: "মোট ক্রয়",
        recordPurchase: "ক্রয় লিপিবদ্ধ করুন",
        payVendor: "পেমেন্ট দিন",
        vendorHistory: "লেনদেন ইতিহাস",

        // Expenses
        recordExpense: "খরচ লিখুন",
        expenseType: "খরচের ধরণ",
        amount: "পরিমাণ",
        date: "তারিখ",
        expenseCategory: "খরচের খাত",

        // Reports
        salesReport: "বিক্রয় রিপোর্ট",
        expenseReport: "খরচের রিপোর্ট",
        profitReport: "লাভ-ক্ষতি",
        inventoryReport: "মজুদ রিপোর্ট",
        customerReport: "গ্রাহক রিপোর্ট",
        dailySummary: "দৈনিক সারাংশ",
        monthlySummary: "মাসিক সারাংশ",
        dateRange: "সময়কাল",
        totalRevenue: "মোট আয়",
        totalProfit: "মোট লাভ",
        totalExpenses: "মোট ব্যয়",
        netIncome: "নিট আয়",
        topSelling: "সেরা বিক্রয়",

        // Staff
        addStaff: "স্টাফ যোগ করুন",
        role: "পদবী",
        permissions: "অনুমতি",
        active: "সক্রিয়",
        inactive: "নিষ্ক্রিয়",
        salary: "বেতন",
        joiningDate: "যোগদানের তারিখ",

        // Shop Settings
        shopName: "দোকানের নাম",
        shopAddress: "দোকানের ঠিকানা",
        shopPhone: "দোকানের মোবাইল",
        currency: "মুদ্রা",
        language: "ভাষা",
        invoiceFooter: "ইনভয়েস ফুটার",
        logo: "লোগো",
        shopProfile: "শপ প্রোফাইল",
        invoiceSettings: "ইনভয়েস সেটিংস",
        userProfile: "ইউজার প্রোফাইল",
        security: "নিরাপত্তা",
        website: "ওয়েবসাইট",
        invoiceTitle: "ইনভয়েস টাইটেল",
        footerNote: "ফুটার নোট",
        termsConditions: "শর্তাবলী",
        saveSettings: "সেটিংস সংরক্ষণ করুন",

        // Messages
        success: "সফল",
        error: "ত্রুটি",
        savedSuccessfully: "সফলভাবে সংরক্ষিত হয়েছে",
        saveChanges: "পরিবর্তন সংরক্ষণ করুন",
        changePassword: "পাসওয়ার্ড পরিবর্তন",
        oldPassword: "পুরানো পাসওয়ার্ড",
        newPassword: "নতুন পাসওয়ার্ড",
        confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
        accountRecovery: "অ্যাকাউন্ট রিকভারি",
        deletedSuccessfully: "সফলভাবে মুছে ফেলা হয়েছে",
        confirmDelete: "আপনি কি নিশ্চিতভাবে মুছতে চান?",
        fillRequired: "অনুগ্রহ করে সব তথ্য দিন",
        loginSuccess: "লগইন সফল হয়েছে",
        loginFailed: "লগইন ব্যর্থ হয়েছে",

        // Dashboard
        goodMorning: "শুভ সকাল",
        todaysSales: "আজকের বিক্রয়",
        inventoryValue: "মজুদ মূল্য",
        totalCustomers: "মোট গ্রাহক",
        salesOverview: "বিক্রয় সারাংশ",
        recentTransactions: "সাম্প্রতিক লেনদেন",
        whatsHappening: "আজকের কার্যক্রম",
        viewFullReport: "সম্পূর্ণ রিপোর্ট",
        orderActivity: "অর্ডার গ্রাফ",
        dailyOrderVolume: "দৈনিক অর্ডার সংখ্যা",
        hot: "জনপ্রিয়",
        vsYesterday: "গতকালের থেকে",
        cartIsEmpty: "কার্ট খালি",
        addProductsToGetStarted: "শুরু করতে পণ্য যোগ করুন",
        completeSale: "বিক্রয় সম্পন্ন করুন",
        transactionRecorded: "লেনদেন সফলভাবে লিপিবদ্ধ করা হয়েছে।",
        printReceipt: "রশিদ প্রিন্ট করুন",
        newCustomer: "নতুন গ্রাহক",
        noTransactionsFound: "কোন লেনদেন পাওয়া যায়নি",
        allTransactions: "সব লেনদেন",
        paymentOverdue: "পেমেন্ট ওভারডিউ",
        overdueMessage: "এই লেনদেনটি ৩০ দিনের বেশি পুরনো এবং এখনও বকেয়া রয়েছে।",
        status: "অবস্থা",
        orderId: "অর্ডার আইডি",
        markPaid: "পরিশোধিত করুন",
        dataBackup: "ডেটা ব্যাকআপ",
        exportData: "সব ডেটা এক্সপোর্ট করুন",
        importData: "ডেটা ইমপোর্ট করুন",
        backupDescription: "আপনার দোকানের সব ডেটা (পণ্য, লেনদেন, গ্রাহক ইত্যাদি) JSON ফরম্যাটে ব্যাকআপ হিসেবে ডাউনলোড করুন।",
        importDescription: "পূর্বের এক্সপোর্ট করা JSON ব্যাকআপ ফাইল থেকে ডেটা রিস্টোর করুন।",
        restoreWarning: "ডেটা রিস্টোর করলে নতুন ডেটা আগের ডেটার সাথে যুক্ত হবে। নিশ্চিত করুন ফাইলটি এই দোকানেরই।",
        inventorySubtitle: "আপনার দোকানের স্টক লেভেল পরিচালনা করুন, মূল্য নির্ধারণ করুন এবং দক্ষতার সাথে ইনভেন্টরি গুছিয়ে রাখুন।",
        inventoryManagement: "ইনভেন্টরি ম্যানেজমেন্ট",
        uploadPhoto: "ছবি আপলোড করুন",
        stockLevel: "স্টক লেভেল",
        retailPrice: "খুচরা মূল্য",
        industrySpecificData: "ইন্ডাস্ট্রি স্পেসিফিক ডেটা",
        engineNumber: "ইঞ্জিন নম্বর",
        chassisNumber: "চ্যাসিস নম্বর",
        modelYear: "মডেল ইয়ার",
        materialProductionCost: "উৎপাদন খরচ",
        selectYear: "বছর নির্বাচন করুন",
        registerProduct: "নতুন পণ্য নিবন্ধন",
        loadingDashboard: "ড্যাশবোর্ড লোড হচ্ছে...",
        last7Days: "গত ৭ দিন",
        noTransactionsYet: "এখনো কোনো লেনদেন হয়নি",
        allStockLevelsGood: "সব পণ্যের মজুদ পর্যাপ্ত আছে",
        financialHealthOverview: "আপনার দোকানের আর্থিক অবস্থার সংক্ষিপ্ত রূপ",
        totalOrdersProcessed: "মোট সম্পন্ন করা অর্ডার",
        perTransaction: "প্রতি লেনদেনে",
        needsAttention: "মনোযোগ প্রয়োজন",
        salesTrend7Days: "বিক্রয় ট্রেন্ড (গত ৭ দিন)",
        noSalesData: "কোন বিক্রয় তথ্য পাওয়া যায়নি",
        inventoryDistribution: "ইনভেন্টরি ডিস্ট্রিবিউশন",
        noInventoryData: "কোন ইনভেন্টরি তথ্য পাওয়া যায়নি",
    }
};

interface StoreContextType {
    user: User | null;
    shopDetails: ShopDetails;
    invoiceSettings: InvoiceSettings;
    isLoading: boolean;
    language: 'en' | 'bn';

    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string, shopName?: string) => Promise<boolean>;
    forgotPassword: (email: string) => Promise<boolean>;
    resetPassword: (email: string, password: string, token?: string, code?: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    verifyEmail: (token: string) => Promise<boolean>;
    resendVerification: (email: string) => Promise<boolean>;
    logout: () => void;

    updateShopDetails: (details: ShopDetails) => void;
    updateInvoiceSettings: (settings: InvoiceSettings) => void;
    updateUserProfile: (user: Partial<User>) => void;

    setLanguage: (lang: 'en' | 'bn') => void;
    t: (key: keyof typeof translations['en']) => string;
    can: (action: StaffAction) => boolean;
    pageTitle: string;
    setPageTitle: (title: string) => void;
}

export type StaffAction =
    | 'delete_customer'
    | 'view_reports'
    | 'view_profits'
    | 'manage_vendors'
    | 'manage_staff'
    | 'manage_shop_settings'
    | 'delete_product'
    | 'delete_transaction'
    | 'delete_expense'
    | 'edit_product_price';

const STAFF_RESTRICTIONS: Record<StaffAction, boolean> = {
    'delete_customer': true,
    'view_reports': true,
    'view_profits': true,
    'manage_vendors': true,
    'manage_staff': true,
    'manage_shop_settings': true,
    'delete_product': true,
    'delete_transaction': true,
    'delete_expense': true,
    'edit_product_price': false
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Initial empty states
const INITIAL_SHOP_DETAILS: ShopDetails = {
    id: "",
    name: "My Shop",
    address: "",
    phone: "",
    email: "",
    website: "",
    logoUrl: ""
};

const INITIAL_INVOICE_SETTINGS: InvoiceSettings = {
    headerTitle: "INVOICE",
    footerNote: "Thank you for shopping with us!",
    terms: "Goods once sold are not returnable.",
    showLogo: true,
    currencySymbol: "৳"
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [shopDetails, setShopDetails] = useState<ShopDetails>(INITIAL_SHOP_DETAILS);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(INITIAL_INVOICE_SETTINGS);
    const [language, setLanguage] = useState<'en' | 'bn'>('en');
    const [pageTitle, setPageTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Load initial auth state
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        const savedShop = localStorage.getItem('currentShop');

        if (token && userData) {
            setUser(JSON.parse(userData));
        }

        if (savedShop) {
            setShopDetails(JSON.parse(savedShop));
        }

        setIsLoading(false);
    }, []);

    const t = (key: keyof typeof translations['en']) => {
        return translations[language][key] || key;
    };

    const can = (action: StaffAction): boolean => {
        const userRole = user?.role?.toLowerCase();

        // Owner has full access
        if (userRole === 'owner') return true;

        // Manager has elevated access but restricted from sensitive shop management
        if (userRole === 'manager') {
            const managerRestricted: StaffAction[] = ['manage_staff', 'manage_shop_settings'];
            return !managerRestricted.includes(action);
        }

        // Generic Staff or any other custom roles use standard restrictions
        // This ensures security by default for unknown roles
        return !STAFF_RESTRICTIONS[action];
    };

    const login = async (email: string, password: string) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);

            // Handle Shop Context Loading
            const userRole = data.user.role?.toLowerCase();

            if (userRole === 'owner') {
                try {
                    // Fetch shops for owner and select the first one by default
                    const shopsRes = await api.get('/shops');
                    if (shopsRes.data && shopsRes.data.length > 0) {
                        const shopInfo = shopsRes.data[0];
                        localStorage.setItem('currentShop', JSON.stringify(shopInfo));
                        setShopDetails(shopInfo);
                    }
                } catch (e) {
                    console.error("Failed to fetch owner shops", e);
                }
            } else if (data.user.shopId) {
                // If staff/manager, fetch their assigned shop
                try {
                    const shopRes = await api.get(`/shops/${data.user.shopId}`);
                    const shopInfo = shopRes.data;
                    localStorage.setItem('currentShop', JSON.stringify(shopInfo));
                    setShopDetails(shopInfo);
                } catch (e) {
                    console.error("Failed to fetch staff shop details", e);
                    // Fallback to basic info from user object if full fetch fails
                    const basicShop = {
                        id: data.user.shopId,
                        name: 'Assigned Shop',
                        business_type: 'general',
                        logoUrl: '',
                        address: '',
                        phone: '',
                        email: '',
                        website: ''
                    } as ShopDetails;
                    setShopDetails(basicShop);
                    localStorage.setItem('currentShop', JSON.stringify(basicShop));
                }
            }

            return true;
        } catch (error) {
            console.error("Login failed", error);
            toast.error("Invalid credentials");
            return false;
        }
    };

    const register = async (name: string, email: string, password: string, shopName?: string) => {
        try {
            await api.post('/auth/register', { name, email, password, shopName });
            toast.success("Account created! Please verify your email.");
            return true;
        } catch (error: any) {
            console.error("Registration failed", error);
            toast.error(error.response?.data?.message || "Registration failed");
            return false;
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            const res = await api.post('/auth/forgot-password', { email });
            // If in dev mode, show the debug token for easy testing
            if (res.data.debugToken) {
                console.log("Reset Token:", res.data.debugToken);
                toast.success(`Debug: Token is ${res.data.debugToken}`, { duration: 10000 });
            }
            toast.success("If an account exists, instructions have been sent.");
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Something went wrong.");
            return false;
        }
    };

    const resetPassword = async (email: string, password: string, token?: string, code?: string) => {
        try {
            await api.post('/auth/forgot-password', {
                email,
                newPassword: password,
                token: token || undefined,
                recoveryCode: code || undefined
            });
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset password.");
            return false;
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        try {
            await api.post('/auth/change-password', { oldPassword, newPassword });
            toast.success("Password changed successfully!");
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to change password.");
            return false;
        }
    };

    const verifyEmail = async (token: string) => {
        try {
            await api.get(`/auth/verify-email/${token}`);
            toast.success("Email verified successfully!");
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Verification failed.");
            return false;
        }
    };

    const resendVerification = async (email: string) => {
        try {
            const res = await api.post('/auth/resend-verification', { email });
            if (res.data.debugToken) {
                console.log("Resent Verification Token:", res.data.debugToken);
                toast.success(`Debug: Token is ${res.data.debugToken}`, { duration: 10000 });
            }
            toast.success("Verification email resent!");
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to resend verification.");
            return false;
        }
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setShopDetails(INITIAL_SHOP_DETAILS);
    };

    const updateUserProfile = (updatedUser: Partial<User>) => {
        if (user) {
            const newUser = { ...user, ...updatedUser };
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
        }
    };

    const updateShopDetails = (details: ShopDetails) => {
        setShopDetails(details);
        localStorage.setItem('currentShop', JSON.stringify(details));
    };

    const updateInvoiceSettings = (settings: InvoiceSettings) => {
        setInvoiceSettings(settings);
    };

    return (
        <StoreContext.Provider value={{
            user, shopDetails, invoiceSettings, isLoading, language, pageTitle,
            login, register, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerification, logout, updateUserProfile, updateShopDetails, updateInvoiceSettings, setLanguage, t, can, setPageTitle
        }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context;
};