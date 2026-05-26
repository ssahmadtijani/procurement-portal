import { transporter } from '../config/email';
import { env } from '../config/env';

const emailEnabled = !!env.smtp.user && !!env.smtp.pass;

const send = async (to: string, subject: string, html: string): Promise<void> => {
  if (!emailEnabled) return; // skip if SMTP not configured
  await transporter.sendMail({ from: env.smtp.from, to, subject, html });
};

const baseLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 32px; }
  .header { background: #1e40af; color: #fff; padding: 20px 32px; border-radius: 8px 8px 0 0; margin: -32px -32px 24px; }
  .btn { display: inline-block; background: #1e40af; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
  .footer { margin-top: 32px; font-size: 12px; color: #888; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h2 style="margin:0">Procurement Portal</h2></div>
    ${content}
    <div class="footer"><p>This is an automated message from the Procurement Portal. Please do not reply.</p></div>
  </div>
</body>
</html>
`;

export const emailService = {
  async sendSupplierVerificationEmail(
    email: string,
    firstName: string,
    status: string,
    rejectionNote?: string
  ) {
    const subject =
      status === 'VERIFIED'
        ? 'Your supplier profile has been verified'
        : 'Supplier profile verification update';
    const html = baseLayout(
      status === 'VERIFIED'
        ? `<p>Dear ${firstName},</p>
           <p>Congratulations! Your supplier profile has been <strong>verified</strong>.</p>
           <p>You can now log in and start bidding on open RFQs.</p>
           <a href="${env.frontendUrl}/login" class="btn">Login to Portal</a>`
        : `<p>Dear ${firstName},</p>
           <p>We regret to inform you that your supplier profile has been <strong>rejected</strong>.</p>
           <p><strong>Reason:</strong> ${rejectionNote ?? 'Not specified'}</p>
           <p>Please contact our support team for more information.</p>`
    );
    await send(email, subject, html);
  },

  async sendRFQPublishedEmail(
    email: string,
    firstName: string,
    rfqTitle: string,
    deadline: Date
  ) {
    const html = baseLayout(`
      <p>Dear ${firstName},</p>
      <p>A new Request for Quotation (RFQ) has been published:</p>
      <p><strong>${rfqTitle}</strong></p>
      <p><strong>Deadline:</strong> ${deadline.toLocaleDateString()}</p>
      <p>Log in to the portal to view details and submit your bid.</p>
      <a href="${env.frontendUrl}/supplier/rfq" class="btn">View RFQ</a>
    `);
    await send(email, `New RFQ: ${rfqTitle}`, html);
  },

  async sendBidAwardedEmail(
    email: string,
    firstName: string,
    rfqTitle: string,
    poNumber: string
  ) {
    const html = baseLayout(`
      <p>Dear ${firstName},</p>
      <p>Congratulations! Your bid for the following RFQ has been <strong>awarded</strong>:</p>
      <p><strong>${rfqTitle}</strong></p>
      <p>A Purchase Order (<strong>${poNumber}</strong>) has been generated. Please log in to view and acknowledge it.</p>
      <a href="${env.frontendUrl}/supplier/purchase-orders" class="btn">View Purchase Order</a>
    `);
    await send(email, `Bid Awarded — ${rfqTitle}`, html);
  },

  async sendPOEmail(email: string, firstName: string, poNumber: string) {
    const html = baseLayout(`
      <p>Dear ${firstName},</p>
      <p>Purchase Order <strong>${poNumber}</strong> has been issued to you.</p>
      <p>Please log in to review and acknowledge the order.</p>
      <a href="${env.frontendUrl}/supplier/purchase-orders" class="btn">View Purchase Order</a>
    `);
    await send(email, `Purchase Order ${poNumber} Issued`, html);
  },

  async sendInvoiceStatusEmail(
    email: string,
    firstName: string,
    invoiceNumber: string,
    status: string,
    rejectionNote?: string
  ) {
    const subject = `Invoice ${invoiceNumber} — ${status}`;
    const html = baseLayout(
      status === 'APPROVED'
        ? `<p>Dear ${firstName},</p>
           <p>Your invoice <strong>${invoiceNumber}</strong> has been <strong>approved</strong>.</p>
           <p>Payment will be processed as per the agreed terms.</p>`
        : `<p>Dear ${firstName},</p>
           <p>Your invoice <strong>${invoiceNumber}</strong> has been <strong>rejected</strong>.</p>
           <p><strong>Reason:</strong> ${rejectionNote ?? 'Not specified'}</p>
           <p>Please resubmit a corrected invoice.</p>`
    );
    await send(email, subject, html);
  },
};
