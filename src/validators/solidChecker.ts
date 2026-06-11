import fs from 'fs-extra';
import { ParsedFile } from '../utils/ast';

export interface SolidViolation {
  file: string;
  principle: 'SRP' | 'OCP' | 'LSP' | 'ISP' | 'DIP';
  principleLabel: string;
  message: string;
  detail: string;
  severity: 'error' | 'warning';
}

// ─── SRP: Single Responsibility ────────────────────────────────────────────
// Heuristic: A class with too many public methods likely has multiple responsibilities
const checkSRP = (file: ParsedFile, source: string): SolidViolation[] => {
  const violations: SolidViolation[] = [];
  const METHOD_THRESHOLD = 10;
  const LINE_THRESHOLD = 300;

  if (file.methods.length > METHOD_THRESHOLD) {
    violations.push({
      file: file.filePath,
      principle: 'SRP',
      principleLabel: 'Single Responsibility Principle',
      message: `Class has ${file.methods.length} methods (threshold: ${METHOD_THRESHOLD})`,
      detail: `Consider splitting "${file.classes[0] ?? 'this class'}" into smaller, focused classes.`,
      severity: 'warning',
    });
  }

  if (file.lines > LINE_THRESHOLD) {
    violations.push({
      file: file.filePath,
      principle: 'SRP',
      principleLabel: 'Single Responsibility Principle',
      message: `File has ${file.lines} lines (threshold: ${LINE_THRESHOLD})`,
      detail: 'Large files often indicate multiple concerns. Consider splitting into separate modules.',
      severity: 'warning',
    });
  }

  return violations;
};

// ─── OCP: Open/Closed ──────────────────────────────────────────────────────
// Heuristic: Many switch/if-else chains on type strings suggests modifying code for new types
const checkOCP = (file: ParsedFile, source: string): SolidViolation[] => {
  const violations: SolidViolation[] = [];

  const switchCount = (source.match(/\bswitch\s*\(/g) ?? []).length;
  const typeofCount = (source.match(/typeof\s+\w+\s*===?\s*['"`]/g) ?? []).length;
  const instanceofCount = (source.match(/instanceof\s+\w+/g) ?? []).length;

  if (switchCount >= 3 || (typeofCount + instanceofCount) >= 4) {
    violations.push({
      file: file.filePath,
      principle: 'OCP',
      principleLabel: 'Open/Closed Principle',
      message: `Found ${switchCount} switch statements and ${typeofCount + instanceofCount} type-check expressions`,
      detail: 'Frequent type-switching suggests the class may need modification to support new types. Consider using polymorphism or the Strategy pattern.',
      severity: 'warning',
    });
  }

  return violations;
};

// ─── LSP: Liskov Substitution ──────────────────────────────────────────────
// Heuristic: Methods that throw NotImplementedError in subclasses break substitutability
const checkLSP = (file: ParsedFile, source: string): SolidViolation[] => {
  const violations: SolidViolation[] = [];

  const notImplementedPattern = /throw\s+new\s+(?:Error\s*\(\s*['"`].*[Nn]ot\s+[Ii]mplemented|NotImplementedError)/g;
  const matches = source.match(notImplementedPattern) ?? [];

  if (matches.length > 0 && source.includes('extends')) {
    violations.push({
      file: file.filePath,
      principle: 'LSP',
      principleLabel: 'Liskov Substitution Principle',
      message: `Found ${matches.length} "not implemented" throw(s) in a subclass`,
      detail: 'Throwing "not implemented" in a derived class means it cannot substitute its base class. Consider using interfaces or composition instead.',
      severity: 'error',
    });
  }

  return violations;
};

// ─── ISP: Interface Segregation ────────────────────────────────────────────
// Heuristic: Interfaces with many methods force implementors to depend on things they don't use
const checkISP = (file: ParsedFile, source: string): SolidViolation[] => {
  const violations: SolidViolation[] = [];
  const METHOD_THRESHOLD = 7;

  if (file.interfaces.length === 0) return violations;

  // Count methods per interface block
  const interfaceBlocks = source.match(/interface\s+\w+\s*\{[^}]*\}/gs) ?? [];
  for (const block of interfaceBlocks) {
    const methodCount = (block.match(/\w+\s*\([^)]*\)\s*:/g) ?? []).length;
    if (methodCount > METHOD_THRESHOLD) {
      const nameMatch = block.match(/interface\s+(\w+)/);
      const name = nameMatch?.[1] ?? 'unknown';
      violations.push({
        file: file.filePath,
        principle: 'ISP',
        principleLabel: 'Interface Segregation Principle',
        message: `Interface "${name}" has ${methodCount} methods (threshold: ${METHOD_THRESHOLD})`,
        detail: `Consider splitting "${name}" into smaller, role-specific interfaces so clients only depend on what they use.`,
        severity: 'warning',
      });
    }
  }

  return violations;
};

// ─── DIP: Dependency Inversion ─────────────────────────────────────────────
// Heuristic: Constructor `new ConcreteClass()` inside a class body (except in DI containers)
const checkDIP = (file: ParsedFile, source: string): SolidViolation[] => {
  const violations: SolidViolation[] = [];

  // Skip DI container files — they're allowed to instantiate concrete classes
  if (
    file.filePath.includes('/container/') ||
    file.filePath.includes('Container.ts') ||
    file.filePath.includes('.spec.ts') ||
    file.filePath.includes('.test.ts')
  ) {
    return violations;
  }

  // Match `new SomeClass(` but not `new Error(`, `new Map(`, `new Date(`, etc.
  const newInstanceRegex = /new\s+([A-Z][a-zA-Z]+)\s*\(/g;
  const builtins = new Set([
    'Error', 'Map', 'Set', 'Date', 'Promise', 'Array', 'Object',
    'RegExp', 'URL', 'Buffer', 'WeakMap', 'WeakSet', 'WeakRef',
  ]);

  let match;
  const violations_found: string[] = [];
  while ((match = newInstanceRegex.exec(source)) !== null) {
    const className = match[1];
    if (!builtins.has(className)) {
      violations_found.push(className);
    }
  }

  if (violations_found.length > 0) {
    violations.push({
      file: file.filePath,
      principle: 'DIP',
      principleLabel: 'Dependency Inversion Principle',
      message: `Direct instantiation of: ${[...new Set(violations_found)].join(', ')}`,
      detail: 'High-level modules should depend on abstractions (interfaces), not concrete implementations. Inject dependencies via constructor instead.',
      severity: 'warning',
    });
  }

  return violations;
};

// ─── Orchestrator ──────────────────────────────────────────────────────────
export const checkSolidPrinciples = async (files: ParsedFile[]): Promise<SolidViolation[]> => {
  const violations: SolidViolation[] = [];

  for (const file of files) {
    // Only check application & domain layers for SOLID
    if (!file.layer || !['domain', 'application', 'infrastructure'].includes(file.layer)) continue;

    const source = await fs.readFile(file.filePath, 'utf8');

    violations.push(
      ...checkSRP(file, source),
      ...checkOCP(file, source),
      ...checkLSP(file, source),
      ...checkISP(file, source),
      ...checkDIP(file, source),
    );
  }

  return violations;
};
