const getEmailTemplate = (title, content, buttonText, buttonLink, footerNote = '') => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center; color: #ffffff; }
          .logo-icon { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 40px; }
          .title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
          .message { color: #475569; margin-bottom: 30px; font-size: 16px; }
          .button-container { text-align: center; margin: 35px 0; }
          .button { background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; }
          .footer { background-color: #f1f5f9; padding: 25px; text-align: center; font-size: 13px; color: #64748b; }
          .link-fallback { font-size: 12px; color: #94a3b8; margin-top: 20px; word-break: break-all; }
          .hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="logo-icon">🏪</div>
              <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px;">Lenden</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Premium Shop Management</p>
          </div>
          <div class="content">
              <div class="title">${title}</div>
              <div class="message">${content}</div>
              ${buttonText ? `
              <div class="button-container">
                  <a href="${buttonLink}" class="button">${buttonText}</a>
              </div>
              ` : ''}
              <div class="hr"></div>
              <p style="font-size: 14px; color: #64748b;">${footerNote || 'If you have any questions, feel free to reply to this email or contact our support team.'}</p>
              <div class="link-fallback">
                  Trouble clicking the button? Copy and paste this link into your browser:<br>
                  <a href="${buttonLink}" style="color: #2563eb;">${buttonLink}</a>
              </div>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Lenden POS. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
  `;
};

export const sendEmail = async (env, to, subject, html) => {
  if (!to || !to.includes('@')) {
    console.error('Invalid email address:', to);
    return false;
  }

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Lenden <noreply@lenden.pages.dev>',
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
      return false;
    }

    console.log('Email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
};

export { getEmailTemplate };
