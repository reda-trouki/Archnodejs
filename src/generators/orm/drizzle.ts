import path from 'path';
import { writeFile } from '../../utils/file';

export const generateDrizzleIntegration = async (projectPath: string, entityName: string): Promise<void> => {
  const pascal = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const lower = entityName.toLowerCase();
  const camel = lower.charAt(0).toLowerCase() + lower.slice(1);

  // Drizzle schema
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'database', 'schema.ts'),
    `import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';

export const ${camel}s = pgTable('${lower}s', {
  id:        uuid('id').primaryKey().defaultRandom(),
  // Add your columns here:
  // name:   text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ${pascal}Record = typeof ${camel}s.$inferSelect;
export type New${pascal}Record = typeof ${camel}s.$inferInsert;
`
  );

  // Drizzle client
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'database', 'drizzle.client.ts'),
    `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type DrizzleDB = typeof db;
`
  );

  // Drizzle repository
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'repositories', `Drizzle${pascal}Repository.ts`),
    `import { eq } from 'drizzle-orm';
import { db } from '@/infrastructure/database/drizzle.client';
import { ${camel}s } from '@/infrastructure/database/schema';
import { ${pascal} } from '@/domain/${lower}/entities/${pascal}';
import { I${pascal}Repository } from '@/domain/${lower}/repositories/I${pascal}Repository';

export class Drizzle${pascal}Repository implements I${pascal}Repository {
  async findById(id: string): Promise<${pascal} | null> {
    const [record] = await db.select().from(${camel}s).where(eq(${camel}s.id, id)).limit(1);
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<${pascal}[]> {
    const records = await db.select().from(${camel}s);
    return records.map(this.toDomain);
  }

  async save(entity: ${pascal}): Promise<void> {
    await db.insert(${camel}s).values({
      id: entity.id,
      // Map domain properties here
    });
  }

  async update(entity: ${pascal}): Promise<void> {
    await db.update(${camel}s)
      .set({ updatedAt: new Date() })
      .where(eq(${camel}s.id, entity.id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(${camel}s).where(eq(${camel}s.id, id));
  }

  private toDomain(record: any): ${pascal} {
    return new ${pascal}(record.id);
  }
}
`
  );
};
