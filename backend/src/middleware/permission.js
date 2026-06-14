export const checkPermission = (action) => {
  const STAFF_RESTRICTIONS = {
    'delete_customer': true,
    'view_reports': false,
    'view_profits': true,
    'manage_vendors': true,
    'manage_staff': true,
    'manage_shop_settings': true,
    'delete_product': true,
    'delete_transaction': true,
    'delete_expense': true,
    'edit_product_price': false
  };

  return async (c, next) => {
    const user = c.get('user');
    const userRole = user?.role;

    if (userRole === 'Owner' || userRole === 'owner') {
      return next();
    }

    if ((userRole === 'Staff' || userRole === 'staff') && STAFF_RESTRICTIONS[action]) {
      return c.json({
        message: 'Permission denied',
        detail: `Staff members cannot ${action.replace('_', ' ')}`
      }, 403);
    }

    await next();
  };
};
