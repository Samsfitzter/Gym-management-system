import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { receiptConfig } from '../config/receiptConfig.js';

// Helper function to auto-fit columns in SheetJS worksheet with extra spacing
const autoFitColumns = (ws, dataMatrix, skipRows = 0) => {
  if (!dataMatrix || dataMatrix.length === 0) return;
  
  // Find max columns
  let maxCols = 0;
  dataMatrix.forEach(row => {
    if (row.length > maxCols) maxCols = row.length;
  });

  const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
    let maxLen = 12; // default minimum width for columns
    dataMatrix.forEach((row, rowIdx) => {
      if (rowIdx < skipRows) return; // skip header/title rows
      
      // Skip title/section divider rows (which have only 1 element or are empty) for column width calculations
      if (row.length <= 1) return;
      
      const val = row[colIdx];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: maxLen + 6 }; // Add +6 character padding for header/values spacing
  });
  
  ws['!cols'] = colWidths;
};

export const exportToCSV = (data, headers, filename) => {
  const wb = XLSX.utils.book_new();
  const sheetData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Apply dynamic column auto-fitting with padding
  autoFitColumns(ws, sheetData, 0);
  
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs');
  
  // Download as a true XLSX file for perfect column widths and alignment
  const xlsxFilename = filename.replace(/\.csv$/i, '.xlsx');
  XLSX.writeFile(wb, xlsxFilename);
};

