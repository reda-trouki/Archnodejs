import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';
import { generateDomain } from './domain';
import { generateUseCase } from './usecase';
import { generateRepository } from './repository';
import { generateController } from './controller';

export const generateModule = async (name: string, basePath: string): Promise<void> => {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const kebab = toKebabCase(name);

  // Domain layer
  await generateDomain(name, basePath);

  // Application layer — generate common CRUD use cases
  await generateUseCase(`Create${pascal}`, basePath);
  await generateUseCase(`Update${pascal}`, basePath);
  await generateUseCase(`Delete${pascal}`, basePath);
  await generateUseCase(`Get${pascal}`, basePath);

  // Infrastructure layer
  await generateRepository(name, basePath);

  // Presentation layer
  await generateController(name, basePath);

  // DI Container entry
  await writeFile(
    path.join(basePath, 'src', 'container', `${camel}Container.ts`),
    `import { ${pascal}Repository } from '../infrastructure/repositories/${pascal}Repository';
import { Create${pascal}UseCase } from '../application/${kebab}/use-cases/Create${pascal}UseCase';
import { Update${pascal}UseCase } from '../application/${kebab}/use-cases/Update${pascal}UseCase';
import { Delete${pascal}UseCase } from '../application/${kebab}/use-cases/Delete${pascal}UseCase';
import { ${pascal}Controller } from '../presentation/http/controllers/${pascal}Controller';

/**
 * Wires up all dependencies for the ${pascal} module.
 * Replace with InversifyJS, Tsyringe, or NestJS providers as needed.
 */
export const build${pascal}Container = () => {
  const ${camel}Repository = new ${pascal}Repository();

  const create${pascal}UseCase = new Create${pascal}UseCase(${camel}Repository);
  const update${pascal}UseCase = new Update${pascal}UseCase(${camel}Repository);
  const delete${pascal}UseCase = new Delete${pascal}UseCase(${camel}Repository);

  const ${camel}Controller = new ${pascal}Controller(
    create${pascal}UseCase,
    update${pascal}UseCase,
    delete${pascal}UseCase
  );

  return { ${camel}Controller };
};
`
  );
};
