const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}
// Updated PDF generation function with professional styling
function generateReceiptPDF(client, subscription) {
    const receiptsDir = path.join(__dirname, "receipts");
    if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const fileName = `${subscription.receiptID}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4", margins: {
                top: 50,
                left: 50,
                right: 50,
                bottom: 0
            }
        });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const primaryColor = "#2c2c2c";
        const lightGray = "#f4f4f4";
        const fadedText = "#666666";

        // Header background
        doc.rect(0, 0, doc.page.width, 300).fill(primaryColor);

        // Header Content
        try {
            const logoPath = path.join(__dirname, "../public/images/logo.png");
            const logo = fs.readFileSync(logoPath);
            doc.image(logo, doc.page.width - 100, 30, { width: 50 });
        } catch (e) {
            console.warn("Logo failed to load in PDF:", e.message);
        }

        const issueDate = formatDate(new Date());

        doc
            .fillColor("white")
            .fontSize(26)
            .font("Helvetica-Bold")
            .text("Invoice", 50, 40);

        doc
            .moveDown(2)
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("Invoice To:", 50, 90, { align: "left" })
            .moveDown(0.3)
            .font("Helvetica")
            .fillColor("#dddddd")
            .text(`${client.name}`, 50)
            .text(`${client.email}`, 50)
            .text(`${client.mobile}`, 50)
            .text(`${client.memberID}`, 50)

        doc
            .font("Helvetica")
            .fillColor("#dddddd")
            .text(`# ${subscription.receiptID}`, doc.page.width - 200, 90, { align: "right" })
            .text(`${issueDate}`, { align: "right" });

        // Body background
        doc.rect(0, 180, doc.page.width, doc.page.height).fill(lightGray);
        doc.fillColor("black");
        doc.moveDown(7);

        // Package Info
        // Fill with the primary color

        doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .text("Package Details", 50, doc.y - 25, { underline: true });

        doc
            .moveDown(1)
            .fontSize(12)
            .fillColor("black")
            .font("Helvetica")
            .text(`Package: ${subscription.packageId.name}`, 50)
            .text(`Duration: ${subscription.packageId.duration} days`, 50)
            .text(`Start Date: ${formatDate(subscription.startDate)}`, 50)
            .text(`End Date: ${formatDate(subscription.endDate)}`, 50)
            .moveDown();

        // Payment Summary in table-like layout
        const paymentTableTop = doc.y;
        const items = [
            ["Package Amount", `Rs. ${subscription.packageId.amount}`],
            ["Discount", `Rs. ${subscription.offerAmount || 0}`],
            ["Amount Paid", `Rs. ${subscription.amountPaid || 0}`],
            ["Pending Amount", `Rs. ${Math.max(subscription.packageId.amount - (subscription.offerAmount || 0) - (subscription.amountPaid || 0), 0)}`],
            ["Payment Method", `${subscription.paymentMethod}`],
        ];

        const tableTop = doc.y;
        const tableLeft = 50;
        const columnWidths = [250, 100];
        const rowHeight = 20;


        // Draw the data rows with a vertical line separating the columns
        let currentY = tableTop;
        doc.font("Helvetica").fillColor("black");

        items.forEach(([label, value]) => {
            // Draw the row background
            doc
                .lineWidth(0.5)
                .strokeColor("black")
                .rect(tableLeft, currentY, columnWidths[0] + columnWidths[1], rowHeight)
                .stroke();

            // Draw the vertical line separating the columns
            const separatorX = tableLeft + columnWidths[0];
            doc
                .moveTo(separatorX, currentY) // Start of the vertical line
                .lineTo(separatorX, currentY + rowHeight) // End of the vertical line
                .stroke();

            // Add text for each column
            doc
                .fillColor("black")
                .text(label, tableLeft + 5, currentY + 5) // First column
                .text(value, separatorX + 5, currentY + 5); // Second column

            currentY += rowHeight; // Move to the next row
        });

        doc.moveDown(3);

        // Footer bar
        const footerY = doc.page.height - 80;
        doc.rect(0, footerY, doc.page.width, 40).fill(primaryColor);
        doc
            .fillColor("white")
            .fontSize(10)
            .text("Zivon Fitness", 50, footerY + 15)
            .text("www.zivonfitness.com", doc.page.width / 2 - 50, footerY + 15)
            .text("zivonfitness@gmail.com", doc.page.width - 170, footerY + 15);

        // Note
        doc
            .fillColor("#666666")
            .fontSize(9)
            .text("This is a system-generated receipt and does not require a physical signature.", 50, footerY + 55, {
                align: "center",
            });

        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
    });
}

