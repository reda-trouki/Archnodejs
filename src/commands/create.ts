import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import { logger } from '../utils/logger';
import { generateProject } from '../generators/project';
import { pathExists } from '../utils/file';
import { writeConfig } from '../utils/config';

export const createCommand = new Command('create')
  .description('Scaffold a new application with enterprise architecture')
  .argument('<name>', 'Project name')
  .option('--architecture <type>', 'Architecture pattern: ddd | clean | hexagonal | cqrs')
  .option('--framework <fw>',      'Web framework: express | fastify | nestjs')
  .option('--database <db>',       'Database: postgres | mysql | mongodb')
  .option('--orm <orm>',           'ORM: prisma | typeorm | drizzle | mongoose')
  .option('--di <di>',             'DI container: inversify | tsyringe')
  .action(async (name: string, opts) => {
    const targetPath = process.cwd();
    const projectPath = path.join(targetPath, name);

    // Apply defaults for anything not explicitly passed
    const options = {
      architecture: opts.architecture ?? 'ddd',
      framework:    opts.framework    ?? 'express',
      database:     opts.database     ?? 'postgres',
      orm:          opts.orm          ?? 'prisma',
      di:           opts.di           ?? 'inversify',
    };

    logger.title(`Creating project: ${name}`);
    logger.dim(`  Architecture : ${options.architecture}`);
    logger.dim(`  Framework    : ${options.framework}`);
    logger.dim(`  Database     : ${options.database}`);
    logger.dim(`  ORM          : ${options.orm}`);
    logger.dim(`  DI           : ${options.di}`);
    logger.blank();

    if (await pathExists(projectPath)) {
      logger.error(`Directory "${name}" already exists.`);
      process.exit(1);
    }

    const spinner = ora({ text: 'Generating project structure...', color: 'blue' }).start();

    try {
      await generateProject(name, targetPath, options);

      // Write .archgenrc.json so future `generate` commands pick up these settings
      await writeConfig(projectPath, {
        architecture: options.architecture,
        framework:    options.framework,
        database:     options.database,
        orm:          options.orm,
        di:           options.di,
      });

      spinner.succeed('Project structure generated');
      logger.blank();
      logger.success(`Project "${name}" created successfully!`);
      logger.blank();
      logger.info('Next steps:');
      logger.step(`cd ${name}`);
      logger.step('npm install');
      logger.step('cp .env.example .env');
      logger.step('npm run dev');
      logger.blank();
      logger.dim(`  Config saved to ${name}/.archgenrc.json`);
      logger.dim(`  Run "archgen generate module <Name>" — no flags needed.`);
      logger.blank();
    } catch (error) {
      spinner.fail('Failed to generate project');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
