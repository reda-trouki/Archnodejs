import path from 'path';
import { writeFile } from '../../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../../utils/file';

export const generateInversifyContainer = async (projectPath: string, entityName: string): Promise<void> => {
  const pascal = toPascalCase(entityName);
  const kebab = toKebabCase(entityName);
  const camel = toCamelCase(entityName);

  // TYPES token registry
  await writeFile(
    path.join(projectPath, 'src', 'container', 'types.ts'),
    `/**
 * Inversify symbol tokens for dependency injection.
 * Add one entry per injectable dependency.
 */
export const TYPES = {
  // Repositories
  ${pascal}Repository: Symbol.for('${pascal}Repository'),

  // Use Cases
  Create${pascal}UseCase: Symbol.for('Create${pascal}UseCase'),
  Update${pascal}UseCase: Symbol.for('Update${pascal}UseCase'),
  Delete${pascal}UseCase: Symbol.for('Delete${pascal}UseCase'),

  // Controllers
  ${pascal}Controller: Symbol.for('${pascal}Controller'),
} as const;
`
  );

  // Container setup
  await writeFile(
    path.join(projectPath, 'src', 'container', '${camel}Container.ts'.replace('${camel}', camel)),
    `import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';

// Domain
import { I${pascal}Repository } from '../domain/${kebab}/repositories/I${pascal}Repository';

// Infrastructure
import { ${pascal}Repository } from '../infrastructure/repositories/${pascal}Repository';

// Use Cases
import { Create${pascal}UseCase } from '../application/${kebab}/use-cases/Create${pascal}UseCase';
import { Update${pascal}UseCase } from '../application/${kebab}/use-cases/Update${pascal}UseCase';
import { Delete${pascal}UseCase } from '../application/${kebab}/use-cases/Delete${pascal}UseCase';

// Presentation
import { ${pascal}Controller } from '../presentation/http/controllers/${pascal}Controller';

const container = new Container({ defaultScope: 'Singleton' });

// ── Repositories ───────────────────────────────────────────────
container
  .bind<I${pascal}Repository>(TYPES.${pascal}Repository)
  .to(${pascal}Repository);

// ── Use Cases ──────────────────────────────────────────────────
container
  .bind<Create${pascal}UseCase>(TYPES.Create${pascal}UseCase)
  .toDynamicValue(ctx => new Create${pascal}UseCase(
    ctx.container.get<I${pascal}Repository>(TYPES.${pascal}Repository)
  ));

container
  .bind<Update${pascal}UseCase>(TYPES.Update${pascal}UseCase)
  .toDynamicValue(ctx => new Update${pascal}UseCase(
    ctx.container.get<I${pascal}Repository>(TYPES.${pascal}Repository)
  ));

container
  .bind<Delete${pascal}UseCase>(TYPES.Delete${pascal}UseCase)
  .toDynamicValue(ctx => new Delete${pascal}UseCase(
    ctx.container.get<I${pascal}Repository>(TYPES.${pascal}Repository)
  ));

// ── Controllers ────────────────────────────────────────────────
container
  .bind<${pascal}Controller>(TYPES.${pascal}Controller)
  .toDynamicValue(ctx => new ${pascal}Controller(
    ctx.container.get<Create${pascal}UseCase>(TYPES.Create${pascal}UseCase),
    ctx.container.get<Update${pascal}UseCase>(TYPES.Update${pascal}UseCase),
    ctx.container.get<Delete${pascal}UseCase>(TYPES.Delete${pascal}UseCase),
  ));

export { container };
`
  );
};
