import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with dummy members...');

  const dummyUsers = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Alice Smith',
      email: 'alice@example.com',
      role: 'employee',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'employee',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      role: 'manager',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    },
  ];

  for (const user of dummyUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl,
      },
      create: user,
    });
    console.log(`Upserted user: ${user.name} (${user.email})`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
