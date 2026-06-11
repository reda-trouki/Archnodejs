import fs from 'fs-extra';
import path from 'path';

export interface ArchGenConfig {
  architecture?: string;
  framework?:    string;
  database?:     string;
  orm?:          string;
  di?:           string;
}

const CONFIG_FILE = '.archgenrc.json';

/**
 * Walk up from startDir looking for .archgenrc.json.
 * Returns the config and the directory it was found in, or null.
 */
const findConfigFile = (startDir: string): { configPath: string; config: ArchGenConfig } | null => {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, CONFIG_FILE);
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8');
        return { configPath: candidate, config: JSON.parse(raw) as ArchGenConfig };
      } catch {
        return null; // malformed JSON — treat as missing
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
};

/** Load config from cwd upward. Returns empty object if none found. */
export const loadConfig = (cwd = process.cwd()): ArchGenConfig => {
  const result = findConfigFile(cwd);
  return result?.config ?? {};
};

/** Load config and also return where it came from (for display). */
export const loadConfigWithPath = (
  cwd = process.cwd()
): { config: ArchGenConfig; configPath: string | null } => {
  const result = findConfigFile(cwd);
  return { config: result?.config ?? {}, configPath: result?.configPath ?? null };
};

/** Write .archgenrc.json into targetDir. */
export const writeConfig = async (targetDir: string, config: ArchGenConfig): Promise<void> => {
  const configPath = path.join(targetDir, CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
};

/**
 * Merge: CLI flags win over config file, config file wins over hardcoded defaults.
 * A flag is "set" only when the user actually passed it (not when commander filled in a default).
 */
export const mergeOptions = (
  cliFlags: Partial<ArchGenConfig>,
  config: ArchGenConfig,
  defaults: ArchGenConfig = {}
): ArchGenConfig => {
  return {
    architecture: cliFlags.architecture ?? config.architecture ?? defaults.architecture,
    framework:    cliFlags.framework    ?? config.framework    ?? defaults.framework,
    database:     cliFlags.database     ?? config.database     ?? defaults.database,
    orm:          cliFlags.orm          ?? config.orm          ?? defaults.orm,
    di:           cliFlags.di           ?? config.di           ?? defaults.di,
  };
};
