import { ParsedFile } from '../utils/ast';

export interface LayerViolation {
  file: string;
  layer: string;
  importedLayer: string;
  importPath: string;
  rule: string;
  severity: 'error' | 'warning';
}

/**
 * Clean Architecture dependency rules:
 *
 *   domain       → (nothing — must be fully independent)
 *   application  → domain, shared
 *   infrastructure → application, domain, shared
 *   presentation → application, shared
 *   container    → everything (DI wiring layer — allowed)
 *   shared       → (nothing — cross-cutting, no layer deps)
 */
const FORBIDDEN: Record<string, string[]> = {
  domain:         ['application', 'infrastructure', 'presentation', 'container'],
  application:    ['infrastructure', 'presentation', 'container'],
  infrastructure: ['presentation'],
  presentation:   ['infrastructure', 'domain', 'container'],
  shared:         ['domain', 'application', 'infrastructure', 'presentation', 'container'],
};

const RULE_MESSAGES: Record<string, Record<string, string>> = {
  domain: {
    application:    'Domain must not depend on Application — dependency must point inward.',
    infrastructure: 'Domain must not depend on Infrastructure — this violates Clean Architecture.',
    presentation:   'Domain must not depend on Presentation — domain is the innermost layer.',
    container:      'Domain must not depend on the DI container.',
  },
  application: {
    infrastructure: 'Application must not depend on Infrastructure — use repository interfaces (DIP).',
    presentation:   'Application must not depend on Presentation.',
    container:      'Application must not depend on the DI container.',
  },
  infrastructure: {
    presentation:   'Infrastructure must not depend on Presentation.',
  },
  presentation: {
    infrastructure: 'Presentation must not depend directly on Infrastructure — route through Application.',
    domain:         'Presentation must not depend directly on Domain entities — use DTOs.',
    container:      'Presentation must not depend on the DI container.',
  },
  shared: {
    domain:         'Shared utilities must not depend on Domain.',
    application:    'Shared utilities must not depend on Application.',
    infrastructure: 'Shared utilities must not depend on Infrastructure.',
    presentation:   'Shared utilities must not depend on Presentation.',
    container:      'Shared utilities must not depend on the DI container.',
  },
};

export const checkLayerDependencies = (files: ParsedFile[]): LayerViolation[] => {
  const violations: LayerViolation[] = [];

  for (const file of files) {
    if (!file.layer) continue;

    const forbidden = FORBIDDEN[file.layer] ?? [];

    for (const imp of file.imports) {
      if (!imp.resolvedLayer) continue;
      if (!forbidden.includes(imp.resolvedLayer)) continue;

      const rule =
        RULE_MESSAGES[file.layer]?.[imp.resolvedLayer] ??
        `Layer "${file.layer}" must not depend on "${imp.resolvedLayer}".`;

      violations.push({
        file: file.filePath,
        layer: file.layer,
        importedLayer: imp.resolvedLayer,
        importPath: imp.importPath,
        rule,
        severity: 'error',
      });
    }
  }

  return violations;
};
