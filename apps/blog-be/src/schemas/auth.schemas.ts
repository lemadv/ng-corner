import { z } from 'zod';

// Password validation regex - at least one uppercase, lowercase, number, and special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Common schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(PASSWORD_REGEX, 'Password must contain at least one uppercase letter, lowercase letter, number, and special character');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim()
  .optional();

export const tokenSchema = z
  .string()
  .min(1, 'Token is required')
  .max(255, 'Token is too long');

// User Registration Schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema
});

// User Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

// Email Verification Schema
export const verifyEmailSchema = z.object({
  token: tokenSchema
});

// Resend Verification Schema
export const resendVerificationSchema = z.object({
  email: emailSchema
});

// Password Reset Request Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

// Password Reset Schema
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema
});

// Change Password Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});

// Password Strength Check Schema
export const passwordStrengthSchema = z.object({
  password: z.string().min(1, 'Password is required')
});

// Refresh Token Schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional()
});

// Update Profile Schema
export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  profilePicture: z.string().url('Invalid URL').max(500, 'URL too long').optional()
});

// OAuth schemas (for future Google integration)
export const googleOAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional()
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});

export const searchQuerySchema = z.object({
  search: z.string().max(255).optional(),
  ...paginationSchema.shape
});

// Response schemas for type inference
export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profilePicture: z.string().nullable(),
  emailVerified: z.boolean(),
  provider: z.enum(['LOCAL', 'GOOGLE', 'GITHUB']),
  createdAt: z.date(),
  lastLogin: z.date().nullable()
});

export const loginResponseSchema = z.object({
  message: z.string(),
  user: userPublicSchema,
  accessToken: z.string(),
  expiresIn: z.number()
});

export const authErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  requirements: z.array(z.string()).optional(),
  action: z.string().optional()
});

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordStrengthInput = z.infer<typeof passwordStrengthSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type GoogleOAuthInput = z.infer<typeof googleOAuthSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;