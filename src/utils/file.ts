import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger';

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  logger.step(`Created ${chalk_path(filePath)}`);
};

export const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.ensureDir(dirPath);
};

export const pathExists = async (p: string): Promise<boolean> => {
  return fs.pathExists(p);
};

// Format path for display (relative, shorter)
const chalk_path = (filePath: string): string => {
  const cwd = process.cwd();
  return filePath.startsWith(cwd) ? filePath.replace(cwd + '/', '') : filePath;
};

export const toPascalCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
};
