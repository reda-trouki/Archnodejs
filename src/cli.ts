#!/usr/bin/env node
import { Command } from 'commander';
import { banner } from './utils/logger';
import { createCommand } from './commands/create';
import { generateCommand } from './commands/generate';
import { validateCommand } from './commands/validate';
import { configCommand } from './commands/config';

const program = new Command();

banner();

program
  .name('archgen')
  .description('Enterprise Architecture Generator for Node.js — DDD, Clean Architecture, Hexagonal')
  .version('2.0.0');

program.addCommand(createCommand);
program.addCommand(generateCommand);
program.addCommand(validateCommand);
program.addCommand(configCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