const zivonQuotes = [
    "Fitness isn’t a look. It’s a feeling.",
    "It’s not about changing your body, it’s about changing your life.",
    "At Zivon, we don’t chase perfection—we nurture progress.",
    "Stronger minds build stronger bodies.",
    "Your wellness is your foundation—not a finish line.",
    "Wellness is a journey—not a race.",
    "You don’t need to be extreme, just consistent.",
    "Surround yourself with those who lift you up—literally and mentally.",
    "Your journey is yours, but you’re never walking alone.",
    "Zivon is more than a gym—it’s your second family.",
    "Tiny habits. Big change. Every step counts.",
    "Fitness isn’t a 30-day plan. It’s a lifestyle of choices.",
    "Consistency beats intensity—every time.",
    "Taking care of yourself is a radical act of self-respect.",
    "At Zivon, we believe that strength starts in the mind and grows with every choice you make."
];

const { format } = require("date-fns");

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const daySuffix = ["th", "st", "nd", "rd"][(day % 10 > 3 || ~~(day % 100 / 10) === 1) ? 0 : day % 10];
    return `${day}${daySuffix} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
}

async function sendReceiptEmail(client, filePath, subscription) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // TLS over STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });


    try {
        const startDate = formatDate(subscription.startDate);
        const endDate = formatDate(subscription.endDate);
        const pendingAmount = subscription.packageId.amount - subscription.offerAmount - subscription.amountPaid;
        let randomQuote = zivonQuotes[Math.floor(Math.random() * zivonQuotes.length)];
        await transporter.sendMail({
            from: "Arya from Zivon Fitness <aryaanand053@gmail.com>",
            to: client.email,
            subject: `🧾 Your Zivon Receipt`,
            text: `Dear ${client.name},

Thank you for choosing Zivon Fitness.

Please find your subscription receipt attached.

Client Name: ${client.name}
Member ID: ${client.memberID}
Package: ${subscription.packageId.name}
Amount: ₹${subscription.packageId.amount}
Discount: ₹${subscription.offerAmount}
Paid: ₹${subscription.amountPaid}
Pending: ₹${pendingAmount}
Start Date: ${startDate}
End Date: ${endDate}

Stay strong. Stay consistent.

Warm regards,
Arya Anand
Zivon Fitness
            `.trim(),
            html: `
            <div style="max-width: 600px; margin: auto; font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background-color: #000; padding: 30px 20px; text-align: center;">
                    <img src="cid:logo" alt="Zivon Fitness Logo" style="height: 60px; margin-bottom: 10px;">
                    <h1 style="color: #f5c518; font-size: 28px; margin: 0;">Zivon Fitness</h1>
                    <p style="color: #ccc; margin-top: 5px;">Promoting Healthy Lifestyle</p>
                </div>

                <div style="padding: 30px 25px;">
                    <p style="font-size: 16px;">Dear <strong>${client.name}</strong>,</p>
                    <p style="font-size: 16px;">Thank you for choosing <strong>Zivon</strong>.</p>
                    <p style="font-size: 16px;">Attached to this email is your receipt for the package subscribed</p>

                    <hr>
                    <div style="background-color: #f5f5f5; border-radius: 10px; padding: 20px; margin: 20px 0;">
                        <p><strong>Client Name:</strong> ${client.name}<br></p>
                        <p><strong>Member ID:</strong> ${client.memberID}<br></p>
                        <p><strong>Package:</strong> ${subscription.packageId.name}<br></p>
                        <p><strong>Amount:</strong> ₹${subscription.packageId.amount}<br></p>
                        <p><strong>Discount:</strong> ₹${subscription.offerAmount}<br></p>
                        <p><strong>Paid:</strong> ₹${subscription.amountPaid}<br></p>
                        <p><strong>Payment Method:</strong> ${subscription.paymentMethod}<br></p>
                        <p><strong>Pending:</strong> ₹${pendingAmount}<br></p>
                        <p><strong>Start Date:</strong> ${startDate}<br></p>
                        <p><strong>End Date:</strong> ${endDate}</p>
                    </div>
                    <hr>

                    <blockquote style="font-style: italic; color:#f5c518; font-size: 18px; text-align: center; margin: 30px 0;">
                        “${randomQuote}”
                    </blockquote>

                    <p style="font-size: 16px;">If you have any questions, feel free to contact us. We’re always here to help you stay on track!</p>

                    <p style="font-size: 16px;">Warm regards,<br><strong>Arya Anand</strong><br><strong>Zivon Fitness</strong></p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.instagram.com/zivonfitness" style="margin: 0 10px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" style="height: 30px; width: 30px; border-radius: 50%;"/>
                    </a>
                    <a href="https://zivonfitness.com" style="margin: 0 10px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/Favicon.ico.png" alt="Website" style="height: 30px; width: 30px; border-radius: 50%;"/>
                    </a>
                    <a href="tel:+919944944999" style="margin: 0 10px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/Phone_icon.png" alt="Phone" style="height: 30px; width: 30px; border-radius: 50%;"/>
                    </a>
                </div>

                <div style="background-color: #000; color: #aaa; text-align: center; padding: 15px; font-size: 13px;">
                    &copy; ${new Date().getFullYear()} Zivon Fitness. All rights reserved.
                </div>
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
                    cid: 'logo'
                }
            ]
        });

        console.log("Receipt sent to:", client.email);
    } catch (err) {
        console.error("Error sending email:", err);
        // Clean up the PDF file if email fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error("Failed to send email");
    }
}


