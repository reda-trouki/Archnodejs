import path from 'path';
import { writeFile } from '../../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../../utils/file';

export const generateTsyringeContainer = async (projectPath: string, entityName: string): Promise<void> => {
  const pascal = toPascalCase(entityName);
  const kebab = toKebabCase(entityName);
  const camel = toCamelCase(entityName);

  await writeFile(
    path.join(projectPath, 'src', 'container', `${camel}Container.ts`),
    `import 'reflect-metadata';
import { container, injectable, inject } from 'tsyringe';

import { I${pascal}Repository } from '@/domain/${kebab}/repositories/I${pascal}Repository';
import { ${pascal}Repository } from '@/infrastructure/repositories/${pascal}Repository';
import { Create${pascal}UseCase } from '@/application/${kebab}/use-cases/Create${pascal}UseCase';
import { Update${pascal}UseCase } from '@/application/${kebab}/use-cases/Update${pascal}UseCase';
import { Delete${pascal}UseCase } from '@/application/${kebab}/use-cases/Delete${pascal}UseCase';
import { ${pascal}Controller } from '@/presentation/http/controllers/${pascal}Controller';

// Register the concrete implementation against the interface token
container.register<I${pascal}Repository>('${pascal}Repository', {
  useClass: ${pascal}Repository,
});

// Tsyringe resolves constructor dependencies automatically
// when classes are decorated with @injectable() and @inject()

export const get${pascal}Controller = (): ${pascal}Controller => {
  const repo = container.resolve(${pascal}Repository);
  const createUC = new Create${pascal}UseCase(repo);
  const updateUC = new Update${pascal}UseCase(repo);
  const deleteUC = new Delete${pascal}UseCase(repo);
  return new ${pascal}Controller(createUC, updateUC, deleteUC);
};

export { container };
`
  );

  // Injectable decorator example for the repository
  await writeFile(
    path.join(projectPath, 'src', 'infrastructure', 'repositories', `Tsyringe${pascal}Repository.ts`),
    `import { injectable } from 'tsyringe';
import { ${pascal} } from '../../domain/${kebab}/entities/${pascal}';
import { I${pascal}Repository } from '../../domain/${kebab}/repositories/I${pascal}Repository';

@injectable()
export class ${pascal}Repository implements I${pascal}Repository {
  private store: Map<string, ${pascal}> = new Map();

  async findById(id: string): Promise<${pascal} | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<${pascal}[]> {
    return Array.from(this.store.values());
  }

  async save(entity: ${pascal}): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async update(entity: ${pascal}): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
`
  );
};
