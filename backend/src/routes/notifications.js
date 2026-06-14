import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const notificationRoutes = new Hono();
notificationRoutes.use('*', authMiddleware);

notificationRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const { limit = 50, offset = 0 } = c.req.query();
  const notifications = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE shop_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(shopId, parseInt(limit), parseInt(offset)).all();
  return c.json(notifications.results);
});

notificationRoutes.put('/:id/read', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Notification marked as read' });
});

notificationRoutes.put('/read-all', async (c) => {
  const shopId = c.get('shopId');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE shop_id = ? AND is_read = 0').bind(shopId).run();
  return c.json({ message: 'All notifications marked as read' });
});

notificationRoutes.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Notification deleted' });
});
