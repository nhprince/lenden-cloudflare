import jwt from '@tsndr/cloudflare-worker-jwt';

export const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return c.json({ message: 'No token, authorization denied' }, 401);
  }

  try {
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) {
      return c.json({ message: 'Token is not valid' }, 401);
    }

    const decoded = jwt.decode(token);
    c.set('user', decoded);

    const shopId = c.req.header('Shop-Id');

    if (shopId) {
      if (String(decoded.role).toLowerCase() === 'staff') {
        if (String(decoded.shopId) !== String(shopId)) {
          return c.json({ message: 'Access denied: You are not assigned to this shop' }, 403);
        }
      } else {
        const shops = await c.env.DB.prepare('SELECT id FROM shops WHERE id = ? AND owner_id = ?')
          .bind(shopId, decoded.id).all();
        if (shops.results.length === 0) {
          return c.json({ message: 'Access denied: You do not own this shop' }, 403);
        }
      }
      c.set('shopId', shopId);
    }

    await next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    return c.json({ message: 'Token is not valid' }, 401);
  }
};
