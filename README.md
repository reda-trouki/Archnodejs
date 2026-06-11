# ArchGen

> Enterprise Architecture Generator for Node.js — DDD · Clean Architecture · Hexagonal · SOLID

ArchGen is an open-source CLI tool that scaffolds production-ready Node.js applications based on Domain-Driven Design, Clean Architecture, and SOLID principles. Instead of spending days setting up project structure, you get a consistent, well-organized codebase from the first command.

---

## Table of Contents

- [ArchGen](#archgen)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Commands](#commands)
    - [`create`](#create)
    - [`generate`](#generate)
    - [`validate`](#validate)
    - [`config`](#config)
  - [Generated Project Structure](#generated-project-structure)
  - [Path Aliases](#path-aliases)
  - [Architecture Concepts](#architecture-concepts)
    - [Why two repository files per entity?](#why-two-repository-files-per-entity)
    - [Why do use cases have interfaces?](#why-do-use-cases-have-interfaces)
    - [Layer dependency rules](#layer-dependency-rules)
  - [Supported Options](#supported-options)
    - [Architectures](#architectures)
    - [Frameworks](#frameworks)
    - [ORMs](#orms)
    - [DI Containers](#di-containers)
  - [Roadmap](#roadmap)
    - [v3.0](#v30)
  - [License](#license)

---

## Installation

**Use without installing (recommended to try it out):**

```bash
npx archgen create my-app
```

**Install globally:**

```bash
npm install -g archgen
```

**Or clone and build from source:**

```bash
git clone https://github.com/your-org/archgen.git
cd archgen
npm install
npm run build
npm install -g .
```

---

## Quick Start

```bash
# 1. Create a new project
archgen create shop-api --framework=express --orm=prisma --di=inversify

# 2. Enter the project
cd shop-api

# 3. Install dependencies
npm install

# 4. Generate your first module (no flags needed — reads from .archgenrc.json)
archgen generate module User
archgen generate module Product
archgen generate module Order

# 5. Start the dev server
cp .env.example .env
npm run dev
```

That's it. You have a fully structured DDD project with domain entities, use cases, repositories, controllers, and a wired DI container — ready to fill in with business logic.

---

## Commands

### `create`

Scaffolds a complete new project.

```bash
archgen create <name> [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--architecture` | Architecture pattern: `ddd` · `clean` · `hexagonal` · `cqrs` | `ddd` |
| `--framework` | Web framework: `express` · `fastify` · `nestjs` | `express` |
| `--database` | Database: `postgres` · `mysql` · `mongodb` | `postgres` |
| `--orm` | ORM: `prisma` · `typeorm` · `drizzle` · `mongoose` | `prisma` |
| `--di` | DI container: `inversify` · `tsyringe` | `inversify` |

**Examples:**

```bash
archgen create my-api
archgen create my-api --framework=fastify --orm=drizzle
archgen create my-api --architecture=hexagonal --framework=express --orm=typeorm --di=tsyringe
```

After creation, a `.archgenrc.json` file is saved in the project root. All subsequent `generate` commands read this file automatically — you never need to repeat your flags.

---

### `generate`

Generates individual architecture artifacts. Use the alias `g` for brevity.

```bash
archgen generate <type> <name> [options]
# or
archgen g <type> <name>
```

**Types:**

| Type | What it generates |
|------|-------------------|
| `domain` | Entity · Repository interface · Value Object · Domain Service · Domain Event |
| `usecase` | Use case class (implements its interface) · Interface · DTO |
| `repository` | Domain interface (`I<Name>Repository`) + Infrastructure implementation |
| `controller` | Controller class (implements its interface) + Route file |
| `module` | All of the above combined + DI container wiring |

**Examples:**

```bash
# Generate a full module (recommended — generates everything at once)
archgen generate module User
archgen g module Product

# Generate individual pieces
archgen generate domain Order
archgen generate usecase CreateOrder
archgen generate usecase ApproveOrder
archgen generate repository Order
archgen generate controller Order
```

**Flags for `module` (read from `.archgenrc.json` automatically):**

| Flag | Description |
|------|-------------|
| `--orm <orm>` | ORM integration to generate alongside |
| `--di <di>` | DI container wiring to generate |
| `--framework <fw>` | Framework template to generate |
| `--no-orm` | Skip ORM even if set in config |
| `--no-di` | Skip DI even if set in config |
| `--no-framework` | Skip framework template even if set in config |

> **Note:** `--orm`, `--di`, and `--framework` only apply automatically to `generate module`. Focused generators (`domain`, `usecase`, `repository`, `controller`) produce exactly one thing — pass the flag explicitly to add extras.

**Use case naming — verb prefix stripping:**

ArchGen automatically infers the domain name from your use case name by stripping the verb prefix. Supported prefixes: `Create` · `Update` · `Delete` · `Get` · `Find` · `List` · `Remove` · `Add` · `Fetch` · `Search` · `Send` · `Process` · `Approve` · `Reject` · `Archive` · `Publish` · and more.

```bash
archgen generate usecase CreateUser      # domain: User
archgen generate usecase ApproveOrder    # domain: Order
archgen generate usecase SendInvoice     # domain: Invoice
archgen generate usecase ListUserOrders  # domain: UserOrders
```

---

### `validate`

Scans your project and validates it against Clean Architecture rules, SOLID principles, and domain purity. Useful in CI pipelines.

```bash
archgen validate [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--path <path>` | Path to project root (defaults to current directory) |
| `--json` | Output results as JSON (useful for CI tooling) |

**Examples:**

```bash
# Validate the current project
archgen validate

# Validate a specific path
archgen validate --path ./my-app

# JSON output for CI
archgen validate --json
```

**What it checks:**

**Layer Dependency Violations** — Enforces Clean Architecture dependency rules:
- Domain must not import from Application, Infrastructure, or Presentation
- Application must not import from Infrastructure or Presentation
- Presentation must not import directly from Infrastructure or Domain entities
- Shared utilities must not depend on any layer

**Circular Dependencies** — Uses DFS graph traversal to detect import cycles across all TypeScript files.

**SOLID Violations:**

| Principle | How it's detected |
|-----------|-------------------|
| SRP | Classes with more than 10 methods or files over 300 lines |
| OCP | 3+ switch statements or 4+ `typeof`/`instanceof` checks in one file |
| LSP | `throw new Error('not implemented')` inside a class that extends another |
| ISP | Interfaces with more than 7 method signatures |
| DIP | Direct `new ConcreteClass()` instantiation inside non-container files |

**Domain Leakage** — Detects infrastructure concerns bleeding into the domain layer:
- ORM decorators (`@Entity`, `@Column`, Mongoose `Schema`)
- HTTP framework imports (`express`, `fastify`, `@nestjs/*`)
- Infrastructure types (`PrismaClient`, `DataSource`, `MongoClient`)
- Raw database queries inside domain files

**Exit codes:** `0` when clean, `1` when errors are found — making it easy to fail CI on violations.

**Sample output:**

```
🔴 Layer Dependency Violations
────────────────────────────────────────────────────────────

  ✖ [domain] → [infrastructure]
    File    : domain/user/UserService.ts
    Import  : ../../infrastructure/database/prisma.client
    Rule    : Domain must not depend on Infrastructure — this violates Clean Architecture.

⚠️  SOLID Principle Violations
────────────────────────────────────────────────────────────

  [DIP] Dependency Inversion Principle
    ⚠ Direct instantiation of: UserRepository, EmailService
      File   : application/user/use-cases/CreateUserUseCase.ts
      Detail : Inject dependencies via constructor instead.

────────────────────────────────────────────────────────────
  Errors   : 1
  Warnings : 1
  ✖ 1 error(s) must be fixed.
```

---

### `config`

Manages the `.archgenrc.json` project configuration file.

```bash
archgen config <subcommand>
```

**Subcommands:**

```bash
# Show the active config (walks up from current directory)
archgen config show

# Create a .archgenrc.json in the current directory
archgen config init --framework=express --orm=prisma --di=inversify

# Update a single key
archgen config set orm drizzle
archgen config set di tsyringe
archgen config set framework fastify
```

**`.archgenrc.json` format:**

```json
{
  "architecture": "ddd",
  "framework": "express",
  "database": "postgres",
  "orm": "prisma",
  "di": "inversify"
}
```

The config file is picked up automatically by `generate` and `validate`. ArchGen walks up the directory tree to find it, so monorepo setups with a root-level config work without copying the file into every package.

---

## Generated Project Structure

```
my-app/
├── src/
│   ├── domain/
│   │   ├── user/
│   │   │   ├── entities/           # User.ts — pure domain object
│   │   │   ├── repositories/       # IUserRepository.ts — contract (interface)
│   │   │   ├── value-objects/      # UserId.ts
│   │   │   ├── services/           # UserDomainService.ts
│   │   │   └── events/             # UserCreatedEvent.ts
│   │   └── shared/
│   │       ├── BaseEntity.ts       # id, createdAt, updatedAt, equals()
│   │       └── IBaseRepository.ts
│   │
│   ├── application/
│   │   └── user/
│   │       ├── dto/                # CreateUserDto.ts, CreateUserResponseDto.ts
│   │       └── use-cases/
│   │           ├── ICreateUserUseCase.ts   # interface
│   │           └── CreateUserUseCase.ts    # implements ICreateUserUseCase
│   │
│   ├── infrastructure/
│   │   ├── database/               # Prisma client / TypeORM DataSource / Drizzle client
│   │   ├── repositories/           # UserRepository.ts — implements IUserRepository
│   │   └── services/
│   │
│   ├── presentation/
│   │   └── http/
│   │       ├── controllers/        # UserController.ts — implements IUserController
│   │       ├── routes/             # user.routes.ts
│   │       └── middlewares/        # auth, validation
│   │
│   ├── shared/
│   │   ├── errors/                 # AppError, NotFoundError, ValidationError
│   │   └── utils/
│   │
│   ├── container/
│   │   └── userContainer.ts        # DI wiring — connects all the pieces
│   │
│   └── main.ts                     # App entry point
│
├── .archgenrc.json                  # ArchGen project config
├── .env.example
├── tsconfig.json                    # Includes @/ path aliases
├── package.json
└── README.md
```

---

## Path Aliases

Every generated project comes pre-configured with `@/` path aliases so you never write deep relative imports.

```typescript
// Without aliases (hard to read, breaks on file moves)
import { IUserRepository } from '../../../../domain/user/repositories/IUserRepository';

// With @/ aliases (clean, always correct)
import { IUserRepository } from '@/domain/user/repositories/IUserRepository';
```

This works in both development and production out of the box via two pre-configured packages:

- **`tsconfig-paths`** — resolves `@/` at runtime during `npm run dev`
- **`tsc-alias`** — rewrites `@/` in compiled JS during `npm run build`

The generated `tsconfig.json` maps `@/*` → `src/*`. No manual setup required.

---

## Architecture Concepts

### Why two repository files per entity?

When you run `archgen generate repository User` (or `generate module User`), two files are created:

```
src/domain/user/repositories/IUserRepository.ts      ← interface (domain layer)
src/infrastructure/repositories/UserRepository.ts    ← implementation (infrastructure layer)
```

This is intentional and follows the **Dependency Inversion Principle**. The domain defines *what it needs* through an interface. The infrastructure provides *how it's done* through a concrete class. Your use cases depend only on the interface — they never know whether data comes from Postgres, MongoDB, or an in-memory map.

```
CreateUserUseCase  →  IUserRepository  ←  UserRepository (Prisma)
                                       ←  UserRepository (TypeORM)
                                       ←  InMemoryUserRepository (tests)
```

### Why do use cases have interfaces?

```
src/application/user/use-cases/ICreateUserUseCase.ts   ← interface
src/application/user/use-cases/CreateUserUseCase.ts    ← implements ICreateUserUseCase
```

The controller depends on `ICreateUserUseCase`, not `CreateUserUseCase` directly. This means you can swap the implementation, wrap it with a decorator (logging, caching, transactions), or mock it in tests — without touching the controller.

### Layer dependency rules

```
Presentation  →  Application  →  Domain
Infrastructure  →  Application  →  Domain
                                    ↑
                              (innermost — no outward deps)
```

Dependencies always point inward. The domain layer has zero knowledge of databases, HTTP, or any framework. The `archgen validate` command enforces this automatically.

---

## Supported Options

### Architectures
| Value | Pattern |
|-------|---------|
| `ddd` | Domain-Driven Design |
| `clean` | Clean Architecture |
| `hexagonal` | Ports and Adapters |
| `cqrs` | Command Query Responsibility Segregation |

### Frameworks
| Value | Package |
|-------|---------|
| `express` | Express 4 + cors + helmet |
| `fastify` | Fastify 4 + @fastify/cors + @fastify/helmet |
| `nestjs` | NestJS (entry point only) |

### ORMs
| Value | Package |
|-------|---------|
| `prisma` | Prisma 5 — schema, singleton client, typed repository |
| `typeorm` | TypeORM 0.3 — DataSource, schema class, repository |
| `drizzle` | Drizzle ORM — schema, pg client, repository |
| `mongoose` | Mongoose — schema, model, repository |

### DI Containers
| Value | Package |
|-------|---------|
| `inversify` | InversifyJS — symbol tokens, Container bindings |
| `tsyringe` | Tsyringe — `@injectable()` decorators, `container.register` |

---

## Roadmap

### v3.0
- AST-based code analysis
- Architecture diagram generation (`archgen diagram`)
- AI-powered refactoring suggestions (`archgen analyze`)
- Monorepo support (Nx, Turborepo, pnpm workspaces)
- Microservices scaffold (API Gateway, Event Bus, Shared Kernel)

---

## License

MIT