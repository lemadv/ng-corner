export const environment = {
  production: true,
  port: process.env.PORT || 3333,
  jwtSecret: process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  databaseUrl: process.env.DATABASE_URL!
};