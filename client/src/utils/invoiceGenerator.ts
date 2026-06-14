import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, ShopDetails, CartItem } from '../types';
import { formatCurrencyFull } from './formatters';

/**
 * Professional Invoice Generator with layout improvements and 
 * placeholders for custom font support (Bangla).
 */
export const generateInvoicePDF = (transaction: Transaction | any, shopDetails: ShopDetails, invoiceSettings?: any, items?: CartItem[] | any[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    /* 
     * [NOTE] FOR BANGLA SUPPORT:
     * 1. Download a Bangla font (e.g., SolaimanLipi.ttf)
     * 2. Convert it to Base64
     * 3. Call: doc.addFileToVFS('SolaimanLipi.ttf', base64Content);
     * 4. Call: doc.addFont('SolaimanLipi.ttf', 'SolaimanLipi', 'normal');
     * 5. Call: doc.setFont('SolaimanLipi');
     */

    // --- Header Section ---
    // Shop Name / Header Title
    doc.setFontSize(24);
    doc.setTextColor(23, 84, 207); // Primary Color (#1754cf)
    doc.setFont('helvetica', 'bold');
    const headerTitle = invoiceSettings?.headerTitle || invoiceSettings?.header_title || shopDetails.name;
    doc.text(headerTitle, pageWidth / 2, 25, { align: 'center' });

    // Shop Address & Contact
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    let yPos = 33;
    if (shopDetails.address) {
        doc.text(shopDetails.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
    }
    const contactInfo = [
        shopDetails.phone && `Phone: ${shopDetails.phone}`,
        shopDetails.email && `Email: ${shopDetails.email}`,
        shopDetails.website && `Web: ${shopDetails.website}`
    ].filter(Boolean).join('  |  ');

    if (contactInfo) {
        doc.text(contactInfo, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
    }

    // Horizontal Line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 12;

    // --- Invoice Info Grid ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 14, yPos);
    doc.text('INVOICE DETAILS:', pageWidth - 70, yPos);

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.customerName || transaction.customer_name || 'Walk-in Customer', 14, yPos);
    doc.text(`Invoice No: #${transaction.id || transaction.orderId || 'N/A'}`, pageWidth - 70, yPos);

    yPos += 5;
    doc.text(`Date: ${new Date(transaction.date || new Date()).toLocaleDateString()}`, pageWidth - 70, yPos);

    if (transaction.customer_phone) {
        doc.text(`Phone: ${transaction.customer_phone}`, 14, yPos);
        yPos += 5;
    }
    if (transaction.customer_address) {
        doc.text(`Address: ${transaction.customer_address}`, 14, yPos);
        yPos += 5;
    }
    yPos += 5;

    // --- Items Table ---
    const tableBody = (items || transaction.items || []).map((item: any) => [
        item.name || item.product_name || 'Item',
        item.quantity || item.qty || 1,
        formatCurrencyFull(item.unit_price || item.sellingPrice || 0, 'BDT'),
        formatCurrencyFull(item.subtotal || (parseFloat(item.sellingPrice || item.unit_price) * (item.cartQty || item.quantity)) || 0, 'BDT')
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [23, 84, 207], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        }
    });

    // --- Totals Section ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalsX = pageWidth - 80;

    const rowHeight = 6;
    let currentTotalY = finalY;

    const drawTotalRow = (label: string, value: string, isBold: boolean = false) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(label, totalsX, currentTotalY);
        doc.text(value, pageWidth - 14, currentTotalY, { align: 'right' });
        currentTotalY += rowHeight;
    };

    // Calculate subtotal from items (before discount)
    const subtotal = (transaction.items || []).reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.subtotal || 0));
    }, 0);

    drawTotalRow('Subtotal:', formatCurrencyFull(subtotal, 'BDT'));

    if (transaction.discount > 0) {
        drawTotalRow('Discount:', `-${formatCurrencyFull(transaction.discount, 'BDT')}`);
    }

    // The transaction.amount already has discount applied, so use it directly
    const total = transaction.amount || (subtotal - (transaction.discount || 0));
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, currentTotalY - 2, pageWidth - 14, currentTotalY - 2);
    currentTotalY += 2;

    drawTotalRow('Grand Total:', formatCurrencyFull(total, 'BDT'), true);
    drawTotalRow('Paid Amount:', formatCurrencyFull(transaction.paid_amount || 0, 'BDT'));

    const due = total - (transaction.paid_amount || 0);
    if (due > 0) {
        doc.setTextColor(200, 0, 0);
        drawTotalRow('Balance Due:', formatCurrencyFull(due, 'BDT'), true);
        doc.setTextColor(0, 0, 0);
    } else {
        drawTotalRow('Balance Due:', formatCurrencyFull(0, 'BDT'));
    }

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    const footerNote = invoiceSettings?.footerNote || invoiceSettings?.footer_note || "Thank you for your business!";
    doc.text(footerNote, pageWidth / 2, pageHeight - 18, { align: 'center' });

    // Terms and conditions
    if (invoiceSettings?.terms) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(invoiceSettings.terms, pageWidth / 2, pageHeight - 13, { align: 'center', maxWidth: pageWidth - 28 });
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text("This is a computer generated invoice.", pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Save
    doc.save(`Invoice_${transaction.id || 'N/A'}_${new Date().getTime()}.pdf`);
};
