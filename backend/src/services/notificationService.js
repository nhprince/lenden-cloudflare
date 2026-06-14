export async function createNotification(env, { shop_id, user_id = null, type, title, message, action_url = null, data = null, icon = 'notifications', scheduled_for = null }) {
  try {
    await env.DB.prepare(
      `INSERT INTO notifications (shop_id, user_id, type, title, message, action_url, data, icon, scheduled_for)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(shop_id, user_id, type, title, message, action_url, data ? JSON.stringify(data) : null, icon, scheduled_for).run();
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function getNotifications(env, shop_id, user_id = null, limit = 50) {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM notifications
       WHERE shop_id = ? AND (user_id = ? OR user_id IS NULL)
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(shop_id, user_id, limit).all();
    return result.results;
  } catch (error) {
    console.error('Failed to get notifications:', error);
    throw error;
  }
}

export async function getUnreadCount(env, shop_id, user_id = null) {
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM notifications
       WHERE shop_id = ? AND (user_id = ? OR user_id IS NULL) AND is_read = 0`
    ).bind(shop_id, user_id).all();
    return result.results[0]?.count || 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

export async function markAsRead(env, notification_id, shop_id) {
  try {
    const result = await env.DB.prepare(
      `UPDATE notifications SET is_read = 1
       WHERE id = ? AND shop_id = ?`
    ).bind(notification_id, shop_id).run();
    return result.meta.changes > 0;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

export async function markAllAsRead(env, shop_id, user_id = null) {
  try {
    await env.DB.prepare(
      `UPDATE notifications SET is_read = 1
       WHERE shop_id = ? AND (user_id = ? OR user_id IS NULL)`
    ).bind(shop_id, user_id).run();
    return true;
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    return false;
  }
}

export async function deleteNotificationById(env, id, shop_id) {
  try {
    await env.DB.prepare('DELETE FROM notifications WHERE id = ? AND shop_id = ?').bind(id, shop_id).run();
    return true;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

export async function createLowStockNotification(env, { shop_id, product_name, current_stock, min_stock, message, product_count, product_id }) {
  let title = 'Low Stock Alert';
  let msg = message;
  let data = null;

  if (!msg) {
    if (product_name) {
      title = `Low Stock Alert: ${product_name}`;
      msg = `${product_name} is running low. Current: ${current_stock}, Minimum: ${min_stock}`;
      data = { product_id, product_name };
    } else {
      msg = `You have ${product_count} products running low on stock.`;
    }
  }

  return createNotification(env, {
    shop_id,
    user_id: null,
    type: 'low_stock',
    title,
    message: msg,
    action_url: '/products?low_stock=true',
    icon: 'inventory_2',
    data
  });
}

export async function createNewSaleNotification(env, { shop_id, transaction }) {
  return createNotification(env, {
    shop_id,
    user_id: null,
    type: 'transaction',
    title: 'New Sale Completed',
    message: `Sale of ৳${transaction.amount.toLocaleString()} completed successfully.`,
    action_url: '/transactions',
    icon: 'shopping_cart',
    data: { transaction_id: transaction.id }
  });
}

export async function createPasswordResetNotification(env, { user_id, shop_id }) {
  return createNotification(env, {
    shop_id,
    user_id,
    type: 'password_reset',
    title: 'Password Reset Successful',
    message: 'Your password has been reset successfully. If this wasn\'t you, please contact support immediately.',
    action_url: '/settings',
    icon: 'lock_reset'
  });
}

export async function createOnboardingNotifications(env, shop_id) {
  const onboardingSteps = [
    { day: 0, title: '👋 Welcome to Lenden!', message: "Let's get your shop set up. Start by completing your shop profile.", action_url: '/settings', icon: 'waving_hand' },
    { day: 0, title: '📦 Add Your First Product', message: 'Build your inventory by adding products.', action_url: '/products', icon: 'inventory_2' },
    { day: 1, title: '💰 Ready to Make a Sale?', message: 'Open the POS to create your first transaction.', action_url: '/pos', icon: 'point_of_sale' },
    { day: 2, title: '👥 Add Staff Members', message: 'Growing your team? Add staff members.', action_url: '/staff', icon: 'group_add' },
    { day: 6, title: '📊 Explore Your Reports', message: 'View comprehensive business analytics.', action_url: '/reports', icon: 'assessment' }
  ];

  for (const step of onboardingSteps) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + step.day);

    await createNotification(env, {
      shop_id,
      user_id: null,
      type: 'system',
      title: step.title,
      message: step.message,
      action_url: step.action_url,
      icon: step.icon,
      scheduled_for: scheduledDate.toISOString()
    });
  }
}

export async function createDailyReportNotification(env, { shop_id, reportData }) {
  return createNotification(env, {
    shop_id,
    user_id: null,
    type: 'daily_report',
    title: 'Daily Report Available',
    message: `Today's sales: ৳${reportData.total_sales.toLocaleString()}. Net profit: ৳${reportData.net_profit.toLocaleString()}.`,
    action_url: '/reports',
    icon: 'assessment',
    data: reportData
  });
}
