const PDFDocument = require('pdfkit');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const generateCertificate = async ({ studentName, courseName, completionDate, instructorName }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    const buffers = [];
    doc.on('data', (d) => buffers.push(d));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      try {
        const uploadResult = await new Promise((res, rej) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'certificates', resource_type: 'raw', format: 'pdf' },
            (err, result) => (err ? rej(err) : res(result))
          );
          const readable = new Readable();
          readable.push(pdfBuffer);
          readable.push(null);
          readable.pipe(stream);
        });
        resolve(uploadResult.secure_url);
      } catch (err) {
        reject(err);
      }
    });
    doc.on('error', reject);

    // Certificate design
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#141414');
    doc
      .fillColor('#e50914')
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .stroke();
    doc
      .fillColor('#ffffff')
      .fontSize(48)
      .text('CERTIFICATE OF COMPLETION', { align: 'center' })
      .moveDown()
      .fontSize(24)
      .text('This is to certify that', { align: 'center' })
      .moveDown()
      .fontSize(36)
      .fillColor('#e50914')
      .text(studentName, { align: 'center' })
      .moveDown()
      .fontSize(24)
      .fillColor('#ffffff')
      .text('has successfully completed', { align: 'center' })
      .moveDown()
      .fontSize(30)
      .text(courseName, { align: 'center' })
      .moveDown(2)
      .fontSize(18)
      .text(`Date: ${completionDate}    Instructor: ${instructorName}`, { align: 'center' });
    doc.end();
  });
};

module.exports = { generateCertificate };