export const exportToPDF = (title, headers, data, summary = null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Header section
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("SAM'S FITZTER", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(title, 14, 27);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
  
  let currentY = 38;
  
  // Optional Summary Section
  if (summary) {
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text("Report Summary", 14, currentY);
    
    const summaryRows = Object.entries(summary).map(([key, val]) => [key, String(val)]);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metric', 'Value']],
      body: summaryRows,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 85, 105] }
    });
    currentY = doc.lastAutoTable.finalY + 10;
  }
  
  // Main Data Table
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: data,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241] } // Indigo-500
  });
  
  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportDashboardCSV = (range, metrics, lists, isAdmin) => {
  const wb = XLSX.utils.book_new();
  
  // Compile all tables on a single worksheet vertically
  const sheetData = [
    ['SAM\'S FITZTER - DASHBOARD ANALYTICS REPORT'],
    [`Range: ${range.toUpperCase()}`],
    [`Generated on: ${new Date().toLocaleString()}`],
    [],
    ['SUMMARY METRICS'],
    ['Metric', 'Value'],
    ['Total Attendance', metrics.totalAttendance],
    ['Active Members', metrics.activeMembers],
    ['New Registrations', metrics.newRegistrations],
    ['Membership Renewals', metrics.renewals]
  ];
  if (isAdmin) {
    sheetData.push(['Total Revenue Collections', metrics.collections]);
  }
  sheetData.push(['Expiring Memberships', metrics.expiringMemberships]);
  
  // Active Members Table
  sheetData.push([]);
  sheetData.push(['ACTIVE MEMBERS DETAILS']);
  sheetData.push(['ID', 'Name', 'Phone', 'Membership Plan', 'Join Date', 'Expiry Date']);
  lists.activeMembersList.forEach(m => {
    sheetData.push([String(m.id).padStart(4, '0'), m.name, m.phone, m.membership_type, m.join_date, m.expiry_date]);
  });
  
  // Renewals Table
  sheetData.push([]);
  sheetData.push(['MEMBERSHIP RENEWALS LIST']);
  sheetData.push(['Receipt Number', 'Member Name', 'Amount', 'Date', 'Payment Method']);
  lists.renewalsList.forEach(r => {
    sheetData.push([r.receipt_number, r.member_name, r.amount, r.date, r.payment_method]);
  });
  
  // Expiring Table
  sheetData.push([]);
  sheetData.push(['EXPIRING MEMBERSHIPS']);
  sheetData.push(['Name', 'Phone', 'Expiry Date', 'Plan Name']);
  lists.expiringList.forEach(e => {
    sheetData.push([e.name, e.phone, e.expiry_date, e.membership_type]);
  });
  
  // Collections Table (Admin only)
  if (isAdmin) {
    sheetData.push([]);
    sheetData.push(['REVENUE COLLECTIONS (ADMIN ONLY)']);
    sheetData.push(['Receipt Number', 'Member Name', 'Amount', 'Date', 'Payment Method', 'Status']);
    lists.collectionsList.forEach(c => {
      sheetData.push([c.receipt_number, c.member_name, c.amount, c.date, c.payment_method, c.status]);
    });
  }
  
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Auto-fit columns dynamically for the single stacked layout
  autoFitColumns(ws, sheetData, 4);
  
  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Report');
  
  XLSX.writeFile(wb, `dashboard_report_${range}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportDashboardPDF = (range, metrics, lists, isAdmin) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Title Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("SAM'S FITZTER", 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dashboard Analytics Report - ${range.toUpperCase()} VIEW`, 14, 27);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  
  // Summary Metrics Section
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Metrics Summary", 14, 41);
  
  const summaryBody = [
    ['Total Attendance', metrics.totalAttendance],
    ['Active Members', metrics.activeMembers],
    ['New Registrations', metrics.newRegistrations],
    ['Membership Renewals', metrics.renewals],
    ['Expiring Memberships', metrics.expiringMemberships]
  ];
  if (isAdmin) {
    summaryBody.push(['Revenue Collections', `INR ${metrics.collections}`]);
  }
  
  autoTable(doc, {
    startY: 44,
    head: [['Metric', 'Value']],
    body: summaryBody,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [71, 85, 105] }
  });
  
  let currentY = doc.lastAutoTable.finalY + 10;
  
  // Section 2: Active Members details
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Active Members Details", 14, currentY);
  
  const activeRows = lists.activeMembersList.map(m => [
    String(m.id).padStart(4, '0'),
    m.name,
    m.phone,
    m.membership_type,
    m.join_date,
    m.expiry_date
  ]);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [['ID', 'Name', 'Phone', 'Plan', 'Joined', 'Expiry']],
    body: activeRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] }
  });
  
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Section 3: Membership Renewals
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Membership Renewals List", 14, currentY);
  
  const renewalsRows = lists.renewalsList.map(r => [
    r.receipt_number,
    r.member_name,
    `INR ${r.amount}`,
    r.date,
    r.payment_method
  ]);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Receipt', 'Member Name', 'Amount', 'Date', 'Method']],
    body: renewalsRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] }
  });
  
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Section 4: Expiring Memberships
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Expiring Memberships", 14, currentY);
  
  const expiringRows = lists.expiringList.map(e => [
    e.name,
    e.phone,
    e.expiry_date,
    e.membership_type
  ]);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Name', 'Phone', 'Expiry Date', 'Plan Name']],
    body: expiringRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] }
  });
  
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Section 5: Collections (Admin only)
  if (isAdmin) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text("Revenue Collections (Admin Only)", 14, currentY);
    
    const collectionsRows = lists.collectionsList.map(c => [
      c.receipt_number,
      c.member_name,
      `INR ${c.amount}`,
      c.date,
      c.payment_method,
      c.status
    ]);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Receipt', 'Member Name', 'Amount', 'Date', 'Method', 'Status']],
      body: collectionsRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105] }
    });
  }
  
  doc.save(`dashboard_analytics_report_${range}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Generates and downloads a beautifully styled receipt in A5 format
export const exportReceiptPDF = (receipt, memberName, collectedBy = 'Staff', returnBlob = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // A5 size is compact and fits receipts perfectly (148 x 210 mm)
  });

  // Main Border
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(5, 5, 138, 200);

  // --- HEADER SECTION ---
  // Gym Logo placeholder or custom logo
  const logoX = 10;
  const logoY = 10;
  const logoSize = 20;

  const drawDefaultLogo = (doc, x, y) => {
    // Outer squircle
    doc.setDrawColor(79, 70, 229); // Indigo-600
    doc.setLineWidth(0.8);
    doc.roundedRect(x + 1, y + 1, 18, 18, 3, 3, 'S');
    
    // Inner squircle
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 2.5, y + 2.5, 15, 15, 2, 2, 'S');

    // Lettering
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("S", x + 6.5, y + 12);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("F", x + 11.5, y + 13.5);
  };

  if (receiptConfig.logoUrl) {
    try {
      const img = new Image();
      img.src = receiptConfig.logoUrl;
      doc.addImage(img, 'JPEG', logoX + 1, logoY + 1, 18, 18);
      // Draw border squircle
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.roundedRect(logoX + 1, logoY + 1, 18, 18, 3, 3, 'S');
    } catch (err) {
      console.error("Error adding logo image to PDF:", err);
      drawDefaultLogo(doc, logoX, logoY);
    }
  } else {
    drawDefaultLogo(doc, logoX, logoY);
  }

  // Gym Information
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(receiptConfig.gymName.toUpperCase(), 34, 16);

  doc.setFont("Helvetica", "oblique");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(receiptConfig.subtitle || "Fitness & Lifestyle Studio", 34, 21);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(receiptConfig.location, 34, 26);

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, 39, 138, 39);
  doc.setLineDashPattern([], 0); // Reset

  // Receipt Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-700
  doc.text("PAYMENT RECEIPT", 74, 46, { align: 'center' });

  // --- MEMBER & PAYMENT INFORMATION SECTION ---
  // We lay this out in a clean two-column grid.
  const col1XLabel = 12;
  const col1XVal = 42;
  const col2XLabel = 76;
  const col2XVal = 104;
  const gridStartY = 54;
  const rowSpacing = 6;

  // Retrieve fields with fallbacks
  const phone = receipt.member_phone || receipt.phone || '';
  const plan = receipt.membership_type || 'N/A';
  const start = receipt.start_date || 'N/A';
  const expiry = receipt.expiry_date || 'N/A';
  const displayStatus = (receipt.status || 'paid').toUpperCase();
  const displayMethod = (receipt.payment_method || 'upi').toUpperCase();
  const displayMemberName = receipt.member_name || memberName || 'Member';

  // Left Column Details
  const leftCol = [
    ["Receipt Number:", receipt.receipt_number],
    ["Member Name:", displayMemberName],
    ["Phone Number:", phone],
    ["Membership Plan:", plan],
    ["Start Date:", start]
  ];

  // Right Column Details
  const rightCol = [
    ["Payment Date:", receipt.date],
    ["Expiry Date:", expiry],
    ["Payment Method:", displayMethod],
    ["Collected By:", collectedBy],
    ["Status:", displayStatus]
  ];

  // Print grid
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);

  leftCol.forEach(([label, val], idx) => {
    const y = gridStartY + (idx * rowSpacing);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont("Helvetica", "bold");
    doc.text(label, col1XLabel, y);
    
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont("Helvetica", "normal");
    doc.text(String(val), col1XVal, y);
  });

  rightCol.forEach(([label, val], idx) => {
    const y = gridStartY + (idx * rowSpacing);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont("Helvetica", "bold");
    doc.text(label, col2XLabel, y);
    
    doc.setFont("Helvetica", "normal");
    if (label === "Status:") {
      doc.setFont("Helvetica", "bold");
      if (val === "PAID" || val === "ACTIVE") {
        doc.setTextColor(16, 185, 129); // green-500
      } else {
        doc.setTextColor(239, 68, 68); // red-500
      }
    } else {
      doc.setTextColor(15, 23, 42); // Slate-900
    }
    doc.text(String(val), col2XVal, y);
  });

  // Highlighted Amount Paid Card
  const cardY = gridStartY + (5 * rowSpacing) + 3;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(10, cardY, 128, 14, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(10, cardY, 128, 14, 'S');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Total Amount Paid", 16, cardY + 9);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`INR ${receipt.amount}`, 132, cardY + 9, { align: 'right' });

  // --- FOOTER SECTION ---
  const footerStartY = cardY + 20;

  // Divider line above footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, footerStartY - 4, 138, footerStartY - 4);
  doc.setLineDashPattern([], 0); // Reset

  // Left Column: Services list (Column 1)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.text("Our Services:", 12, footerStartY);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500

  const col1Services = receiptConfig.services.slice(0, 4);
  col1Services.forEach((service, idx) => {
    doc.text(`• ${service}`, 12, footerStartY + 5 + (idx * 4));
  });

  // Middle Column: Services list (Column 2)
  const col2Services = receiptConfig.services.slice(4);
  col2Services.forEach((service, idx) => {
    doc.text(`• ${service}`, 52, footerStartY + 5 + (idx * 4));
  });

  // Right Column: Support details
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("For Support:", 92, footerStartY);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${receiptConfig.contact}`, 92, footerStartY + 5);
  doc.text(`Email: ${receiptConfig.email}`, 92, footerStartY + 9);

  // Bottom Center Thank You Message & Address
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text("Thank you for choosing Sam's Fitzter.", 74, 186, { align: 'center' });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`${receiptConfig.gymName}  |  ${receiptConfig.location}`, 74, 191, { align: 'center' });

  if (returnBlob) {
    return doc.output('blob');
  }
  doc.save(`receipt_${receipt.receipt_number}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportCollectionExcel = (range, summary, transactions, monthlyCollections) => {
  const wb = XLSX.utils.book_new();
  
  const sheetData = [
    ['SAM\'S FITZTER - COLLECTIONS REPORT'],
    [`Range: ${range.toUpperCase()}`],
    [`Generated on: ${new Date().toLocaleString()}`],
    [],
    ['SUMMARY STATISTICS'],
    ['Metric', 'Value'],
    ['Total Collections', `INR ${summary.totalCollections}`],
    ['Total Transactions', summary.totalTransactions],
    ['Average Collection Value', `INR ${Math.round(summary.averageCollection)}`],
    ['New Membership Revenue', `INR ${summary.newMembershipRevenue}`],
    ['Renewal Revenue', `INR ${summary.renewalRevenue}`]
  ];

  sheetData.push([]);
  sheetData.push(['MONTHLY REVENUE COMPARISONS']);
  sheetData.push(['Month', 'Revenue Amount']);
  monthlyCollections.forEach(mc => {
    sheetData.push([mc.month, mc.amount]);
  });

  sheetData.push([]);
  sheetData.push(['TRANSACTIONS LIST']);
  sheetData.push(['Receipt Number', 'Member Name', 'Membership Plan', 'Payment Method', 'Amount', 'Date']);
  transactions.forEach(t => {
    sheetData.push([t.receipt_number, t.member_name, t.membership_plan, t.payment_method, t.amount, t.date]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Auto-fit columns with +6 padding
  autoFitColumns(ws, sheetData, 4);

  XLSX.utils.book_append_sheet(wb, ws, 'Collections Report');
  XLSX.writeFile(wb, `collections-${range}.xlsx`);
};

export const exportCollectionPDF = (range, summary, transactions, monthlyCollections, generatedBy) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header section
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("SAM'S FITZTER", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Collections Financial Report - ${range.toUpperCase()} VIEW`, 14, 27);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Generated by: ${generatedBy}`, 14, 37);

  let currentY = 44;

  // 1. Summary Statistics Table
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Summary Statistics", 14, currentY);

  const summaryRows = [
    ['Total Collections', `INR ${summary.totalCollections.toFixed(2)}`],
    ['Total Transactions', String(summary.totalTransactions)],
    ['Average Transaction Value', `INR ${summary.averageCollection.toFixed(2)}`],
    ['New Membership Revenue', `INR ${summary.newMembershipRevenue.toFixed(2)}`],
    ['Renewal Revenue', `INR ${summary.renewalRevenue.toFixed(2)}`]
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Metric', 'Value']],
    body: summaryRows,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [71, 85, 105] }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // 2. Monthly Revenue Comparisons Table
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Monthly Revenue Trends", 14, currentY);

  const monthlyRows = monthlyCollections.map(mc => [mc.month, `INR ${mc.amount.toFixed(2)}`]);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Month', 'Amount']],
    body: monthlyRows,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [71, 85, 105] }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // 3. Transactions Table
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Detailed Collections Transactions", 14, currentY);

  const transactionRows = transactions.map(t => [
    t.receipt_number,
    t.member_name,
    t.membership_plan,
    t.payment_method.toUpperCase(),
    `INR ${t.amount.toFixed(2)}`,
    t.date
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Receipt Number', 'Member Name', 'Plan', 'Method', 'Amount', 'Date']],
    body: transactionRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] }
  });

  doc.save(`collections-${range}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- EXPENSES EXPORT HELPERS ---
