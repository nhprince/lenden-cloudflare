import jwt from '@tsndr/cloudflare-worker-jwt';

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ message: 'No token, authorization denied' }, 401);
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return c.json({ message: 'Invalid authorization format' }, 401);
  }
  
  const token = parts[1];

  try {
    // Decode the token — @tsndr/cloudflare-worker-jwt returns { header, payload, signature }
    const decoded = jwt.decode(token);
    if (!decoded) {
      return c.json({ message: 'Token is not valid' }, 401);
    }

    // Extract payload — the actual user data is in decoded.payload
    const payload = decoded.payload || decoded;
    const userId = payload.id || payload.userId || payload.sub;
    const userRole = payload.role || payload.type || 'owner';
    
    if (!userId) {
      return c.json({ message: 'Token is not valid' }, 401);
    }

    c.set('user', { id: userId, role: userRole, ...payload });

    const shopId = c.req.header('Shop-Id');
    if (shopId) {
      if (String(userRole).toLowerCase() === 'staff') {
        if (String(payload.shopId) !== String(shopId)) {
          return c.json({ message: 'Access denied: You are not assigned to this shop' }, 403);
        }
      } else {
        const shops = await c.env.DB.prepare('SELECT id FROM shops WHERE id = ? AND owner_id = ?')
          .bind(shopId, userId).all();
        if (shops.results.length === 0) {
          return c.json({ message: 'Access denied: You do not own this shop' }, 403);
        }
      }
      c.set('shopId', shopId);
    }

    await next();
  } catch (err) {
    console.error('Auth Middleware Error:', String(err).substring(0, 200));
    return c.json({ message: 'Token is not valid' }, 401);
  }
};
