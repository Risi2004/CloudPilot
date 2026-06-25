const PDFDocument = require('pdfkit');

/**
 * Generates a professional, custom-styled PDF receipt/invoice for CloudPilot subscription payments.
 * Returns a Promise that resolves to a Buffer containing the PDF document data.
 */
const generateInvoicePdfBuffer = (fullName, email, planName, amount, currency, orderId, dateStr) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 50, right: 50 } 
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // --- LOGO & HEADER ---
      // Draw modern geometric hexagon logo icon
      doc.save()
         .translate(50, 45);
      
      // Draw outer hexagon
      doc.moveTo(15, 0)
         .lineTo(35, 0)
         .lineTo(45, 17)
         .lineTo(35, 34)
         .lineTo(15, 34)
         .lineTo(5, 17)
         .closePath()
         .fill('#00D4FF');

      // Draw inner shape (contrast dark blue hexagon)
      doc.moveTo(17, 3)
         .lineTo(33, 3)
         .lineTo(41, 17)
         .lineTo(33, 31)
         .lineTo(17, 31)
         .lineTo(9, 17)
         .closePath()
         .fill('#0b0f19');

      // Draw pilot white target dot/crosshair lines
      doc.circle(25, 17, 5)
         .fill('#ffffff');

      doc.restore();

      // Logo Text
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(20)
         .text('CLOUDPILOT', 105, 48);
      
      doc.fillColor('#00D4FF')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('MISSION CONTROL', 105, 68, { characterSpacing: 1.5 });

      // Title & Metadata (Right side aligned)
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('PAYMENT RECEIPT', 320, 45, { align: 'right', width: 225 });

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#64748b')
         .text(`Receipt No: RCT_${orderId.substring(6, 18)}`, 320, 70, { align: 'right', width: 225 })
         .text(`Date: ${dateStr}`, 320, 83, { align: 'right', width: 225 });

      // Divider
      doc.moveTo(50, 110)
         .lineTo(545, 110)
         .lineWidth(1)
         .strokeColor('#e2e8f0')
         .stroke();

      // --- CLIENT & ISSUER DETAILS ---
      const yDetails = 130;
      // Left side: Bill To
      doc.fillColor('#64748b')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('BILL TO:', 50, yDetails, { characterSpacing: 1 });

      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(fullName, 50, yDetails + 15)
         .font('Helvetica')
         .fillColor('#334155')
         .text(email, 50, yDetails + 30);

      // Right side: Bill From
      doc.fillColor('#64748b')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('ISSUER:', 320, yDetails, { characterSpacing: 1 });

      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('CloudPilot Corp.', 320, yDetails + 15)
         .font('Helvetica')
         .fillColor('#334155')
         .text('123 CloudPilot Ave, Colombo', 320, yDetails + 30)
         .text('Sri Lanka', 320, yDetails + 42)
         .text('billing@cloudpilot.io', 320, yDetails + 54);

      // --- PAID STATUS BADGE ---
      doc.save()
         .roundedRect(50, yDetails + 55, 75, 18, 4)
         .fill('#10B981');
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('PAID', 50, yDetails + 60, { align: 'center', width: 75 });
      doc.restore();

      // --- TABLE ITEMS ---
      const yTable = 230;

      // Table Header Background
      doc.save()
         .rect(50, yTable, 495, 24)
         .fill('#1e293b');

      // Table Header Labels
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('DESCRIPTION', 60, yTable + 8, { width: 230 })
         .text('BILLING CYCLE', 300, yTable + 8, { width: 120, align: 'center' })
         .text('TOTAL', 430, yTable + 8, { width: 105, align: 'right' });
      doc.restore();

      // Table Item Row (Alternate Background)
      const yRow = yTable + 24;
      doc.save()
         .rect(50, yRow, 495, 32)
         .fill('#f8fafc');

      // Add thin line under row
      doc.moveTo(50, yRow + 32)
         .lineTo(545, yRow + 32)
         .lineWidth(0.5)
         .strokeColor('#e2e8f0')
         .stroke();

      // Table Row Data
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(`${planName} Plan Upgrade`, 60, yRow + 11, { width: 230 });
      
      doc.fillColor('#64748b')
         .font('Helvetica')
         .fontSize(9)
         .text('Monthly Recurring', 300, yRow + 11, { width: 120, align: 'center' });

      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(`${amount} ${currency}`, 430, yRow + 11, { width: 105, align: 'right' });
      doc.restore();

      // --- INVOICE TOTALS ---
      const yTotal = yRow + 50;

      // Labels Right Aligned
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#64748b')
         .text('Subtotal:', 320, yTotal, { align: 'right', width: 120 })
         .text('Discount:', 320, yTotal + 15, { align: 'right', width: 120 });

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#0f172a')
         .text('Total Paid:', 320, yTotal + 35, { align: 'right', width: 120 });

      // Values Right Aligned
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#334155')
         .text(`${amount} ${currency}`, 450, yTotal, { align: 'right', width: 95 })
         .text('0.00 USD', 450, yTotal + 15, { align: 'right', width: 95 });

      // Solid color brand total
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#00D4FF')
         .text(`${amount} ${currency}`, 450, yTotal + 35, { align: 'right', width: 95 });

      // Double line under Total
      doc.moveTo(350, yTotal + 53)
         .lineTo(545, yTotal + 53)
         .lineWidth(0.5)
         .strokeColor('#cbd5e1')
         .stroke();
      doc.moveTo(350, yTotal + 56)
         .lineTo(545, yTotal + 56)
         .lineWidth(0.5)
         .strokeColor('#cbd5e1')
         .stroke();

      // --- TERMS & FOOTER ---
      const yFooter = 680;
      
      // Bottom line decoration
      doc.save()
         .rect(50, yFooter - 15, 495, 2)
         .fill('#00D4FF');
      doc.restore();

      doc.fillColor('#64748b')
         .font('Helvetica')
         .fontSize(8.5)
         .text('TERMS & INSTRUCTIONS:', 50, yFooter, { characterSpacing: 0.5 });

      doc.fillColor('#94a3b8')
         .fontSize(8)
         .text('This PDF serves as an official confirmation of subscription activation and payment receipt. Subscriptions are billed in advance and are non-refundable. You can manage renewals inside your CloudPilot console profile.', 50, yFooter + 12, { width: 495, lineGap: 3 });

      doc.fillColor('#64748b')
         .font('Helvetica-Bold')
         .fontSize(8.5)
         .text('Thank you for deploying with CloudPilot!', 50, yFooter + 48, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePdfBuffer
};
