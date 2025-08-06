import { PrismaClient, UserRole, Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface DefaultUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface DefaultTag {
  name: string;
  slug: string;
  description: string;
  color: string;
}

const DEFAULT_ADMIN: DefaultUser = {
  email: 'leandro@ng-corner.com',
  password: 'Angular123@',
  firstName: 'Leandro',
  lastName: 'Admin',
  role: 'ADMIN'
};

const DEFAULT_TAGS: DefaultTag[] = [
  { 
    name: 'Angular', 
    slug: 'angular', 
    description: 'Angular framework and ecosystem', 
    color: '#dd0031' 
  },
  { 
    name: 'TypeScript', 
    slug: 'typescript', 
    description: 'TypeScript language and tooling', 
    color: '#3178c6' 
  },
  { 
    name: 'JavaScript', 
    slug: 'javascript', 
    description: 'JavaScript language and ecosystem', 
    color: '#f7df1e' 
  },
  { 
    name: 'Web Development', 
    slug: 'web-development', 
    description: 'General web development topics', 
    color: '#61dafb' 
  },
  { 
    name: 'Tutorial', 
    slug: 'tutorial', 
    description: 'Step-by-step tutorials and guides', 
    color: '#4caf50' 
  },
  { 
    name: 'Best Practices', 
    slug: 'best-practices', 
    description: 'Development best practices and patterns', 
    color: '#ff9800' 
  }
];

async function createAdminUser(): Promise<void> {
  console.log('👤 Checking for admin user...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: DEFAULT_ADMIN.email
    }
  });

  if (existingAdmin) {
    console.log(`✅ Admin user already exists: ${DEFAULT_ADMIN.email}`);
    console.log(`   Role: ${existingAdmin.role}`);
    console.log(`   Verified: ${existingAdmin.emailVerified}`);
    return;
  }

  // Create default admin user
  console.log('🔐 Hashing password...');
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN.email,
      passwordHash: hashedPassword,
      firstName: DEFAULT_ADMIN.firstName,
      lastName: DEFAULT_ADMIN.lastName,
      emailVerified: true,
      provider: Provider.LOCAL,
      role: DEFAULT_ADMIN.role,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('✅ Default admin user created successfully:');
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
}

async function createDefaultTags(): Promise<void> {
  console.log('🏷️  Checking for default tags...');

  let createdCount = 0;
  let existingCount = 0;

  for (const tagData of DEFAULT_TAGS) {
    const existingTag = await prisma.tag.findUnique({
      where: { slug: tagData.slug }
    });

    if (!existingTag) {
      const tag = await prisma.tag.create({
        data: {
          ...tagData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`   ✅ Created tag: ${tag.name} (${tag.color})`);
      createdCount++;
    } else {
      console.log(`   ℹ️  Tag already exists: ${tagData.name}`);
      existingCount++;
    }
  }

  console.log(`📊 Tags summary: ${createdCount} created, ${existingCount} existing`);
}

async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? '[URL provided]' : '[No URL - using default]'}\n`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('🔌 Database connection successful\n');

    // Create admin user
    await createAdminUser();
    console.log('');

    // Create default tags  
    await createDefaultTags();
    console.log('');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log(`   1. Login at your app with: ${DEFAULT_ADMIN.email}`);
    console.log(`   2. Change the default password after first login`);
    console.log(`   3. Start creating blog posts!`);

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Execute seeding
seedDatabase()
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('\n🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  });