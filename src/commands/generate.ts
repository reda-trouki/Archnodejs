import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger';
import { loadConfigWithPath } from '../utils/config';
import { generateDomain } from '../generators/domain';
import { generateUseCase } from '../generators/usecase';
import { generateRepository } from '../generators/repository';
import { generateController } from '../generators/controller';
import { generateModule } from '../generators/module';
import { generatePrismaIntegration } from '../generators/orm/prisma';
import { generateTypeOrmIntegration } from '../generators/orm/typeorm';
import { generateDrizzleIntegration } from '../generators/orm/drizzle';
import { generateInversifyContainer } from '../generators/di/inversify';
import { generateTsyringeContainer } from '../generators/di/tsyringe';
import { generateExpressTemplate } from '../generators/templates/express';
import { generateFastifyTemplate } from '../generators/templates/fastify';

type GeneratorType = 'domain' | 'usecase' | 'repository' | 'controller' | 'module';

// Generators that produce a single focused artifact — no ORM/DI/framework extras
const FOCUSED_TYPES = new Set<GeneratorType>(['domain', 'usecase', 'repository', 'controller']);

const GENERATORS: Record<
  GeneratorType,
  { fn: (name: string, basePath: string) => Promise<void>; label: string }
> = {
  domain:     { fn: generateDomain,     label: 'domain' },
  usecase:    { fn: generateUseCase,    label: 'use case' },
  repository: { fn: generateRepository, label: 'repository' },
  controller: { fn: generateController, label: 'controller' },
  module:     { fn: generateModule,     label: 'module' },
};

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate architecture artifacts')
  .argument('<type>', 'Type: domain | usecase | repository | controller | module')
  .argument('<name>', 'Name of the artifact (PascalCase recommended)')
  .option('--orm <orm>',       'ORM integration: prisma | typeorm | drizzle  [module only, or explicit]')
  .option('--di <di>',         'DI container: inversify | tsyringe           [module only, or explicit]')
  .option('--framework <fw>',  'Framework template: express | fastify         [module only, or explicit]')
  .option('--no-orm',          'Skip ORM generation even if set in config')
  .option('--no-di',           'Skip DI generation even if set in config')
  .option('--no-framework',    'Skip framework template even if set in config')
  .action(async (type: string, name: string, opts) => {
    const generator = GENERATORS[type as GeneratorType];

    if (!generator) {
      logger.error(`Unknown generator type: "${type}"`);
      logger.info(`Available types: ${Object.keys(GENERATORS).join(', ')}`);
      process.exit(1);
    }

    const basePath = process.cwd();
    const { config, configPath } = loadConfigWithPath(basePath);
    const isFocused = FOCUSED_TYPES.has(type as GeneratorType);

    // For focused types (domain/usecase/repository/controller):
    //   ORM/DI/framework only run when EXPLICITLY passed as a CLI flag.
    //   Config file values are ignored for extras — these generators produce one thing.
    //
    // For module:
    //   ORM/DI/framework run from config OR CLI flag, unless --no-* is passed.

    const resolveExtra = (flagValue: string | false | undefined, configValue: string | undefined): string | null => {
      if (flagValue === false) return null;                     // --no-xxx
      if (flagValue) return flagValue;                          // explicit CLI flag
      if (isFocused) return null;                               // focused type: skip unless explicit
      return configValue ?? null;                               // module: use config
    };

    const orm       = resolveExtra(opts.orm,       config.orm);
    const di        = resolveExtra(opts.di,        config.di);
    const framework = resolveExtra(opts.framework, config.framework);

    logger.title(`Generating ${generator.label}: ${name}`);

    if (configPath) {
      logger.dim(`  Config : ${configPath.replace(basePath + '/', '').replace(basePath + '\\', '')}`);
    }
    if (orm)       logger.dim(`  ORM       : ${orm}`);
    if (di)        logger.dim(`  DI        : ${di}`);
    if (framework) logger.dim(`  Framework : ${framework}`);
    logger.blank();

    const spinner = ora({ text: `Creating ${generator.label} files...`, color: 'magenta' }).start();

    try {
      await generator.fn(name, basePath);

      if (orm) {
        spinner.text = `Adding ${orm} ORM integration...`;
        if (orm === 'prisma')  await generatePrismaIntegration(basePath, name);
        if (orm === 'typeorm') await generateTypeOrmIntegration(basePath, name);
        if (orm === 'drizzle') await generateDrizzleIntegration(basePath, name);
      }

      if (di) {
        spinner.text = `Adding ${di} DI container...`;
        if (di === 'inversify') await generateInversifyContainer(basePath, name);
        if (di === 'tsyringe')  await generateTsyringeContainer(basePath, name);
      }

      if (framework) {
        spinner.text = `Adding ${framework} template...`;
        if (framework === 'express') await generateExpressTemplate(basePath);
        if (framework === 'fastify') await generateFastifyTemplate(basePath);
      }

      spinner.succeed(`${generator.label} "${name}" generated`);
      logger.blank();
      logger.success(`Done! ${name} ${generator.label} is ready.`);
      logger.blank();
    } catch (error) {
      spinner.fail(`Failed to generate ${generator.label}`);
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
