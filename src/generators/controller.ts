import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';

export const generateController = async (name: string, basePath: string): Promise<void> => {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const kebab = toKebabCase(name);

  // Controller
  await writeFile(
    path.join(basePath, 'src', 'presentation', 'http', 'controllers', `${pascal}Controller.ts`),
    `import { Request, Response, NextFunction } from 'express';
import { Create${pascal}UseCase } from '../../../application/${kebab}/use-cases/Create${pascal}UseCase';
import { Update${pascal}UseCase } from '../../../application/${kebab}/use-cases/Update${pascal}UseCase';
import { Delete${pascal}UseCase } from '../../../application/${kebab}/use-cases/Delete${pascal}UseCase';

export class ${pascal}Controller {
  constructor(
    private readonly create${pascal}UseCase: Create${pascal}UseCase,
    private readonly update${pascal}UseCase: Update${pascal}UseCase,
    private readonly delete${pascal}UseCase: Delete${pascal}UseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.create${pascal}UseCase.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.update${pascal}UseCase.execute({
        id: req.params.id,
        ...req.body,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.delete${pascal}UseCase.execute({ id: req.params.id });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Wire GetById use case here
      res.status(200).json({ id: req.params.id });
    } catch (error) {
      next(error);
    }
  }

  async findAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Wire List use case here
      res.status(200).json([]);
    } catch (error) {
      next(error);
    }
  }
}
`
  );

  // Route
  await writeFile(
    path.join(basePath, 'src', 'presentation', 'http', 'routes', `${camel}.routes.ts`),
    `import { Router } from 'express';
import { ${pascal}Controller } from '../controllers/${pascal}Controller';

export const ${camel}Router = (controller: ${pascal}Controller): Router => {
  const router = Router();

  router.post('/', controller.create.bind(controller));
  router.get('/', controller.findAll.bind(controller));
  router.get('/:id', controller.findOne.bind(controller));
  router.put('/:id', controller.update.bind(controller));
  router.delete('/:id', controller.remove.bind(controller));

  return router;
};
`
  );
};
