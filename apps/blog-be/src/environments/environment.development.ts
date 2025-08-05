export const environment = {
  production: false,
  port: process.env.PORT || 3333,
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://blog_user:blog_password@localhost:5432/blog_db'
};