export const exportExpenseExcel = (range, filters, list) => {
  const wb = XLSX.utils.book_new();
  
  const sheetData = [
    ['SAM\'S FITZTER - OPERATIONAL EXPENSES REPORT'],
    [`Range: ${range.toUpperCase()}`],
    [`Filters - Category ID: ${filters.category_id || 'All'}, Method: ${filters.paymentMethod || 'All'}`],
    [`Generated on: ${new Date().toLocaleString()}`],
    [],
    ['EXPENSES LIST'],
    ['Date', 'Category', 'Amount', 'Payment Method', 'Description', 'Created By']
  ];

  list.forEach(e => {
    sheetData.push([
      e.expenseDate,
      e.categoryName,
      parseFloat(e.amount),
      String(e.paymentMethod).toUpperCase(),
      e.description || '',
      e.creatorName || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  autoFitColumns(ws, sheetData, 4);
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  XLSX.writeFile(wb, `expenses-${range}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportExpensePDF = (range, filters, list, generatedBy) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("SAM'S FITZTER", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Operational Expenses Report - ${range.toUpperCase()} VIEW`, 14, 27);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Generated by: ${generatedBy}`, 14, 37);

  let currentY = 44;

  const summaryRows = list.map(e => [
    e.expenseDate,
    e.categoryName,
    `INR ${parseFloat(e.amount).toFixed(2)}`,
    String(e.paymentMethod).toUpperCase(),
    e.description || '-',
    e.creatorName || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Category', 'Amount', 'Method', 'Description', 'Created By']],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241] } // Indigo-500
  });

  doc.save(`expenses-${range}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- PROFIT AND LOSS EXPORT HELPERS ---
export const exportProfitLossExcel = (view, list) => {
  const wb = XLSX.utils.book_new();
  
  const sheetData = [
    ['SAM\'S FITZTER - PROFIT & LOSS STATEMENT'],
    [`View Type: ${view.toUpperCase()}`],
    [`Generated on: ${new Date().toLocaleString()}`],
    [],
    ['PROFIT & LOSS RECORDS'],
    [view === 'monthly' ? 'Month' : 'Year', 'Revenue (Collections)', 'Expenses', 'Net Profit']
  ];

  list.forEach(row => {
    sheetData.push([
      row.period,
      parseFloat(row.revenue),
      parseFloat(row.expenses),
      parseFloat(row.netProfit)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  autoFitColumns(ws, sheetData, 4);
  XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
  XLSX.writeFile(wb, `profit-loss-${view}_${new Date().getFullYear()}.xlsx`);
};

export const exportProfitLossPDF = (view, list, generatedBy) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("SAM'S FITZTER", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Profit & Loss Statement - ${view.toUpperCase()} VIEW`, 14, 27);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Generated by: ${generatedBy}`, 14, 37);

  let currentY = 44;

  const dataRows = list.map(row => [
    row.period,
    `INR ${parseFloat(row.revenue).toFixed(2)}`,
    `INR ${parseFloat(row.expenses).toFixed(2)}`,
    `INR ${parseFloat(row.netProfit).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[view === 'monthly' ? 'Month' : 'Year', 'Revenue (Collections)', 'Expenses', 'Net Profit']],
    body: dataRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [71, 85, 105] } // Slate-600
  });

  doc.save(`profit_loss_${view}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- CATEGORY WISE EXPENSE REPORT EXPORT HELPERS ---
export const exportCategoryWiseExcel = (range, list) => {
  const wb = XLSX.utils.book_new();
  
  const sheetData = [
    ['SAM\'S FITZTER - CATEGORY WISE EXPENSE REPORT'],
    [`Range: ${range.toUpperCase()}`],
    [`Generated on: ${new Date().toLocaleString()}`],
    [],
    ['CATEGORY BREAKDOWN'],
    ['Category', 'Total Amount', 'Contribution (%)']
  ];

  list.forEach(item => {
    sheetData.push([
      item.category,
      parseFloat(item.total),
      `${item.percentage}%`
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  autoFitColumns(ws, sheetData, 4);
  XLSX.utils.book_append_sheet(wb, ws, 'Category Breakdown');
  XLSX.writeFile(wb, `category-wise-expenses-${range}.xlsx`);
};

export const exportCategoryWisePDF = (range, list, generatedBy) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("SAM'S FITZTER", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Category Wise Expense Report - ${range.toUpperCase()} VIEW`, 14, 27);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Generated by: ${generatedBy}`, 14, 37);

  let currentY = 44;

  const dataRows = list.map(item => [
    item.category,
    `INR ${parseFloat(item.total).toFixed(2)}`,
    `${item.percentage}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Category', 'Total Amount', 'Contribution (%)']],
    body: dataRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241] } // Indigo-500
  });

  doc.save(`category_wise_expenses_${range}_${new Date().toISOString().split('T')[0]}.pdf`);
};


