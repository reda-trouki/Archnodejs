import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';

export const generateDomain = async (name: string, basePath: string): Promise<void> => {
  const pascal = toPascalCase(name);
  const kebab = toKebabCase(name);
  const camel = toCamelCase(name);
  const domainPath = path.join(basePath, 'src', 'domain', kebab);

  // Entity
  await writeFile(
    path.join(domainPath, 'entities', `${pascal}.ts`),
    `export class ${pascal} {
  private readonly _id: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(id: string) {
    this._id = id;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Add domain logic and invariants here
}
`
  );

  // Repository Interface
  await writeFile(
    path.join(domainPath, 'repositories', `I${pascal}Repository.ts`),
    `import { ${pascal} } from '../entities/${pascal}';

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

  get value(): string {
    return this._value;
  }

  equals(other: ${pascal}Id): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
`
  );

  // Domain Service
  await writeFile(
    path.join(domainPath, 'services', `${pascal}DomainService.ts`),
    `import { ${pascal} } from '../entities/${pascal}';
import { I${pascal}Repository } from '../repositories/I${pascal}Repository';

export class ${pascal}DomainService {
  constructor(
    private readonly ${camel}Repository: I${pascal}Repository
  ) {}

  // Add domain-specific business rules and logic here
  // Domain services contain logic that doesn't naturally fit within an entity

  async exists(id: string): Promise<boolean> {
    const ${camel} = await this.${camel}Repository.findById(id);
    return ${camel} !== null;
  }
}
`
  );

  // Domain Event
  await writeFile(
    path.join(domainPath, 'events', `${pascal}CreatedEvent.ts`),
    `export class ${pascal}CreatedEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly ${camel}Id: string
  ) {
    this.occurredAt = new Date();
  }

  static readonly EVENT_NAME = '${pascal}Created';
}
`
  );
};
