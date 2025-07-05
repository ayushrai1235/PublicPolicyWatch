import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendEmailNotification({ policy, analysis, drafts }) {
  try {
    // Verify transporter configuration
    await transporter.verify();
    
    const emailContent = generateEmailContent(policy, analysis, drafts);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for now, can be configured per user
      subject: `🐾 New Animal Welfare Policy Alert: ${policy.title}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments: generateAttachments(policy, drafts)
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

function generateEmailContent(policy, analysis, drafts) {
  const deadlineDate = new Date(policy.deadline);
  const daysUntilDeadline = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animal Welfare Policy Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #16a34a); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .alert-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .alert-box.urgent { background: #fee2e2; border-color: #ef4444; }
        .policy-details { background: #f8fafc; border-radius: 8px; padding: 25px; margin: 20px 0; }
        .policy-details h2 { color: #1e40af; margin-top: 0; }
        .analysis-section { background: #ecfdf5; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; }
        .draft-section { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .draft-section h3 { color: #1e40af; margin-top: 0; }
        .draft-content { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 10px 0; font-family: Georgia, serif; line-height: 1.8; }
        .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐾 Animal Welfare Policy Alert</h1>
        <p>New consultation opportunity detected</p>
    </div>
    
    ${daysUntilDeadline <= 7 ? `
    <div class="alert-box urgent">
        <strong>⚠️ URGENT:</strong> This consultation deadline is in ${daysUntilDeadline} days! Immediate action required.
    </div>
    ` : `
    <div class="alert-box">
        <strong>📅 Deadline Notice:</strong> You have ${daysUntilDeadline} days to submit your response.
    </div>
    `}
    
    <div class="policy-details">
        <h2>${policy.title}</h2>
        <p><strong>Ministry:</strong> ${policy.ministry}</p>
        <p><strong>Deadline:</strong> ${deadlineDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Description:</strong> ${policy.description}</p>
        <p><strong>Source:</strong> <a href="${policy.sourceUrl}" target="_blank">${policy.sourceUrl}</a></p>
    </div>
    
    <div class="analysis-section">
        <h3>🤖 AI Analysis Results</h3>
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${analysis.relevanceScore}%</div>
                <div class="stat-label">Relevance Score</div>
            </div>
            <div class="stat">
                <div class="stat-number">${analysis.urgencyLevel.toUpperCase()}</div>
                <div class="stat-label">Urgency Level</div>
            </div>
            <div class="stat">
                <div class="stat-number">${analysis.isAnimalWelfare ? 'YES' : 'NO'}</div>
                <div class="stat-label">Animal Welfare Related</div>
            </div>
        </div>
        <p><strong>Analysis:</strong> ${analysis.analysis}</p>
        ${analysis.animalWelfareAspects && analysis.animalWelfareAspects.length > 0 ? `
        <p><strong>Key Animal Welfare Aspects:</strong></p>
        <ul>
            ${analysis.animalWelfareAspects.map(aspect => `<li>${aspect}</li>`).join('')}
        </ul>
        ` : ''}
    </div>
    
    <h2>📝 Generated Response Drafts</h2>
    <p>Three different response approaches have been generated for your review:</p>
    
    <div class="draft-section">
        <h3>⚖️ Legal & Regulatory Approach</h3>
        <div class="draft-content">
            ${drafts.legal ? drafts.legal.replace(/\n/g, '<br>') : 'Draft generation failed'}
        </div>
    </div>
    
    <div class="draft-section">
        <h3>❤️ Emotional & Compassionate Approach</h3>
        <div class="draft-content">
            ${drafts.emotional ? drafts.emotional.replace(/\n/g, '<br>') : 'Draft generation failed'}
        </div>
    </div>
    
    <div class="draft-section">
        <h3>📊 Data-Driven & Evidence-Based Approach</h3>
        <div class="draft-content">
            ${drafts.dataBacked ? drafts.dataBacked.replace(/\n/g, '<br>') : 'Draft generation failed'}
        </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${policy.sourceUrl}" class="cta-button" target="_blank">📄 View Original Consultation</a>
        <a href="mailto:${policy.ministry.toLowerCase().replace(/\s+/g, '')}@gov.in" class="cta-button">📧 Submit Response</a>
    </div>
    
    <div class="footer">
        <p>This alert was generated by the Animal Welfare Policy Monitoring System</p>
        <p>Powered by AI • Delivered with 🐾</p>
        <p><small>Discovered on ${new Date(policy.discoveredAt).toLocaleDateString('en-IN')}</small></p>
    </div>
</body>
</html>`;

  const text = `
ANIMAL WELFARE POLICY ALERT
${policy.title}

Ministry: ${policy.ministry}
Deadline: ${deadlineDate.toLocaleDateString('en-IN')}
Days Remaining: ${daysUntilDeadline}

DESCRIPTION:
${policy.description}

AI ANALYSIS:
- Relevance Score: ${analysis.relevanceScore}%
- Animal Welfare Related: ${analysis.isAnimalWelfare ? 'Yes' : 'No'}
- Urgency Level: ${analysis.urgencyLevel}
- Analysis: ${analysis.analysis}

GENERATED DRAFTS:

LEGAL APPROACH:
${drafts.legal || 'Draft generation failed'}

EMOTIONAL APPROACH:
${drafts.emotional || 'Draft generation failed'}

DATA-DRIVEN APPROACH:
${drafts.dataBacked || 'Draft generation failed'}

SOURCE: ${policy.sourceUrl}

---
Generated by Animal Welfare Policy Monitoring System
`;

  return { html, text };
}

function generateAttachments(policy, drafts) {
  const attachments = [];
  
  // Create text file attachments for each draft
  if (drafts.legal) {
    attachments.push({
      filename: `${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}_Legal_Draft.txt`,
      content: drafts.legal,
      contentType: 'text/plain'
    });
  }
  
  if (drafts.emotional) {
    attachments.push({
      filename: `${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}_Emotional_Draft.txt`,
      content: drafts.emotional,
      contentType: 'text/plain'
    });
  }
  
  if (drafts.dataBacked) {
    attachments.push({
      filename: `${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}_DataBacked_Draft.txt`,
      content: drafts.dataBacked,
      contentType: 'text/plain'
    });
  }
  
  return attachments;
}

// Test email function
export async function sendTestEmail() {
  try {
    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: '🧪 Animal Welfare Monitor - Test Email',
      html: `
        <h2>Test Email Successful! 🎉</h2>
        <p>Your email configuration is working correctly.</p>
        <p>The Animal Welfare Policy Monitoring System is ready to send notifications.</p>
        <p><small>Sent at: ${new Date().toLocaleString('en-IN')}</small></p>
      `,
      text: 'Test email successful! Your email configuration is working correctly.'
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log('Test email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Test email failed:', error);
    throw error;
  }
}