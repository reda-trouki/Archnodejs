import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';

export const generateDomain = async (name: string, basePath: string): Promise<void> => {
  const pascal = toPascalCase(name);
  const kebab  = toKebabCase(name);
  const camel  = toCamelCase(name);
  const domainPath = path.join(basePath, 'src', 'domain', kebab);

  // Entity
  await writeFile(
    path.join(domainPath, 'entities', `${pascal}.ts`),
    `import { BaseEntity } from '@/domain/shared/BaseEntity';

export class ${pascal} extends BaseEntity {
  constructor(id?: string) {
    super(id);
  }

  // Add domain properties and invariants here
}
`
  );

  // Repository Interface
  await writeFile(
    path.join(domainPath, 'repositories', `I${pascal}Repository.ts`),
    `import { ${pascal} } from '@/domain/${kebab}/entities/${pascal}';

export interface I${pascal}Repository {
  findById(id: string): Promise<${pascal} | null>;
  findAll(): Promise<${pascal}[]>;
  save(${camel}: ${pascal}): Promise<void>;
  update(${camel}: ${pascal}): Promise<void>;
  delete(id: string): Promise<void>;
}
`
  );

  // Value Object
  await writeFile(
    path.join(domainPath, 'value-objects', `${pascal}Id.ts`),
    `export class ${pascal}Id {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('${pascal}Id cannot be empty');
    }
    this._value = value;
  }

  get value(): string { return this._value; }

  equals(other: ${pascal}Id): boolean { return this._value === other._value; }

  toString(): string { return this._value; }
}
`
  );

  // Domain Service
  await writeFile(
    path.join(domainPath, 'services', `${pascal}DomainService.ts`),
    `import { ${pascal} } from '@/domain/${kebab}/entities/${pascal}';
import { I${pascal}Repository } from '@/domain/${kebab}/repositories/I${pascal}Repository';

export class ${pascal}DomainService {
  constructor(
    private readonly ${camel}Repository: I${pascal}Repository
  ) {}

  async exists(id: string): Promise<boolean> {
    const entity = await this.${camel}Repository.findById(id);
    return entity !== null;
  }

  // Add domain-specific business rules here
}
`
  );

  // Domain Event
  await writeFile(
    path.join(domainPath, 'events', `${pascal}CreatedEvent.ts`),
    `export class ${pascal}CreatedEvent {
  public readonly occurredAt: Date;

  constructor(public readonly ${camel}Id: string) {
    this.occurredAt = new Date();
  }

  static readonly EVENT_NAME = '${pascal}Created';
}
`
  );
};
