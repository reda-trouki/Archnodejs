import path from 'path';
import { ParsedFile } from '../utils/ast';

export interface CircularDependency {
  cycle: string[];          // list of files forming the cycle
  severity: 'error' | 'warning';
}

// Build adjacency map: filePath -> [importedFilePaths]
const buildGraph = (files: ParsedFile[]): Map<string, string[]> => {
  const graph = new Map<string, string[]>();
  const fileSet = new Set(files.map(f => f.filePath));

  for (const file of files) {
    const neighbors: string[] = [];

    for (const imp of file.imports) {
      if (!imp.importPath.startsWith('.')) continue;

      const dir = path.dirname(file.filePath);
      const extensions = ['.ts', '/index.ts', '.js', '/index.js'];

      for (const ext of extensions) {
        const resolved = path.resolve(dir, imp.importPath + ext);
        if (fileSet.has(resolved)) {
          neighbors.push(resolved);
          break;
        }
      }
    }

    graph.set(file.filePath, neighbors);
  }

  return graph;
};

// DFS-based cycle detection (Tarjan-like)
export const detectCircularDependencies = (files: ParsedFile[]): CircularDependency[] => {
  const graph = buildGraph(files);
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: CircularDependency[] = [];
  const seenCycles = new Set<string>();

  const dfs = (node: string, stack: string[]): void => {
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, stack);
      } else if (inStack.has(neighbor)) {
        // Found a cycle — extract the loop portion
        const cycleStart = stack.indexOf(neighbor);
        const cycle = stack.slice(cycleStart);

        // Deduplicate by sorting the cycle key
        const key = [...cycle].sort().join('|');
        if (!seenCycles.has(key)) {
          seenCycles.add(key);
          cycles.push({
            cycle: [...cycle, neighbor], // close the loop visually
            severity: 'error',
          });
        }
      }
    }

    stack.pop();
    inStack.delete(node);
  };

  for (const file of files) {
    if (!visited.has(file.filePath)) {
      dfs(file.filePath, []);
    }
  }

  return cycles;
};
