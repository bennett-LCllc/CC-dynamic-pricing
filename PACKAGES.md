# CC Ops — NPM Packages

## Root (`/`)

| Package | Version | Purpose |
|---------|---------|---------|
| turbo | ^2.3.0 | Monorepo task runner |
| typescript | ^5.6.0 | TypeScript compiler |
| eslint | ^9.15.0 | Linting |
| prettier | ^3.4.0 | Formatting |
| husky | ^9.1.0 | Git hooks |
| lint-staged | ^15.2.0 | Pre-commit linting |

## Web (`apps/web`)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.3 | React framework |
| react | ^18.3.1 | UI library |
| react-dom | ^18.3.1 | React DOM renderer |
| next-auth | ^4.24.7 | Authentication (JWT sessions) |
| recharts | ^2.12.0 | Charts (financial dashboard) |
| lucide-react | ^0.460.0 | Icon library |
| date-fns | ^3.6.0 | Date utilities |
| clsx | ^2.1.0 | Conditional classnames |
| tailwindcss | ^3.4.0 | Utility CSS |
| postcss | ^8.4.0 | CSS processing |
| autoprefixer | ^10.4.0 | CSS vendor prefixes |
| @types/react | ^18.3.0 | React type definitions |
| @types/node | ^22.9.0 | Node type definitions |

## API Node (`apps/api-node`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.19.2 | HTTP server |
| cors | ^2.8.5 | CORS middleware |
| helmet | ^7.1.0 | Security headers |
| zod | ^3.23.8 | Request validation |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| bcryptjs | ^2.4.3 | Password hashing |
| date-fns | ^3.6.0 | Date utilities |
| dotenv | ^16.4.0 | Environment variables |
| @types/express | ^4.17.0 | Express type definitions |
| @types/jsonwebtoken | ^9.0.0 | JWT type definitions |
| @types/bcryptjs | ^2.4.0 | bcrypt type definitions |
| @types/cors | ^2.8.0 | CORS type definitions |
| tsx | ^4.19.0 | TypeScript execution |
| nodemon | ^3.1.0 | Hot reload dev server |

## API FastAPI (`apps/api`)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | ^0.115.0 | Python web framework |
| uvicorn | ^0.34.0 | ASGI server |
| pydantic | ^2.9.0 | Data validation |
| python-dotenv | ^1.1.0 | Environment variables |

## Database (`packages/db`)

| Package | Version | Purpose |
|---------|---------|---------|
| prisma | ^5.22.0 | ORM + schema management |
| @prisma/client | ^5.22.0 | Generated database client |

## Shared (`packages/shared`)

| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.23.8 | Shared type validation |

---

**Total unique packages across monorepo: ~35**

### By Category

| Category | Packages |
|----------|----------|
| **Framework** | next, express, fastapi |
| **UI** | react, react-dom, recharts, lucide-react |
| **Styling** | tailwindcss, postcss, autoprefixer, clsx |
| **Auth** | next-auth, jsonwebtoken, bcryptjs |
| **Validation** | zod, pydantic |
| **Database** | prisma, @prisma/client |
| **HTTP** | cors, helmet |
| **Utilities** | date-fns, dotenv, python-dotenv |
| **Dev/TS** | typescript, tsx, nodemon, eslint, prettier, husky, lint-staged, turbo |
| **Types** | @types/react, @types/node, @types/express, @types/jsonwebtoken, @types/bcryptjs, @types/cors |
