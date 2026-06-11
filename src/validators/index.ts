import path from 'path';
import { scanProject } from '../utils/ast';
import { checkLayerDependencies, LayerViolation } from './layerDeps';
import { detectCircularDependencies, CircularDependency } from './circularDeps';
import { checkSolidPrinciples, SolidViolation } from './solidChecker';
import { checkDomainLeakage, DomainLeakageViolation } from './domainLeakage';

export interface ValidationReport {
  projectPath: string;
  scannedFiles: number;
  duration: number;
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    total: number;
  };
  layerViolations: LayerViolation[];
  circularDependencies: CircularDependency[];
  solidViolations: SolidViolation[];
  domainLeakageViolations: DomainLeakageViolation[];
}

export const runValidation = async (projectPath: string): Promise<ValidationReport> => {
  const start = Date.now();
  const srcPath = path.join(projectPath, 'src');

  // Scan all .ts files
  const files = await scanProject(srcPath);

  // Run all checks in parallel
  const [layerViolations, circularDependencies, solidViolations, domainLeakageViolations] =
    await Promise.all([
      Promise.resolve(checkLayerDependencies(files)),
      Promise.resolve(detectCircularDependencies(files)),
      checkSolidPrinciples(files),
      checkDomainLeakage(files),
    ]);

  const allErrors = [
    ...layerViolations.filter(v => v.severity === 'error'),
    ...circularDependencies.filter(v => v.severity === 'error'),
    ...solidViolations.filter(v => v.severity === 'error'),
    ...domainLeakageViolations.filter(v => v.severity === 'error'),
  ].length;

  const allWarnings = [
    ...layerViolations.filter(v => v.severity === 'warning'),
    ...solidViolations.filter(v => v.severity === 'warning'),
    ...domainLeakageViolations.filter(v => v.severity === 'warning'),
  ].length;

  const totalChecks = 4;
  const passed =
    (layerViolations.length === 0 ? 1 : 0) +
    (circularDependencies.length === 0 ? 1 : 0) +
    (solidViolations.length === 0 ? 1 : 0) +
    (domainLeakageViolations.length === 0 ? 1 : 0);

  return {
    projectPath,
    scannedFiles: files.length,
    duration: Date.now() - start,
    summary: {
      errors: allErrors,
      warnings: allWarnings,
      passed,
      total: totalChecks,
    },
    layerViolations,
    circularDependencies,
    solidViolations,
    domainLeakageViolations,
  };
};
