import { z } from "zod";

export const securePasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include one uppercase letter")
  .regex(/[a-z]/, "Password must include one lowercase letter")
  .regex(/[0-9]/, "Password must include one number")
  .regex(/[^A-Za-z0-9]/, "Password must include one special character");

export const registerFormSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    password: securePasswordSchema,
    confirmPassword: z.string(),
    isCoder: z.boolean(),
    isBusiness: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginFormSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    userId: z.string().uuid("Invalid user id"),
    newPassword: securePasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const businessQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  price: z.number().nonnegative("Price must be positive"),
  stock: z.number().int().nonnegative("Stock must be positive"),
  category: z.string().trim().min(1, "Category is required"),
  siteId: z.string().uuid("Site id must be a valid UUID"),
});

export const inventorySchema = z.object({
  productId: z.string().uuid("Product id must be a valid UUID"),
  siteId: z.string().uuid("Site id must be a valid UUID"),
  quantity: z.number().int().nonnegative("Quantity must be positive"),
  minQuantity: z
    .number()
    .int()
    .nonnegative("Minimum quantity must be positive"),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  businessId: z.string().uuid("Business id must be a valid UUID"),
});

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(7, "Phone is too short"),
  role: z.string().trim().min(1, "Role is required"),
  businessId: z.string().uuid("Business id must be a valid UUID"),
  departmentId: z
    .string()
    .uuid("Department id must be a valid UUID")
    .optional(),
});
