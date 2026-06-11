import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.cyan('ℹ'), chalk.white(msg)),
  success: (msg: string) => console.log(chalk.green('✔'), chalk.greenBright(msg)),
  error: (msg: string) => console.log(chalk.red('✖'), chalk.redBright(msg)),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), chalk.yellowBright(msg)),
  step: (msg: string) => console.log(chalk.magenta('→'), chalk.white(msg)),
  title: (msg: string) => console.log('\n' + chalk.bold.blueBright(msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  blank: () => console.log(),
};

export const banner = () => {
  console.log();
  console.log(chalk.bold.blueBright('  ╔═══════════════════════════════╗'));
  console.log(chalk.bold.blueBright('  ║') + chalk.bold.whiteBright('        ArchGen v2.0.0          ') + chalk.bold.blueBright('║'));
  console.log(chalk.bold.blueBright('  ║') + chalk.dim('  Enterprise Architecture CLI   ') + chalk.bold.blueBright('║'));
  console.log(chalk.bold.blueBright('  ╚═══════════════════════════════╝'));
  console.log();
};
