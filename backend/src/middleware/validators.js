import { z } from 'zod';

const handleValidationErrors = (result, c) => {
  if (!result.success) {
    return c.json({
      message: 'Validation failed',
      errors: result.error.issues.map(iss => ({
        field: iss.path.join('.'),
        message: iss.message
      }))
    }, 400);
  }
  return null;
};

export const validate = (schema) => {
  return async (c, next) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const result = schema.safeParse(body);
    const err = handleValidationErrors(result, c);
    if (err) return err;
    c.set('validatedBody', result.data);
    await next();
  };
};

export const validateQuery = (schema) => {
  return async (c, next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);
    const err = handleValidationErrors(result, c);
    if (err) return err;
    c.set('validatedQuery', result.data);
    await next();
  };
};

// Validation schemas
export const schemas = {
  register: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    shopName: z.string().optional()
  }),

  login: z.object({
    email: z.string().min(1, 'Email or Username is required'),
    password: z.string().min(1, 'Password is required')
  }),

  createShop: z.object({
    name: z.string().trim().min(1, 'Shop name is required'),
    business_type: z.enum(['general', 'bike_sales', 'garage', 'furniture', 'showroom', 'pickup_rental'], {
      message: 'Invalid business type'
    }),
    phone: z.string().optional(),
    address: z.string().optional()
  }),

  createProduct: z.object({
    name: z.string().trim().min(1, 'Product name is required'),
    cost_price: z.number().min(0, 'Cost price must be a positive number').optional().default(0),
    selling_price: z.number().min(0, 'Selling price must be a positive number'),
    stock_quantity: z.number().int().min(0, 'Stock quantity must be non-negative').optional().default(0),
    unit: z.string().trim().optional(),
    category: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    engine_no: z.string().optional(),
    chassis_no: z.string().optional(),
    model_year: z.string().optional(),
    min_stock_level: z.number().int().optional(),
    material_cost: z.number().optional(),
    image_url: z.string().optional()
  }),

  createCustomer: z.object({
    name: z.string().trim().min(1, 'Customer name is required'),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional()
  }),

  createSale: z.object({
    items: z.array(z.object({
      product_id: z.number().int().min(1).optional(),
      service_id: z.number().int().min(1).optional(),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      unit_price: z.number().min(0, 'Unit price must be positive'),
      subtotal: z.number().min(0, 'Subtotal must be positive')
    })).min(1, 'At least one item is required'),
    paid_amount: z.number().min(0, 'Paid amount must be non-negative'),
    payment_method: z.enum(['cash', 'bkash', 'bank', 'due', 'card', 'mobile'], {
      message: 'Invalid payment method'
    }),
    customer_id: z.number().int().min(1).nullable().optional(),
    customer_name: z.string().optional(),
    discount: z.number().optional(),
    notes: z.string().optional(),
    due_date: z.string().optional()
  }),

  createExpense: z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    description: z.string().trim().min(1, 'Description is required'),
    payment_method: z.enum(['cash', 'bkash', 'bank', 'due', 'card', 'mobile'], {
      message: 'Invalid payment method'
    })
  }),

  receivePayment: z.object({
    customer_id: z.number().int().min(1, 'Valid customer ID is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    method: z.enum(['cash', 'bkash', 'bank', 'card', 'mobile'], {
      message: 'Invalid payment method'
    })
  })
};
