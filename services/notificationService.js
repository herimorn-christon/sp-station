import nodemailer from 'nodemailer';
import { MLService } from './mlService.js';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Test the connection
emailTransporter.verify(function(error, success) {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

class NotificationService {
  static async sendEmail(to = 'herimornchriston@gmail.com', subject, html) {
    try {
      await emailTransporter.sendMail({
        from: 'herimornix@gmail.com',
        to,
        subject,
        html
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  static async notifyComplaint(complaint, users) {
    const urgencyScore = await this.calculateComplaintUrgency(complaint);
    const emailTemplate = this.generateComplaintEmailTemplate(complaint, urgencyScore);

    for (const user of users) {
      await this.sendEmail(user.email, 'New Complaint Notification', emailTemplate);
    }
  }

  static async notifySalesReport(report, users) {
    const insights = await MLService.analyzeSalesReport(report);
    const emailTemplate = this.generateSalesReportEmailTemplate(report, insights);

    for (const user of users) {
      await this.sendEmail(user.email, 'Sales Report Summary', emailTemplate);
    }
  }

  static async calculateComplaintUrgency(complaint) {
    // Use ML to analyze complaint text and determine urgency
    const features = [
      complaint.description.length,
      complaint.description.toLowerCase().includes('urgent') ? 1 : 0,
      complaint.description.toLowerCase().includes('emergency') ? 1 : 0
    ];

    const urgencyScore = await MLService.predictUrgency(features);
    return urgencyScore;
  }

  static generateComplaintEmailTemplate(complaint, urgencyScore) {
    const urgencyClass = urgencyScore > 0.7 ? 'text-red-600' : 'text-yellow-600';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Complaint Notification</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0;">${complaint.title}</h3>
          <p style="color: #4b5563;">${complaint.description}</p>
          <div style="margin-top: 20px;">
            <p style="margin: 5px 0;"><strong>Station:</strong> ${complaint.station_name}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${complaint.status}</p>
            <p style="margin: 5px 0;"><strong>Urgency:</strong> 
              <span class="${urgencyClass}">${urgencyScore > 0.7 ? 'High' : 'Normal'}</span>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  static generateSalesReportEmailTemplate(report, insights) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Sales Report Summary</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0;">Performance Overview</h3>
          
          <div style="margin-top: 20px;">
            <h4 style="color: #4b5563;">Key Metrics</h4>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;">
                <strong>Total Sales:</strong> ₦${report.totalSales.toLocaleString()}
              </li>
              <li style="margin: 10px 0;">
                <strong>Growth Rate:</strong> ${insights.growthRate}%
              </li>
              <li style="margin: 10px 0;">
                <strong>Prediction Accuracy:</strong> ${insights.predictionAccuracy}%
              </li>
            </ul>
          </div>

          <div style="margin-top: 20px;">
            <h4 style="color: #4b5563;">AI Insights</h4>
            <p>${insights.summary}</p>
          </div>

          <div style="margin-top: 20px;">
            <h4 style="color: #4b5563;">Recommendations</h4>
            <ul style="list-style: none; padding: 0;">
              ${insights.recommendations.map(rec => `
                <li style="margin: 10px 0;">• ${rec}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default NotificationService;