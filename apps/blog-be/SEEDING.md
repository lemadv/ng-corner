# Database Seeding

This document explains how to seed the database with default data including a default admin user.

## Default Admin User

**Email:** `leandro@ng-corner.com`  
**Password:** `Angular123@`  
**Role:** `ADMIN`

## Seeding Commands

### Local Development
```bash
# Using npm script (recommended)
npm run db:seed

# Or directly with Prisma CLI
cd apps/blog-be
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog_db" npx prisma db seed
```

### Production/Staging
```bash
# Using npm script with environment variable
DATABASE_URL="your-production-database-url" npm run db:seed:prod

# Or directly with Prisma CLI
cd apps/blog-be
DATABASE_URL="your-production-database-url" npx prisma db seed
```

## What Gets Created

The seed script creates:

1. **Default Admin User** (if not exists)
   - Email: leandro@ng-corner.com
   - Password: Angular123@
   - Role: ADMIN
   - Email verified: true

2. **Default Tags** (if not exists)
   - Angular
   - TypeScript
   - JavaScript
   - Web Development
   - Tutorial
   - Best Practices

## Environment-Specific Behavior

- The script is **idempotent** - it won't create duplicates if run multiple times
- It checks for existing data before creating new records
- Safe to run in any environment (development, staging, production)

## Security Notes

- The default password should be changed immediately after first login in production
- The script uses bcrypt with cost factor 12 for password hashing
- Email verification is set to true for the admin user

## Troubleshooting

If you encounter issues:

1. **Database connection errors**: Verify your `DATABASE_URL` is correct
2. **Permission errors**: Ensure the database user has INSERT permissions
3. **Existing data conflicts**: The script handles existing data gracefully

## Manual Login Test

After seeding, you can test the admin login at:
- Development: http://localhost:4200/login
- Production: https://your-domain.com/login

Use the credentials above to access the admin dashboard.