/**
 * Export data to CSV format
 */
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        console.error('No data to export');
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                const escaped = String(value ?? '').replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
