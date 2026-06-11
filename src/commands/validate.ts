import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger';
import { runValidation, ValidationReport } from '../validators/index';
import { CircularDependency } from '../validators/circularDeps';

const shortPath = (filePath: string, base: string): string => {
  return filePath.replace(base + path.sep, '').replace(base + '/', '');
};

const printSection = (title: string, icon: string, color: chalk.Chalk) => {
  console.log();
  console.log(color.bold(`${icon} ${title}`));
  console.log(color('─'.repeat(60)));
};

const printReport = (report: ValidationReport) => {
  const base = path.join(report.projectPath, 'src');
  const short = (f: string) => shortPath(f, base);

  // ── Layer Violations ──────────────────────────────────────────
  if (report.layerViolations.length > 0) {
    printSection('Layer Dependency Violations', '🔴', chalk.red);
    for (const v of report.layerViolations) {
      console.log();
      console.log(chalk.red('  ✖ ') + chalk.bold(`[${v.layer}] → [${v.importedLayer}]`));
      console.log(chalk.dim('    File    : ') + chalk.yellow(short(v.file)));
      console.log(chalk.dim('    Import  : ') + chalk.cyan(v.importPath));
      console.log(chalk.dim('    Rule    : ') + chalk.white(v.rule));
    }
  }

  // ── Circular Dependencies ─────────────────────────────────────
  if (report.circularDependencies.length > 0) {
    printSection('Circular Dependencies', '🔴', chalk.red);
    for (const c of report.circularDependencies as CircularDependency[]) {
      console.log();
      console.log(chalk.red('  ✖ Circular import chain detected:'));
      const arrow = chalk.dim(' → ');
      const chain = c.cycle.map(f => chalk.yellow(short(f))).join(arrow);
      console.log('    ' + chain);
    }
  }

  // ── Domain Leakage ────────────────────────────────────────────
  if (report.domainLeakageViolations.length > 0) {
    printSection('Domain Leakage Violations', '🔴', chalk.red);
    for (const v of report.domainLeakageViolations) {
      const icon = v.severity === 'error' ? chalk.red('  ✖') : chalk.yellow('  ⚠');
      console.log();
      console.log(icon + ' ' + chalk.bold(v.message));
      console.log(chalk.dim('    File    : ') + chalk.yellow(short(v.file)));
      console.log(chalk.dim('    Fix     : ') + chalk.white(v.detail));
    }
  }

  // ── SOLID Violations ──────────────────────────────────────────
  if (report.solidViolations.length > 0) {
    printSection('SOLID Principle Violations', '⚠️ ', chalk.yellow);

    const grouped = report.solidViolations.reduce(
      (acc, v) => {
        if (!acc[v.principle]) acc[v.principle] = [];
        acc[v.principle].push(v);
        return acc;
      },
      {} as Record<string, typeof report.solidViolations>
    );

    for (const [principle, violations] of Object.entries(grouped)) {
      console.log();
      console.log(chalk.yellow.bold(`  [${principle}] ${violations[0].principleLabel}`));
      for (const v of violations) {
        const icon = v.severity === 'error' ? chalk.red('    ✖') : chalk.yellow('    ⚠');
        console.log(icon + ' ' + chalk.white(v.message));
        console.log(chalk.dim('      File   : ') + chalk.yellow(short(v.file)));
        console.log(chalk.dim('      Detail : ') + chalk.dim(v.detail));
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.bold('  Validation Summary'));
  console.log(chalk.bold('─'.repeat(60)));
  console.log(
    chalk.dim('  Files scanned  : ') + chalk.white(report.scannedFiles)
  );
  console.log(
    chalk.dim('  Duration       : ') + chalk.white(`${report.duration}ms`)
  );
  console.log(
    chalk.dim('  Checks passed  : ') +
      (report.summary.passed === report.summary.total
        ? chalk.green(`${report.summary.passed}/${report.summary.total}`)
        : chalk.yellow(`${report.summary.passed}/${report.summary.total}`))
  );
  console.log(
    chalk.dim('  Errors         : ') +
      (report.summary.errors > 0
        ? chalk.red.bold(String(report.summary.errors))
        : chalk.green('0'))
  );
  console.log(
    chalk.dim('  Warnings       : ') +
      (report.summary.warnings > 0
        ? chalk.yellow.bold(String(report.summary.warnings))
        : chalk.green('0'))
  );
  console.log(chalk.bold('─'.repeat(60)));

  if (report.summary.errors === 0 && report.summary.warnings === 0) {
    console.log();
    console.log(chalk.green.bold('  ✔ Architecture is clean. No violations found.'));
  } else if (report.summary.errors > 0) {
    console.log();
    console.log(chalk.red.bold(`  ✖ ${report.summary.errors} error(s) must be fixed.`));
  } else {
    console.log();
    console.log(chalk.yellow.bold(`  ⚠ ${report.summary.warnings} warning(s) to review.`));
  }
  console.log();
};

export const validateCommand = new Command('validate')
  .description('Validate project architecture against Clean Architecture, SOLID, and DDD rules')
  .option('--path <path>', 'Path to project root', process.cwd())
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const projectPath = path.resolve(options.path);

    logger.title('ArchGen — Architecture Validator');
    logger.dim(`  Project: ${projectPath}`);
    logger.blank();

    const spinner = ora({ text: 'Scanning project files...', color: 'cyan' }).start();

    try {
      const report = await runValidation(projectPath);
      spinner.succeed(`Scanned ${report.scannedFiles} TypeScript files in ${report.duration}ms`);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      printReport(report);

      // Exit with error code if there are errors (useful for CI)
      if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Validation failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
