export interface Product {
    id: string;
    name: string;
    subText: string;
    sku: string;
    category: string;
    qty: number;
    costPrice: number;
    sellingPrice: number;
    imageUrl: string;
    isLowStock?: boolean;
    isOutOfStock?: boolean;
    engineNo?: string;
    chassisNo?: string;
    modelYear?: string;
    materialCost?: number;
    minStockLevel?: number;
    unit?: string;
    // API Response Fields
    stock_quantity?: number;
    cost_price?: number;
    selling_price?: number;
    image_url?: string;
    min_stock_level?: number;
    sub_text?: string;
    engine_no?: string;
    chassis_no?: string;
    model_year?: string;
    material_cost?: number;
    type?: 'product' | 'service';
}

export interface Transaction {
    id: string;
    orderId: string;
    customerName: string;
    vendorName?: string;
    date: string;
    itemCount: number;
    total: number;
    amount: number;
    paid_amount?: number;
    due_amount?: number;
    status: 'Completed' | 'Pending' | 'Cancelled' | 'Overdue';
    due_date?: string;
    days_overdue?: number;
}

export interface Notification {
    id: number;
    shop_id: number;
    user_id?: number | null;
    type: 'low_stock' | 'overdue_payment' | 'payment_received' | 'new_order' | 'system';
    title: string;
    message: string;
    link?: string;
    is_read: boolean; // boolean from DB (0 or 1)
    created_at: string;
}

export interface StatItem {
    label: string;
    value: string;
    icon: string;
    trend: string;
    trendUp?: boolean;
    colorClass?: string;
    trendColorClass?: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    totalSpent: number;
    lastVisit: string;
    avatarUrl: string;
}

export interface CartItem extends Product {
    cartQty: number;
    originalId?: string;
}

export interface User {
    id?: number;
    name: string;
    email: string;
    role: string;
    shopId?: string;
    created_at?: string;
}

export interface ShopDetails {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    businessType?: 'bike_sales' | 'garage' | 'furniture' | 'showroom' | 'pickup_rental';
}

export const INITIAL_SHOP_DETAILS: ShopDetails = {
    id: "",
    name: "My Shop",
    address: "",
    phone: "",
    email: "",
    website: "",
    logoUrl: ""
};

export interface InvoiceSettings {
    headerTitle: string;
    footerNote: string;
    terms: string;
    showLogo: boolean;
    currencySymbol: string;
}

export interface Vendor {
    id: string;
    name: string;
    company_name: string;
    phone: string;
    email?: string;
    address?: string;
    balance?: number;
    total_payable?: number;
    payable?: number;
}