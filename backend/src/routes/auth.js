import { Hono } from 'hono';
import jwt from '@tsndr/cloudflare-worker-jwt';
import bcrypt from 'bcryptjs';
import { getEmailTemplate } from '../utils/emailService.js';
import { createOnboardingNotifications, createPasswordResetNotification } from '../services/notificationService.js';

const FRONTEND_ORIGIN = 'https://lenden.pages.dev';

export const authRoutes = new Hono();

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const { name, email, password, shopName } = await c.req.json();
  if (!name || !email || !password) return c.json({ message: 'Name, email and password are required' }, 400);

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ message: 'User already exists' }, 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomUUID();

    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (name, email, password, verification_token) VALUES (?, ?, ?, ?)'
    ).bind(name, email, hashedPassword, verificationToken).run();

    const userId = userResult.meta.last_row_id;

    const shopResult = await c.env.DB.prepare(
      'INSERT INTO shops (name, owner_id, business_type) VALUES (?, ?, ?)'
    ).bind(shopName || `${name}'s Shop`, userId, 'bike_sales').run();

    // Auto-verify and generate token
    await c.env.DB.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').bind(userId).run();
    const payload = { id: userId, role: 'owner' };
    const token = await jwt.sign(payload, c.env.JWT_SECRET);

    try { await createOnboardingNotifications(c.env, shopResult.meta.last_row_id); } catch (e) { console.error(e); }

    const verificationLink = `${FRONTEND_ORIGIN}/#/verify-email/${verificationToken}`;
    const emailBody = getEmailTemplate('Confirm Your Registration',
      `<p>Hello <strong>${name}</strong>,</p><p>Welcome to Lenden! We're excited to help you manage your shop.</p><p>Please confirm your email address by clicking the button below.</p>`,
      'Verify Email Address', verificationLink,
      'If you did not sign up for a Lenden account, you can safely ignore this email.');

    if (c.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Lenden <noreply@lenden.pages.dev>', to: email, subject: 'Verify your Lenden Account', html: emailBody })
      });
    }

    return c.json({
      message: 'User registered successfully.',
      userId,
      token,
      user: { id: userId, name, email, role: 'owner', shopId: shopResult.meta.last_row_id }
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ message: 'Email and password are required' }, 400);

  try {
    let user = null;
    let userType = 'owner';

    const owners = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (owners) {
      user = owners;
    } else {
      const staff = await c.env.DB.prepare('SELECT * FROM staff WHERE (email = ? OR username = ?) AND status = "active"').bind(email, email).first();
      if (staff) { user = staff; userType = 'Staff'; }
    }

    if (!user) return c.json({ message: 'Invalid credentials' }, 400);
    if (userType === 'owner' && !user.is_verified) {
      return c.json({ message: 'Please verify your email address before logging in.', needsVerification: true, email: user.email }, 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return c.json({ message: 'Invalid credentials' }, 400);

    const payload = { id: user.id, role: user.role || userType };
    if (userType === 'Staff' || user.role === 'Staff') payload.shopId = user.shop_id;

    const token = await jwt.sign(payload, c.env.JWT_SECRET);

    // Fetch shop info for response
    let userShopId = user.shop_id || null;
    if (!userShopId && userType === 'owner') {
      const ownerShop = await c.env.DB.prepare('SELECT id FROM shops WHERE owner_id = ?').bind(user.id).first();
      userShopId = ownerShop?.id || null;
    }

    return c.json({
      token,
      user: { id: user.id, name: user.name, username: user.username || null, email: user.email, role: user.role || userType, shopId: userShopId }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// POST /api/auth/forgot-password
authRoutes.post('/forgot-password', async (c) => {
  const { email } = await c.req.json();
  try {
    const user = await c.env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first();
    if (!user) return c.json({ message: 'If an account exists, a reset link has been sent.' });

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await c.env.DB.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?').bind(token, expires, email).run();

    const resetLink = `${FRONTEND_ORIGIN}/#/reset-password?email=${email}&token=${token}`;
    const emailBody = getEmailTemplate('Reset Password Request',
      `<p>We received a request to reset the password for your Lenden account.</p><p>Click the button below to set a new password. This link will expire in 1 hour.</p>`,
      'Reset My Password', resetLink,
      'If you did not request a password reset, no further action is required.');

    if (c.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Lenden <noreply@lenden.pages.dev>', to: email, subject: 'Reset your Lenden Password', html: emailBody })
      });
    }

    return c.json({ message: 'Reset link sent.' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// POST /api/auth/reset-password
authRoutes.post('/reset-password', async (c) => {
  const { email, token, recoveryCode, newPassword } = await c.req.json();
  try {
    let query, params;
    if (token) {
      query = 'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_expires > datetime("now")';
      params = [email, token];
    } else if (recoveryCode) {
      query = 'SELECT * FROM users WHERE email = ? AND recovery_code = ?';
      params = [email, recoveryCode];
    } else {
      return c.json({ message: 'Token or recovery code required' }, 400);
    }

    const user = await c.env.DB.prepare(query).bind(...params).first();
    if (!user) return c.json({ message: 'Invalid or expired reset credentials' }, 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await c.env.DB.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').bind(hashedPassword, user.id).run();

    const shops = await c.env.DB.prepare('SELECT id FROM shops WHERE owner_id = ?').bind(user.id).first();
    if (shops) await createPasswordResetNotification(c.env, { user_id: user.id, shop_id: shops.id });

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// GET /api/auth/verify-email/:token
authRoutes.get('/verify-email/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE verification_token = ?').bind(token).first();
    if (!user) return c.json({ message: 'Invalid or expired verification token.' }, 400);

    await c.env.DB.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').bind(user.id).run();
    return c.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// POST /api/auth/resend-verification
authRoutes.post('/resend-verification', async (c) => {
  const { email } = await c.req.json();
  try {
    const user = await c.env.DB.prepare('SELECT id, is_verified, name FROM users WHERE email = ?').bind(email).first();
    if (!user) return c.json({ message: 'User not found' }, 404);
    if (user.is_verified) return c.json({ message: 'Account already verified' }, 400);

    const token = crypto.randomUUID();
    await c.env.DB.prepare('UPDATE users SET verification_token = ? WHERE id = ?').bind(token, user.id).run();

    const verificationLink = `${FRONTEND_ORIGIN}/#/verify-email/${token}`;
    const emailBody = getEmailTemplate('New Verification Link',
      `<p>Hello,</p><p>Here is a new link to verify your Lenden account.</p>`,
      'Verify Now', verificationLink);

    if (c.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Lenden <noreply@lenden.pages.dev>', to: email, subject: 'Verify your Lenden Account', html: emailBody })
      });
    }

    return c.json({ message: 'Verification email resent.' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// GET /api/auth/me (protected)
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    return c.json(decoded.payload || decoded);
  } catch (err) {
    return c.json({ message: 'Token is not valid' }, 401);
  }
});

// POST /api/auth/change-password (protected)
authRoutes.post('/change-password', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    const payload = decoded.payload || decoded;
    const { oldPassword, newPassword } = await c.req.json();

    const table = (payload.role === 'owner' || payload.role === 'admin') ? 'users' : 'staff';
    const user = await c.env.DB.prepare(`SELECT password FROM ${table} WHERE id = ?`).bind(payload.id).first();
    if (!user) return c.json({ message: 'User not found' }, 404);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return c.json({ message: 'Current password incorrect' }, 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await c.env.DB.prepare(`UPDATE ${table} SET password = ? WHERE id = ?`).bind(hashedPassword, payload.id).run();

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// POST /api/auth/avatar (protected)
authRoutes.post('/avatar', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    const payload = decoded.payload || decoded;

    const formData = await c.req.formData();
    const file = formData.get('avatar');
    if (!file || !(file instanceof File)) return c.json({ message: 'No file uploaded' }, 400);

    const ext = file.name?.split('.').pop() || 'png';
    const filename = `avatars/avatar-${payload.id}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
    await c.env.BUCKET.put(filename, file);
    const avatarUrl = `/files/${filename}`;

    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(avatarUrl, payload.id).run();
    return c.json({ message: 'Avatar uploaded successfully', avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return c.json({ message: 'Failed to upload avatar' }, 500);
  }
});

// PUT /api/auth/profile (protected)
authRoutes.put('/profile', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    const payload = decoded.payload || decoded;
    const { name, email } = await c.req.json();

    await c.env.DB.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').bind(name, email, payload.id).run();
    return c.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// GET /api/auth/recovery-code (protected)
authRoutes.get('/recovery-code', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    const payload = decoded.payload || decoded;

    const user = await c.env.DB.prepare('SELECT recovery_code FROM users WHERE id = ?').bind(payload.id).first();
    if (!user) return c.json({ message: 'User not found' }, 404);

    let code = user.recovery_code;
    if (!code) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await c.env.DB.prepare('UPDATE users SET recovery_code = ? WHERE id = ?').bind(code, payload.id).run();
    }

    return c.json({ recovery_code: code });
  } catch (error) {
    console.error(error);
    return c.json({ message: 'Server error' }, 500);
  }
});