// Add a welcome letter later
async function sendNewClientEmail(client) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: "Arya from Zivon Fitness <aryaanand053@gmail.com>",
            to: client.email,
            subject: "👑 Welcome, " + client.name + "  to Zivon!",
            text: `Dear ${client.name},

Welcome to Zivon Fitness – Promoting Healthy Lifestyle.

We're thrilled to have you with us on this transformative journey. At Zivon, we believe in more than just fitness – we believe in empowering you to become the best version of yourself, inside and out.

Don't wish for it! Work for it!

To your health, strength, and legacy,
Zivon Fitness`,
            html: `
    <div style="max-width: 600px; margin: auto; font-family: 'Segoe UI', sans-serif; color: #2b2b2b; background-color: #fdfdfd; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background-color: #000; padding: 30px 20px; text-align: center;">
            <img src="cid:logo" alt="Zivon Fitness Logo" style="height: 60px; margin-bottom: 10px;">
            <h1 style="color: #f5c518; font-size: 28px; margin: 0;">Welcome to Zivon Fitness!</h1>
            <p style="color: #ccc; margin-top: 5px;">Promoting Healthy Lifestyle</p>
        </div>
        <div style="padding: 30px 25px;">
            <p style="font-size: 16px;">Dear <strong>${client.name}</strong>,</p>
            <p style="font-size: 16px;">
                Welcome to the Zivon family – where ambition meets excellence.
                We're honored to have you as part of our growing fitness community.
            </p>
            <p style="font-size: 16px;">
                Your journey towards a healthier, stronger, and more empowered version of yourself begins now.
                With personalized training, expert support, and a community of champions by your side – greatness awaits.
            </p>

            <blockquote style="font-style: italic; color: #f5c518; font-size: 18px; text-align: center; margin: 30px 0;">
                “Don't wish for it! Work for it!”
            </blockquote>

          
            <p style="font-size: 16px;">To a journey that transforms you – inside and out,<br><strong>Team Zivon</strong></p>
            
                        <!-- WhatsApp Community CTA -->
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="font-size: 14px; color: #777; margin-bottom: 20px;">
                                Join our exclusive WhatsApp community to get updates about various events being conducted!
                            </p>
                            <a href="https://chat.whatsapp.com/KiUyYBq1PCK0ezJyZ2wKua" style="padding: 12px 25px; background-color: #25D366; color: white; text-decoration: none; font-weight: bold; border-radius: 30px;">Join Now</a>
                        </div>
            
                        <p style="font-size: 14px; color: #777;">
                            If you have any questions, feel free to contact us. We're always here to support you.
                        </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <!-- Social Media Links -->
            <a href="https://www.instagram.com/zivoWnfitness" style="margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/1024px-Instagram_icon.png" alt="Instagram" style="height: 30px; width: 30px; border-radius: 50%;"/>
            </a>
            <a href="zivonfitness.com" style="margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/Favicon.ico.png" alt="Website" style="height: 30px; width: 30px; border-radius: 50%;"/>
            </a>
            <a href="tel:+919944944999" style="margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/Phone_icon.png" alt="Phone" style="height: 30px; width: 30px; border-radius: 50%;"/>
            </a>
        </div>

        <div style="background-color: #000; color: #aaa; text-align: center; padding: 15px; font-size: 13px;">
            &copy; ${new Date().getFullYear()} Zivon Fitness. All rights reserved.
        </div>
    </div>
  `,
            attachments: [
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, '../public/images/logo.png'),
                    cid: 'logo'
                }
            ]
        });

        console.log("Welcome email sent to:", client.email);

    } catch {
        console.error("Error sending email:", err);
        throw new Error("Failed to send email");
    }
}

module.exports = { generateReceiptPDF, sendReceiptEmail, sendNewClientEmail };
