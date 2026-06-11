import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { loadConfigWithPath, writeConfig, ArchGenConfig } from '../utils/config';

export const configCommand = new Command('config')
  .description('Manage project configuration (.archgenrc.json)')
  .addCommand(
    new Command('show')
      .description('Show the active config for the current directory')
      .action(() => {
        const { config, configPath } = loadConfigWithPath(process.cwd());

        if (!configPath) {
          logger.warn('No .archgenrc.json found. Using defaults on every command.');
          logger.dim('  Run "archgen config init" to create one.');
          return;
        }

        logger.title('Active Configuration');
        logger.dim(`  File: ${configPath}`);
        logger.blank();

        const entries = Object.entries(config).filter(([, v]) => v !== undefined);
        if (entries.length === 0) {
          logger.warn('Config file is empty.');
        } else {
          for (const [key, value] of entries) {
            console.log(
              '  ' + chalk.dim(key.padEnd(14)) + chalk.cyanBright(value)
            );
          }
        }
        logger.blank();
      })
  )
  .addCommand(
    new Command('init')
      .description('Create a .archgenrc.json in the current directory')
      .option('--architecture <type>', 'Architecture pattern', 'ddd')
      .option('--framework <fw>',      'Web framework',        'express')
      .option('--database <db>',       'Database',             'postgres')
      .option('--orm <orm>',           'ORM',                  'prisma')
      .option('--di <di>',             'DI container',         'inversify')
      .action(async (opts) => {
        const targetDir = process.cwd();
        const config: ArchGenConfig = {
          architecture: opts.architecture,
          framework:    opts.framework,
          database:     opts.database,
          orm:          opts.orm,
          di:           opts.di,
        };

        await writeConfig(targetDir, config);

        logger.success(`.archgenrc.json created in ${targetDir}`);
        logger.blank();
        for (const [key, value] of Object.entries(config)) {
          console.log('  ' + chalk.dim(key.padEnd(14)) + chalk.cyanBright(value));
        }
        logger.blank();
        logger.info('From now on, "archgen generate module <Name>" needs no extra flags.');
        logger.blank();
      })
  )
  .addCommand(
    new Command('set')
      .description('Update a single key in .archgenrc.json')
      .argument('<key>',   'Config key (orm | di | framework | database | architecture)')
      .argument('<value>', 'New value')
      .action(async (key: string, value: string) => {
        const validKeys: (keyof ArchGenConfig)[] = [
          'orm', 'di', 'framework', 'database', 'architecture',
        ];

        if (!validKeys.includes(key as keyof ArchGenConfig)) {
          logger.error(`Unknown config key "${key}". Valid keys: ${validKeys.join(', ')}`);
          process.exit(1);
        }

        const { config, configPath } = loadConfigWithPath(process.cwd());

        if (!configPath) {
          logger.error('No .archgenrc.json found. Run "archgen config init" first.');
          process.exit(1);
        }

        const updated = { ...config, [key]: value };
        await writeConfig(path.dirname(configPath), updated);

        logger.success(`Updated ${chalk.cyanBright(key)} → ${chalk.white(value)}`);
        logger.dim(`  File: ${configPath}`);
        logger.blank();
      })
  );
