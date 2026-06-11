import path from 'path';
import { writeFile } from '../../utils/file';

export const generateTypeOrmIntegration = async (projectPath: string, entityName: string): Promise<void> => {
  const pascal = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const lower = entityName.toLowerCase();

  // DataSource config
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'database', 'typeorm.datasource.ts'),
    `import { DataSource } from 'typeorm';
import { ${pascal}Schema } from '@/infrastructure/schemas/${pascal}Schema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [${pascal}Schema],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
});
`
  );

  // ORM Schema (separate from domain entity — no decorator pollution)
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'schemas', `${pascal}Schema.ts`),
    `import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * TypeORM schema class — kept separate from domain entity.
 * This is the Infrastructure concern; the domain entity stays pure.
 */
@Entity('${lower}s')
export class ${pascal}Schema {
  @PrimaryColumn('uuid')
  id!: string;

  // Add your columns here
  // @Column()
  // name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
`
  );

  // TypeORM repository
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'repositories', `TypeOrm${pascal}Repository.ts`),
    `import { DataSource, Repository } from 'typeorm';
import { ${pascal} } from '@/domain/${lower}/entities/${pascal}';
import { I${pascal}Repository } from '@/domain/${lower}/repositories/I${pascal}Repository';
import { ${pascal}Schema } from '@/infrastructure/schemas/${pascal}Schema';

export class TypeOrm${pascal}Repository implements I${pascal}Repository {
  private readonly repo: Repository<${pascal}Schema>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(${pascal}Schema);
  }

  async findById(id: string): Promise<${pascal} | null> {
    const record = await this.repo.findOneBy({ id });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<${pascal}[]> {
    const records = await this.repo.find();
    return records.map(this.toDomain);
  }

  async save(entity: ${pascal}): Promise<void> {
    await this.repo.save(this.toPersistence(entity));
  }

  async update(entity: ${pascal}): Promise<void> {
    await this.repo.save(this.toPersistence(entity));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(record: ${pascal}Schema): ${pascal} {
    return new ${pascal}(record.id);
  }

  private toPersistence(entity: ${pascal}): ${pascal}Schema {
    const schema = new ${pascal}Schema();
    schema.id = entity.id;
    return schema;
  }
}
`
  );
};
