import path from 'path';
import { writeFile } from '../../utils/file';

export const generatePrismaIntegration = async (projectPath: string, entityName: string): Promise<void> => {
  const pascal = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const lower = entityName.toLowerCase();

  // prisma/schema.prisma
  await writeFile(
    path.join(projectPath, 'prisma', 'schema.prisma'),
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ${pascal} {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Add your fields here
  // name String

  @@map("${lower}s")
}
`
  );

  // Prisma client singleton
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'database', 'prisma.client.ts'),
    `import { PrismaClient } from '@prisma/client';

// Singleton — reuse the same client across the app
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
`
  );

  // Prisma-backed repository implementation
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'repositories', `Prisma${pascal}Repository.ts`),
    `import { prisma } from '@/infrastructure/database/prisma.client';
import { ${pascal} } from '@/domain/${lower}/entities/${pascal}';
import { I${pascal}Repository } from '@/domain/${lower}/repositories/I${pascal}Repository';

export class Prisma${pascal}Repository implements I${pascal}Repository {
  async findById(id: string): Promise<${pascal} | null> {
    const record = await prisma.${lower}.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(): Promise<${pascal}[]> {
    const records = await prisma.${lower}.findMany();
    return records.map(this.toDomain);
  }

  async save(entity: ${pascal}): Promise<void> {
    await prisma.${lower}.create({
      data: {
        id: entity.id,
        // Map domain properties to Prisma fields here
      },
    });
  }

  async update(entity: ${pascal}): Promise<void> {
    await prisma.${lower}.update({
      where: { id: entity.id },
      data: {
        // Map domain properties to Prisma fields here
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.${lower}.delete({ where: { id } });
  }

  // ── Mapper ──────────────────────────────────────────────────
  private toDomain(record: any): ${pascal} {
    // Map Prisma record to domain entity
    return new ${pascal}(record.id);
  }
}
`
  );
};
