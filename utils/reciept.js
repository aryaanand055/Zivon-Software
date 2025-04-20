const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

function generateReceiptPDF(client, subscription) {
    const PDFDocument = require("pdfkit");
    const fs = require("fs");
    const path = require("path");

    const receiptsDir = path.join(__dirname, "receipts");
    if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const fileName = `${client.memberID}-${Date.now()}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(20).text("Subscription Receipt", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Client: ${client.name}`);
        doc.text(`Email: ${client.email}`);
        doc.text(`Mobile: ${client.mobile}`);
        doc.text(`Package: ${subscription.packageId.name}`);
        doc.text(`Amount: ₹${subscription.packageId.amount}`);
        doc.text(`Discount: ₹${subscription.offerAmount}`);
        doc.text(`Paid: ₹${subscription.amountPaid}`);
        doc.text(`Pending: ₹${subscription.packageId.amount - subscription.offerAmount - subscription.amountPaid}`);
        doc.text(`Start Date: ${subscription.startDate}`);
        doc.text(`End Date: ${subscription.endDate}`);

        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
    });
}
async function sendReceiptEmail(client, filePath, subscription) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "aryaanand053@gmail.com",
            pass: "useg npsk qcpz xffp"
        }
    });

    try {
        await transporter.sendMail({
            from: "Arya from Zivon Fitness <aryaanand053@gmail.com>",
            to: client.email,
            subject: "Your Subscription Receipt - Zivon Fitness",
            text: `
Dear ${client.name},

Thank you for choosing Zivon Fitness.

Attached to this email is your receipt for the subscription package you recently purchased. If you have any questions or require further assistance, feel free to reach out to us.

-------------------------------
Client Name: ${client.name}
Member ID: ${client.memberID}
Package: ${subscription.packageId.name}
Amount: ₹${subscription.packageId.amount}
Discount: ₹${subscription.offerAmount}
Paid: ₹${subscription.amountPaid}
Pending: ₹${subscription.packageId.amount - subscription.offerAmount - subscription.amountPaid}
Start Date: ${subscription.startDate}
End Date: ${subscription.endDate}
-------------------------------

We appreciate your trust in us and look forward to supporting you on your fitness journey.

Warm regards,  
Arya Anand  
Zivon Fitness  
            `.trim(),
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="cid:logo" alt="Zivon Fitness Logo" style="max-width: 150px;" />
                    </div>
                    <p>Dear <strong>${client.name}</strong>,</p>
                    <p>Thank you for choosing <strong>Zivon Fitness</strong>.</p>
                    <p>Attached to this email is your receipt for the subscription package you recently purchased.</p>
                    <hr>
                    <p>
                        <strong>Client Name:</strong> ${client.name}<br>
                        <strong>Member ID:</strong> ${client.memberID}<br>
                        <strong>Package:</strong> ${subscription.packageId.name}<br>
                        <strong>Amount:</strong> ₹${subscription.packageId.amount}<br>
                        <strong>Discount:</strong> ₹${subscription.offerAmount}<br>
                        <strong>Paid:</strong> ₹${subscription.amountPaid}<br>
                        <strong>Pending:</strong> ₹${subscription.packageId.amount - subscription.offerAmount - subscription.amountPaid}<br>
                        <strong>Start Date:</strong> ${subscription.startDate}<br>
                        <strong>End Date:</strong> ${subscription.endDate}
                    </p>
                    <hr>
                    <p>We appreciate your trust in us and look forward to supporting you on your fitness journey.</p>
                    <p>Warm regards,<br>
                    Arya Anand<br>
                    <strong>Zivon Fitness</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Receipt-${client.memberID}.pdf`,
                    path: filePath
                },
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, '../public/images/logo.png'),
                    cid: 'logo' // matches the `cid:` in the <img src="cid:logo" />
                }
            ]
        });

        console.log("Receipt sent to:", client.email);
    } catch (err) {
        console.error("Error sending email:", err);
        throw new Error("Failed to send email");
    }
}

module.exports = { generateReceiptPDF, sendReceiptEmail };
