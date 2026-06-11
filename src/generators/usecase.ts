import path from 'path';
import { writeFile } from '../utils/file';
import { toPascalCase, toKebabCase, toCamelCase } from '../utils/file';

const inferDomainName = (useCaseName: string): string => {
  const VERB_PREFIXES = [
    'Create', 'Update', 'Delete', 'Get', 'Find', 'List', 'Remove', 'Add',
    'Fetch', 'Search', 'Count', 'Bulk', 'Import', 'Export', 'Send',
    'Process', 'Handle', 'Assign', 'Approve', 'Reject', 'Archive',
    'Restore', 'Publish', 'Unpublish', 'Enable', 'Disable', 'Reset',
  ];
  for (const verb of VERB_PREFIXES) {
    if (useCaseName.startsWith(verb) && useCaseName.length > verb.length) {
      return useCaseName.slice(verb.length);
    }
  }
  return useCaseName;
};

export const generateUseCase = async (name: string, basePath: string): Promise<void> => {
  const pascal      = toPascalCase(name);
  const domainGuess = inferDomainName(pascal);
  const domainCamel = toCamelCase(domainGuess);
  const domainKebab = toKebabCase(domainGuess);

  const dtoPath     = path.join(basePath, 'src', 'application', domainKebab, 'dto');
  const useCasePath = path.join(basePath, 'src', 'application', domainKebab, 'use-cases');

  // DTO
  await writeFile(
    path.join(dtoPath, `${pascal}Dto.ts`),
    `export interface ${pascal}Dto {
  // Define input properties for ${pascal}
  // Example: id?: string;
}

export interface ${pascal}ResponseDto {
  // Define output properties
  // Example: id: string; createdAt: Date;
}
`
  );

  // Use Case Interface — defines the contract
  await writeFile(
    path.join(useCasePath, `I${pascal}UseCase.ts`),
    `import { ${pascal}Dto, ${pascal}ResponseDto } from '@/application/${domainKebab}/dto/${pascal}Dto';

export interface I${pascal}UseCase {
  execute(dto: ${pascal}Dto): Promise<${pascal}ResponseDto>;
}
`
  );

  // Use Case Implementation — implements the interface
  await writeFile(
    path.join(useCasePath, `${pascal}UseCase.ts`),
    `import { ${pascal}Dto, ${pascal}ResponseDto } from '@/application/${domainKebab}/dto/${pascal}Dto';
import { I${pascal}UseCase } from '@/application/${domainKebab}/use-cases/I${pascal}UseCase';
import { I${domainGuess}Repository } from '@/domain/${domainKebab}/repositories/I${domainGuess}Repository';

export class ${pascal}UseCase implements I${pascal}UseCase {
  constructor(
    private readonly ${domainCamel}Repository: I${domainGuess}Repository
  ) {}

  async execute(dto: ${pascal}Dto): Promise<${pascal}ResponseDto> {
    // 1. Validate input
    // 2. Apply business rules
    // 3. Interact with repository
    // 4. Raise domain events if needed
    // 5. Return response

    throw new Error('${pascal}UseCase.execute() not implemented');
  }
}
`
  );
};
