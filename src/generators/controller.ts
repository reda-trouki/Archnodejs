import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';

export const generateController = async (name: string, basePath: string): Promise<void> => {
  const pascal = toPascalCase(name);
  const camel  = toCamelCase(name);
  const kebab  = toKebabCase(name);

  // Controller
  await writeFile(
    path.join(basePath, 'src', 'presentation', 'http', 'controllers', `${pascal}Controller.ts`),
    `import { Request, Response, NextFunction } from 'express';
import { I${pascal}Controller } from '@/presentation/http/controllers/I${pascal}Controller';
import { ICreate${pascal}UseCase } from '@/application/${kebab}/use-cases/ICreate${pascal}UseCase';
import { IUpdate${pascal}UseCase } from '@/application/${kebab}/use-cases/IUpdate${pascal}UseCase';
import { IDelete${pascal}UseCase } from '@/application/${kebab}/use-cases/IDelete${pascal}UseCase';

export interface I${pascal}Controller {
  create(req: Request, res: Response, next: NextFunction): Promise<void>;
  update(req: Request, res: Response, next: NextFunction): Promise<void>;
  remove(req: Request, res: Response, next: NextFunction): Promise<void>;
  findOne(req: Request, res: Response, next: NextFunction): Promise<void>;
  findAll(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class ${pascal}Controller implements I${pascal}Controller {
  constructor(
    private readonly create${pascal}UseCase: ICreate${pascal}UseCase,
    private readonly update${pascal}UseCase: IUpdate${pascal}UseCase,
    private readonly delete${pascal}UseCase: IDelete${pascal}UseCase
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
      const result = await this.update${pascal}UseCase.execute({ id: req.params.id, ...req.body });
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
      res.status(200).json({ id: req.params.id });
    } catch (error) {
      next(error);
    }
  }

  async findAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
import { I${pascal}Controller } from '@/presentation/http/controllers/${pascal}Controller';

export const ${camel}Router = (controller: I${pascal}Controller): Router => {
  const router = Router();

  router.post('/',    controller.create.bind(controller));
  router.get('/',     controller.findAll.bind(controller));
  router.get('/:id',  controller.findOne.bind(controller));
  router.put('/:id',  controller.update.bind(controller));
  router.delete('/:id', controller.remove.bind(controller));

  return router;
};
`
  );
};
