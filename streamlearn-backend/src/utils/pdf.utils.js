const PDFDocument = require('pdfkit');
const cloudinary  = require('../config/cloudinary');
const { Readable } = require('stream');

const generateInvoicePDF = async (transaction, user, plan) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', (d) => buffers.push(d));
    doc.on('end', async () => {
      const buffer = Buffer.concat(buffers);
      try {
        const result = await new Promise((res, rej) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'invoices', resource_type: 'raw', format: 'pdf' },
            (err, r) => err ? rej(err) : res(r)
          );
          const readable = new Readable(); readable.push(buffer); readable.push(null);
          readable.pipe(stream);
        });
        resolve(result.secure_url);
      } catch (err) { reject(err); }
    });
    doc.on('error', reject);

    doc.fontSize(24).text('StreamLearn Invoice', { align: 'center' })
       .moveDown()
       .fontSize(12)
       .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
       .text(`Transaction ID: ${transaction._id}`)
       .text(`Customer: ${user.name} (${user.email})`)
       .moveDown()
       .text(`Plan: ${plan?.name || 'Content Purchase'}`)
       .text(`Amount: ₹${transaction.amount}`)
       .text(`Status: ${transaction.status}`);
    doc.end();
  });
};

module.exports = { generateInvoicePDF };
