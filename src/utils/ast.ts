import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface FileImport {
  from: string;       // absolute path of the file
  importPath: string; // raw import string e.g. '../../infrastructure/db'
  resolvedLayer: string | null;
}

export interface ParsedFile {
  filePath: string;
  layer: string | null;
  imports: FileImport[];
  classes: string[];
  interfaces: string[];
  methods: string[];
  lines: number;
}

// Map a file path to its architectural layer
export const detectLayer = (filePath: string): string | null => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/domain/'))         return 'domain';
  if (normalized.includes('/application/'))    return 'application';
  if (normalized.includes('/infrastructure/')) return 'infrastructure';
  if (normalized.includes('/presentation/'))   return 'presentation';
  if (normalized.includes('/shared/'))         return 'shared';
  if (normalized.includes('/container/'))      return 'container';
  return null;
};

// Resolve a relative import to a layer
export const resolveImportLayer = (fromFile: string, importPath: string): string | null => {
  if (!importPath.startsWith('.')) return null; // skip node_modules
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);
  return detectLayer(resolved);
};

// Extract import paths from TypeScript source
const extractImports = (source: string): string[] => {
  const importRegex = /(?:import|require)\s*(?:\(?\s*['"]([^'"]+)['"]\s*\)?|(?:[^'"]*from\s+['"]([^'"]+)['"]))/g;
  const results: string[] = [];
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    results.push(match[1] || match[2]);
  }
  return results;
};

// Extract class names from source
const extractClasses = (source: string): string[] => {
  const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
  const results: string[] = [];
  let match;
  while ((match = classRegex.exec(source)) !== null) {
    results.push(match[1]);
  }
  return results;
};

// Extract interface names
const extractInterfaces = (source: string): string[] => {
  const ifRegex = /(?:export\s+)?interface\s+(\w+)/g;
  const results: string[] = [];
  let match;
  while ((match = ifRegex.exec(source)) !== null) {
    results.push(match[1]);
  }
  return results;
};

// Extract method signatures (public/private/async)
const extractMethods = (source: string): string[] => {
  const methodRegex = /(?:public|private|protected|async)?\s+(\w+)\s*\([^)]*\)\s*(?::\s*\S+)?\s*\{/g;
  const results: string[] = [];
  let match;
  while ((match = methodRegex.exec(source)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
      results.push(match[1]);
    }
  }
  return results;
};

// Parse a single TypeScript file
export const parseFile = async (filePath: string): Promise<ParsedFile> => {
  const source = await fs.readFile(filePath, 'utf8');
  const layer = detectLayer(filePath);
  const rawImports = extractImports(source);

  const imports: FileImport[] = rawImports.map(imp => ({
    from: filePath,
    importPath: imp,
    resolvedLayer: resolveImportLayer(filePath, imp),
  }));

  return {
    filePath,
    layer,
    imports,
    classes: extractClasses(source),
    interfaces: extractInterfaces(source),
    methods: extractMethods(source),
    lines: source.split('\n').length,
  };
};

// Scan all TypeScript files in a project src/
export const scanProject = async (srcPath: string): Promise<ParsedFile[]> => {
  const files = await glob('**/*.ts', {
    cwd: srcPath,
    absolute: true,
    ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**'],
  });

  return Promise.all(files.map(parseFile));
};
