const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send expense notification to all directors.
 * @param {Object} opts
 * @param {string} opts.reason
 * @param {number} opts.totalAmount
 * @param {string} opts.addedBy
 * @param {string} opts.date
 * @param {Array}  opts.splits  — [{name, email, percentage, amount}]
 */
async function sendExpenseNotification({ reason, totalAmount, addedBy, date, splits }) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_gmail@gmail.com') {
    console.log('[Email stub] Expense notification would be sent:', { reason, totalAmount, addedBy });
    return;
  }

  const rows = splits
    .map(
      (s) =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${s.name}</td>
          <td style="padding:8px;border:1px solid #ddd;">${s.percentage}%</td>
          <td style="padding:8px;border:1px solid #ddd;">₹${s.amount.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#2563eb;">New Expense Added</h2>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
      <p><strong>Added By:</strong> ${addedBy}</p>
      <p><strong>Date:</strong> ${date}</p>
      <h3>Individual Shares</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Director</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Share %</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Login to the Expense System to track payments.</p>
    </div>
  `;

  const recipients = splits.map((s) => s.email).join(',');
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Expense System',
    to: recipients,
    subject: `[Expense] ${reason} — ₹${totalAmount.toFixed(2)}`,
    html,
  });
}

/**
 * Send share change request email.
 * @param {Object} opts
 * @param {Array}  opts.directors  — all directors with email
 * @param {Array}  opts.oldShares  — [{name, percentage}]
 * @param {Array}  opts.newShares  — [{name, percentage}]
 * @param {string} opts.requestedBy
 * @param {number} opts.requestId
 * @param {string} opts.frontendUrl
 */
async function sendShareChangeRequest({ directors, oldShares, newShares, requestedBy, requestId, frontendUrl }) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_gmail@gmail.com') {
    console.log('[Email stub] Share change request email would be sent for request', requestId);
    return;
  }

  const rows = oldShares
    .map((o) => {
      const n = newShares.find((x) => x.name === o.name) || { percentage: 0 };
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;">${o.name}</td>
        <td style="padding:8px;border:1px solid #ddd;">${o.percentage}%</td>
        <td style="padding:8px;border:1px solid #ddd;">${n.percentage}%</td>
      </tr>`;
    })
    .join('');

  const approveUrl = `${frontendUrl}/share-management?approve=${requestId}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#2563eb;">Share Change Request</h2>
      <p><strong>Requested By:</strong> ${requestedBy}</p>
      <p>The following share change has been proposed and requires <strong>2 approvals</strong>:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Director</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Old %</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">New %</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;">
        <a href="${approveUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Review & Approve
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;">Login to the Expense System to approve or reject this request.</p>
    </div>
  `;

  const recipients = directors.map((d) => d.email).join(',');
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Expense System',
    to: recipients,
    subject: `[Action Required] Share Change Request by ${requestedBy}`,
    html,
  });
}

module.exports = { sendExpenseNotification, sendShareChangeRequest };
