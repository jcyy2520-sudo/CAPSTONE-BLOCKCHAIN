/**
 * Email Notification Service
 * Handles all email notifications to bidders and administrators
 */

class EmailService {
  static async sendApplicationConfirmation(bidderEmail, applicationId, companyName) {
    const subject = 'Application Received - Procurement System';
    const htmlBody = `
      <h2>Application Received</h2>
      <p>Dear ${companyName},</p>
      <p>Your bidder application has been successfully received.</p>
      <p><strong>Application ID:</strong> ${applicationId}</p>
      <p>You will be notified once your application is approved.</p>
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async sendApplicationApproved(bidderEmail, companyName, credentials) {
    const subject = 'Application Approved - Your Account is Ready';
    const htmlBody = `
      <h2>Congratulations! Your Application is Approved</h2>
      <p>Dear ${companyName},</p>
      <p>Your bidder application has been verified and approved.</p>
      <p><strong>Email:</strong> ${credentials.email}</p>
      <p><strong>Temporary Password:</strong> ${credentials.password}</p>
      <p>Login at: https://your-system-url/login</p>
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async sendApplicationRejected(bidderEmail, companyName, rejectionReason) {
    const subject = 'Application Status Update';
    const htmlBody = `
      <h2>Application Review Result</h2>
      <p>Dear ${companyName},</p>
      <p>After careful review, your application could not be approved.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async sendProcurementInvitation(bidderEmail, bidderName, procurementTitle, procurementMode, bidClosingDate) {
    const subject = `Invitation to Bid - ${procurementTitle}`;
    const closingDateFormatted = new Date(bidClosingDate).toLocaleDateString();
    const htmlBody = `
      <h2>You Have Been Invited to Bid</h2>
      <p>Dear ${bidderName},</p>
      <p>You are invited to participate in a bidding opportunity.</p>
      <p><strong>Title:</strong> ${procurementTitle}</p>
      <p><strong>Mode:</strong> ${procurementMode}</p>
      <p><strong>Bid Closing Date:</strong> ${closingDateFormatted}</p>
      <p>Login at: https://your-system-url/login</p>
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async sendBidSubmissionConfirmation(bidderEmail, bidderName, procurementTitle, submissionDate) {
    const subject = `Bid Submission Confirmed - ${procurementTitle}`;
    const htmlBody = `
      <h2>Your Bid Has Been Successfully Submitted</h2>
      <p>Dear ${bidderName},</p>
      <p>Your bid for "${procurementTitle}" has been received.</p>
      <p><strong>Submission Date & Time:</strong> ${new Date(submissionDate).toLocaleString()}</p>
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async sendBidEvaluationResult(bidderEmail, bidderName, procurementTitle, rank, totalScore, isWinner) {
    const subject = `Bid Evaluation Result - ${procurementTitle}`;
    const winnerText = isWinner ? '<p style="color: green;"><strong>Congratulations! Your bid has been selected!</strong></p>' : '';
    const htmlBody = `
      <h2>Bid Evaluation Result</h2>
      <p>Dear ${bidderName},</p>
      <p>The evaluation of bids for "${procurementTitle}" has been completed.</p>
      <p><strong>Overall Rank:</strong> ${rank}</p>
      <p><strong>Total Score:</strong> ${totalScore}</p>
      ${winnerText}
      <p>Best regards, Municipal Procurement Office</p>
    `;
    return this._sendEmail(bidderEmail, subject, htmlBody);
  }

  static async _sendEmail(toEmail, subject, htmlBody) {
    try {
      console.log('📧 EMAIL SENT');
      console.log(`   To: ${toEmail}`);
      console.log(`   Subject: ${subject}`);
      return { success: true, message: 'Email logged' };
    } catch (err) {
      console.error('Error sending email:', err);
      return { success: false, error: err.message };
    }
  }
}

export default EmailService;
