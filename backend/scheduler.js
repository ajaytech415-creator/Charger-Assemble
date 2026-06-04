import cron from 'node-cron';
import nodemailer from 'nodemailer';
import db from './db.js';
import { generateWipExcelBuffer } from './routes/wipReport.js';

// Setup nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const runBackupJob = async () => {
  console.log('🔄 Starting scheduled backup job...');

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP_USER or SMTP_PASS not set in environment variables. Email backup aborted.');
      return;
    }

    // 1. Generate JSON Backup
    const databaseJson = JSON.stringify(db.data, null, 2);
    const dbBuffer = Buffer.from(databaseJson, 'utf-8');

    // 2. Generate WIP Excel Report
    const { buf: excelBuffer, filename: excelFilename } = generateWipExcelBuffer(); // All time default

    // 3. Send Email
    const transporter = createTransporter();
    
    // Format timestamp nicely
    const today = new Date();
    const timestamp = today.toISOString().split('T')[0];
    const dbFilename = `Database_Backup_${timestamp}.json`;

    const info = await transporter.sendMail({
      from: `"Assembly Backup System" <${process.env.SMTP_USER}>`,
      to: 'Ringproduction@ultrahuman.com',
      subject: `Weekly Assembly Backup & WIP Report - ${timestamp}`,
      text: 'Hello,\n\nAttached are the weekly database full JSON backup and the complete WIP Material Report Excel.\n\nKeep up the great work!\n- System Automated Backup',
      attachments: [
        {
          filename: dbFilename,
          content: dbBuffer,
        },
        {
          filename: excelFilename,
          content: excelBuffer,
        },
      ],
    });

    console.log(`✅ Weekly backup email sent successfully! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Failed to run backup job:', error);
  }
};

export const initScheduler = () => {
  // Run every Sunday at 00:00 (Midnight)
  cron.schedule('0 0 * * 0', () => {
    runBackupJob();
  });
  console.log('🕒 Scheduler initialized. Backup job scheduled for Sundays at 00:00.');
};
