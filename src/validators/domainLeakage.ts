import fs from 'fs-extra';
import { ParsedFile } from '../utils/ast';

export interface DomainLeakageViolation {
  file: string;
  type: 'orm-decorator' | 'http-import' | 'framework-import' | 'infrastructure-type' | 'db-query';
  message: string;
  detail: string;
  matchedPattern: string;
  severity: 'error' | 'warning';
}

// ─── Pattern Definitions ──────────────────────────────────────────────────

const ORM_DECORATORS = [
  { pattern: /@Entity\b/, label: 'TypeORM @Entity decorator' },
  { pattern: /@Column\b/, label: 'TypeORM @Column decorator' },
  { pattern: /@PrimaryGeneratedColumn\b/, label: 'TypeORM @PrimaryGeneratedColumn decorator' },
  { pattern: /@ManyToOne\b|@OneToMany\b|@ManyToMany\b|@OneToOne\b/, label: 'TypeORM relation decorator' },
  { pattern: /Schema\s*\(\s*\{/, label: 'Mongoose Schema instantiation' },
  { pattern: /mongoose\.model\s*\(/, label: 'Mongoose model call' },
];

const HTTP_IMPORTS = [
  { pattern: /from\s+['"]express['"]/, label: 'express import' },
  { pattern: /from\s+['"]fastify['"]/, label: 'fastify import' },
  { pattern: /from\s+['"]@nestjs\//, label: 'NestJS import' },
  { pattern: /from\s+['"]koa['"]/, label: 'koa import' },
  { pattern: /from\s+['"]hapi['"]/, label: 'hapi import' },
  { pattern: /\bRequest\b|\bResponse\b|\bNextFunction\b/, label: 'HTTP Request/Response type' },
];

const INFRASTRUCTURE_TYPES = [
  { pattern: /\bPrismaClient\b/, label: 'PrismaClient reference' },
  { pattern: /\bDataSource\b|\bRepository</, label: 'TypeORM DataSource/Repository' },
  { pattern: /\bknex\b|\bKnex\b/, label: 'Knex reference' },
  { pattern: /\bMongoClient\b/, label: 'MongoDB MongoClient' },
  { pattern: /\bPool\b.*postgres|pg\.Pool/, label: 'pg Pool reference' },
  { pattern: /\bRedisClient\b/, label: 'Redis client reference' },
];

const DB_QUERY_PATTERNS = [
  { pattern: /\.(findOne|findMany|findFirst|findUnique)\s*\(/, label: 'ORM query method' },
  { pattern: /\.query\s*\(\s*['"`]\s*(SELECT|INSERT|UPDATE|DELETE)/i, label: 'Raw SQL query' },
  { pattern: /\bawait\s+(db|prisma|knex|pool)\.\b/, label: 'Direct database call' },
];

// ─── Checker ─────────────────────────────────────────────────────────────

export const checkDomainLeakage = async (files: ParsedFile[]): Promise<DomainLeakageViolation[]> => {
  const violations: DomainLeakageViolation[] = [];

  const domainFiles = files.filter(f => f.layer === 'domain');

  for (const file of domainFiles) {
    const source = await fs.readFile(file.filePath, 'utf8');

    // ORM decorators in domain entities
    for (const { pattern, label } of ORM_DECORATORS) {
      if (pattern.test(source)) {
        violations.push({
          file: file.filePath,
          type: 'orm-decorator',
          message: `ORM concern found in domain layer: ${label}`,
          detail: 'Domain entities should be plain objects with no ORM dependency. Move persistence mapping to the Infrastructure layer using the Repository pattern.',
          matchedPattern: label,
          severity: 'error',
        });
      }
    }

    // HTTP framework imports
    for (const { pattern, label } of HTTP_IMPORTS) {
      if (pattern.test(source)) {
        violations.push({
          file: file.filePath,
          type: 'http-import',
          message: `HTTP/framework concern in domain layer: ${label}`,
          detail: 'Domain should have zero knowledge of delivery mechanisms (HTTP, WebSocket, CLI). Move this to the Presentation layer.',
          matchedPattern: label,
          severity: 'error',
        });
      }
    }

    // Infrastructure types bleeding in
    for (const { pattern, label } of INFRASTRUCTURE_TYPES) {
      if (pattern.test(source)) {
        violations.push({
          file: file.filePath,
          type: 'infrastructure-type',
          message: `Infrastructure type in domain layer: ${label}`,
          detail: 'Domain must not reference concrete infrastructure types. Define an interface in the domain and implement it in Infrastructure.',
          matchedPattern: label,
          severity: 'error',
        });
      }
    }

    // Raw DB queries in domain
    for (const { pattern, label } of DB_QUERY_PATTERNS) {
      if (pattern.test(source)) {
        violations.push({
          file: file.filePath,
          type: 'db-query',
          message: `Database query in domain layer: ${label}`,
          detail: 'Database queries must live in the Infrastructure layer inside Repository implementations, not in domain services or entities.',
          matchedPattern: label,
          severity: 'error',
        });
      }
    }
  }

  return violations;
};
