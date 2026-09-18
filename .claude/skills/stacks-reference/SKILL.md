---
name: stacks-reference
description: >
  Bộ lệnh bash bóc route/model/controller/DTO/guard/migration theo từng stack
  (Next.js, NestJS, Supabase + Express, Django, FastAPI, Spring Boot, Laravel, Go).
  Reference skill dùng chung — /code-to-srs và /code-explorer nạp để lấy fact
  từ source code. Không phải skill điểm-vào (không user-invocable).
user-invocable: false
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# Stacks Reference — recipe bóc fact từ source code theo stack‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Vai trò trong BA-Kit:** đây là engine đọc-code cho `/code-to-srs` + `/code-explorer`. Mỗi recipe trả về
> **fact kỹ thuật có địa chỉ `file:line`** (route, validator, constant, guard, migration) — nguồn để cite
> provenance khi tái lập SRS từ code.
>
> **Ranh giới IT-BA (quan trọng):** output của các lệnh này là **bằng chứng để suy nghiệp vụ + cite nguồn**,
> KHÔNG phải nội dung đưa thẳng vào spec. Spec nghiệp vụ (`{feature}-reverse-spec.md`) viết bằng business
> language — endpoint/tên function/tên bảng CHỈ xuất hiện ở cột `Nguồn` (provenance `file:line`), KHÔNG thành
> section riêng, KHÔNG phơi ra Mục FR/BR (theo `ba-conventions.md` Mục 3). Entity đi vào ERD nghiệp vụ, KHÔNG
> đẻ file api-reference/data-models kỹ thuật riêng.
>
> **Nhãn tin cậy khi bóc code:** cái code **khẳng định** (validator `@Length(8,32)`, constant `OTP_TTL=300`,
> guard, migration column) = **✅ + cite `file:line`**. Cái code **không nói** (vì sao khóa 24h, mục tiêu
> nghiệp vụ, ai là actor thật) = **🟡 Inferred** — KHÔNG nâng thành ✅ chỉ vì "đọc được code".
>
> **Quy tắc CITE `file:line` (bắt buộc — hàng rào truy vết):** luôn cite **đường dẫn đầy đủ từ slug repo trở
> xuống** — vd `oauth-main/src/main/java/.../AccountServiceImpl.java:238-274`, **KHÔNG** bare basename
> (`AccountServiceImpl.java:238`), **KHÔNG** `.../ellipsis`. Codebase đa-repo/monorepo có file trùng tên
> (`AccountServiceImpl.java` ở 2 repo, `messages.properties` ở nhiều module) → bare basename KHÔNG resolve
> ngược được cho `_evidence.md`/RTM. Lệnh `grep`/`find` dưới đây đã chạy trên đường dẫn đầy đủ — **ghi đúng
> đường dẫn đã search, nguyên văn**. Phân biệt "**không tìm thấy sau khi tìm**" (ghi pattern đã grep) vs
> "**chưa tìm**".

***

## 3 recipe cross-stack (đọc TEST · i18n · dead-code) — áp mọi stack‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> 3 recipe này **đặc thù `/code-to-srs`** (không dùng cho reverse-doc). Chúng bóc đúng 3 chỗ mà bản bóc-fact
> nguyên thủy bỏ sót: **test** (nguồn duy nhất bớt-câm về hành vi mong đợi), **i18n catalog** (wording lỗi
> thật), **dead-code/flag** (tránh tái lập feature đã chết). Pattern chính cho JS/TS + Java + Python + PHP +
> Go dưới đây; stack khác suy tương tự.

### R1 — Mine TEST (bóc business rule/boundary/edge từ test)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Đây là PASS RIÊNG đọc test làm NGUỒN** — KHÁC các recipe khác dùng `grep -v spec/test` để *đếm
> controller/route* (đúng, giữ nguyên). Ở đây test là fact hạng nhất về **hành vi mong đợi**.

```bash
# JS/TS (Jest/Vitest/Mocha) — tên test = mô tả hành vi; assertion = boundary/error thật
grep -rn "describe(\|it(\|test(\|expect(" . --include="*.test.ts" --include="*.spec.ts" \
  --include="*.test.js" --include="*.spec.js" | grep -v node_modules | head -60
# Java (JUnit) — pipe find→xargs (KHÔNG dùng $(find) trần: nếu rỗng, grep -r sẽ quét NHẦM cả cwd)
find . -path "*/test/*" -name "*.java" -print0 2>/dev/null \
  | xargs -0 grep -n "@Test\|assertEquals\|assertThrows\|assertTrue\|assertThat" 2>/dev/null | head -60
# Python (pytest/unittest)
find . \( -name "test_*.py" -o -name "*_test.py" \) -print0 2>/dev/null \
  | xargs -0 grep -n "def test_\|assert \|pytest.raises\|self.assert" 2>/dev/null | head -60
# PHP (PHPUnit): grep "public function test\|assert" tests/ ; Go: grep "func Test\|t.Error\|want\b" *_test.go
```

**Quy tắc nhãn cho fact rút từ test:**
- Test **active** khẳng định hành vi (`it('locks account on 10th failed attempt')` + assertion đúng) =
  **✅**, nguồn = `test-file:line`. Dùng cho **boundary** (9 chưa khóa vs 10 khóa), **flow nhiều bước**,
  **edge case**, **rule ngược** ("reset counter khi login thành công") — thứ code sản phẩm hay không lộ rõ.
- Test bị **skip/tắt** (`it.skip`/`it.todo`/`xit`/`describe.skip`/`@Disabled`/`@Ignore`/`@pytest.mark.skip`/
  `t.Skip()`) = **🟡** + ghi vào `reverse-gaps.md` ("test tồn tại nhưng bị skip — chưa chắc hành vi thật").
- **NHÃN BẤT ĐỐI XỨNG giữ nguyên:** test cho **hành vi** (✅), vẫn KHÔNG cho **"vì sao"** (`should lock after
  10` không giải thích vì sao 10) → lý do vẫn 🟡 + OQ.
- **KHÔNG chạy test** — chỉ đọc tĩnh. Test đọc = "hành vi *mong đợi*", không đảm bảo "*đang chạy đúng*".

### R2 — i18n / message catalog (wording lỗi + nhãn UI thật)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Lỗi/nhãn trong code thật thường là **mã khóa** (`throw t('auth.locked')`, `MessageConst.LOCKED`), câu thật
> nằm ở file catalog. PHẢI resolve mã → câu thật trước khi ghi Error Matrix.

```bash
# Tìm file catalog
find . \( -name "messages*.properties" -o -name "ValidationMessages*.properties" \) 2>/dev/null   # Spring
find . \( -ipath "*i18n*" -o -ipath "*locale*" -o -name "*.messages.*" \) \( -name "*.json" -o -name "*.ts" -o -name "*.yaml" \) 2>/dev/null | grep -v node_modules  # JS/Vue/React
find . -name "*.po" -o -name "django.po" 2>/dev/null                                                # Django gettext
ls lang/ resources/lang/ 2>/dev/null                                                                # Laravel
# Nối mã khóa → câu: lấy key ở throw-site rồi grep key đó trong catalog
grep -rn "MessageConst\.\|ErrorConst\.\|\\\$t(\|[^a-z]t(['\"]\|i18n\.\|gettext(\|__(" src/ app/ 2>/dev/null | head -40
```

**Quy tắc:** wording exact = **✅**, cite **CẢ** `throw-site:line` **VÀ** `catalog-file:line`. **Quote, đừng
paraphrase** câu có thể trích nguyên văn. Chỉ có mã khóa mà không tìm ra câu → ghi mã + `⚠️ chưa resolve
được câu thật` + Gap (KHÔNG bịa câu).

### R3 — Dead-code / feature-flag / deprecated (tránh tái lập feature đã chết)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```bash
# Route/endpoint KHÔNG có caller (so endpoint backend với path-constant/router frontend)
#   1) liệt kê endpoint backend  2) grep từng path trong frontend path-constant/router  3) path không xuất hiện = nghi no-caller
grep -rn "@Deprecated\|@deprecated\|# DEPRECATED\|// DEPRECATED\|@Obsolete" . 2>/dev/null | grep -v node_modules | head -30
grep -rn "if (false)\|if(false)\|FEATURE_\|FLAG_\|isEnabled(\|feature\.flag\|process.env.ENABLE_" . 2>/dev/null | grep -v node_modules | head -30
# Export nhưng không import ở đâu (component/handler mồ côi) — grep tên export rồi đếm import
```

**Quy tắc (no-caller-found):** nghi dead/flag-tắt → **KHÔNG tái lập như feature chắc**; hạ **🟡** + OQ trong
`reverse-gaps.md` dạng *"phát hiện {X} có thể dead-code / tắt-flag — còn dùng trong nghiệp vụ không?"* kèm
**negative-search evidence** (pattern + scope đã grep) trong khối `<details>`. Ghi rõ "không thấy caller **sau‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
khi tìm** (grep `<path>` trong `<frontend router/path-const>`)" — KHÁC "chưa tìm".

***

## Next.js

### Detect version & config
```bash
cat package.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
print('Next.js:', deps.get('next','not found'))
print('React:', deps.get('react','not found'))
print('TypeScript:', deps.get('typescript','not found'))
print('Auth:', [k for k in deps if 'auth' in k.lower() or 'next-auth' in k])
print('ORM:', [k for k in deps if k in ['prisma','drizzle-orm','typeorm','@supabase/supabase-js']])
print('State:', [k for k in deps if k in ['zustand','jotai','recoil','redux','@reduxjs/toolkit']])
print('Forms:', [k for k in deps if k in ['react-hook-form','formik','zod']])
" 2>/dev/null

cat next.config.js 2>/dev/null || cat next.config.ts 2>/dev/null || cat next.config.mjs 2>/dev/null
```

### Identify router type (App Router vs Pages Router)
```bash
# App Router (Next.js 13+)
ls app/ src/app/ 2>/dev/null

# Pages Router (legacy)
ls pages/ src/pages/ 2>/dev/null

# Both can coexist — check which has more content
find app/ src/app/ -name "page.tsx" -o -name "page.jsx" 2>/dev/null | wc -l
find pages/ src/pages/ -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l
```

### App Router — find all pages (features)
```bash
# Every page.tsx = a user-facing route
find . \( -path "*/app/*" -name "page.tsx" -o -path "*/app/*" -name "page.jsx" \) \
  | grep -v node_modules | sort

# Route groups (folders with parentheses = logical grouping, not URL)
find . -path "*/app/(*" -type d | grep -v node_modules

# Layouts (understand page hierarchy)
find . \( -path "*/app/*" -name "layout.tsx" -o -path "*/app/*" -name "layout.jsx" \) \
  | grep -v node_modules | sort

# Loading and error boundaries
find . \( -path "*/app/*" -name "loading.tsx" -o -path "*/app/*" -name "error.tsx" \) \
  | grep -v node_modules
```

### App Router — API routes
```bash
# Every route.ts in app/ = an API endpoint
find . \( -path "*/app/*" -name "route.ts" -o -path "*/app/*" -name "route.js" \) \
  | grep -v node_modules | sort

# Show HTTP methods in each route file
for f in $(find . -path "*/app/*" -name "route.ts" | grep -v node_modules); do
  echo "=== $f ===";
  grep -n "export.*GET\|export.*POST\|export.*PUT\|export.*DELETE\|export.*PATCH" $f;
done
```

### Pages Router — find all pages and API routes
```bash
# Pages
find pages/ src/pages/ -name "*.tsx" -o -name "*.jsx" \
  | grep -v node_modules | grep -v "_app\|_document\|api/" | sort

# API routes
find pages/api/ src/pages/api/ -name "*.ts" -o -name "*.js" \
  | grep -v node_modules | sort

# Show HTTP methods
grep -rn "req\.method\|if.*GET\|if.*POST\|switch.*method" pages/api/ src/pages/api/ \
  --include="*.ts" --include="*.js" 2>/dev/null | head -40
```

### Server Actions (Next.js 14+)
```bash
# Files with "use server" directive
grep -rn '"use server"' . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | head -20

# Action functions
grep -rn "^export.*action\|^export async function.*Action\|^export async function.*action" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -30
```

### Middleware (auth guards, redirects)
```bash
cat middleware.ts 2>/dev/null || cat middleware.js 2>/dev/null || \
  cat src/middleware.ts 2>/dev/null || cat src/middleware.js 2>/dev/null

# What paths are protected?
grep -n "matcher\|pathname\|redirect\|NextResponse" middleware.ts src/middleware.ts 2>/dev/null
```

### Authentication
```bash
# NextAuth / Auth.js
find . -name "auth.ts" -o -name "auth.js" -o -name "\[...nextauth\]*" \
  | grep -v node_modules
cat app/api/auth/\[...nextauth\]/route.ts 2>/dev/null
cat src/app/api/auth/\[...nextauth\]/route.ts 2>/dev/null
cat auth.ts 2>/dev/null

# What providers are configured?
grep -n "providers:\|GoogleProvider\|GitHubProvider\|CredentialsProvider\|EmailProvider" \
  auth.ts app/api/auth/**/*.ts 2>/dev/null | head -20

# Clerk
ls app/\(auth\)/ 2>/dev/null
grep -rn "clerkMiddleware\|authMiddleware\|currentUser\|useUser\|useAuth" \
  . --include="*.tsx" --include="*.ts" | grep -v node_modules | head -10

# Lucia Auth
grep -rn "lucia\|validateRequest\|createSession" \
  . --include="*.ts" | grep -v node_modules | head -10
```

### Data fetching patterns
```bash
# Server Components data fetching
grep -rn "async function\|await fetch\|await.*prisma\|await.*supabase\|createClient" \
  app/ src/app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | head -30

# React Query / TanStack Query
grep -rn "useQuery\|useMutation\|useInfiniteQuery\|queryClient" \
  . --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

# SWR
grep -rn "useSWR\|mutate(" . --include="*.tsx" | grep -v node_modules | head -20
```

### State management
```bash
# Zustand stores
find . -name "*.store.ts" -o -name "store.ts" -o -name "*Store.ts" \
  | grep -v node_modules
grep -rn "create<\|createStore\|useStore" . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | head -20

# Jotai atoms
grep -rn "atom(" . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

# Context providers
find . -path "*/providers/*" | grep -v node_modules
find . -name "*Provider*" -name "*.tsx" | grep -v node_modules
```

### Environment & config
```bash
cat .env.local 2>/dev/null || cat .env 2>/dev/null
cat .env.example 2>/dev/null || cat .env.local.example 2>/dev/null

# What env vars are used in the app?
grep -rn "process\.env\.\|NEXT_PUBLIC_" . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v ".env" \
  | grep -o "process\.env\.[A-Z_]*\|NEXT_PUBLIC_[A-Z_]*" | sort -u
```

### UI components & forms
```bash
# shadcn/ui components used
ls components/ui/ src/components/ui/ 2>/dev/null

# Form validation schemas (Zod)
find . -name "*.schema.ts" -o -name "schemas.ts" | grep -v node_modules
grep -rn "z\.object\|z\.string\|z\.number\|zodResolver" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

***

## NestJS

### Detect version & modules
```bash
cat package.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
print('NestJS:', deps.get('@nestjs/core','not found'))
print('ORM:', [k for k in deps if k in ['@nestjs/typeorm','@nestjs/mongoose','@nestjs/sequelize','@nestjs/prisma','prisma']])
print('Auth:', [k for k in deps if 'passport' in k or 'jwt' in k or 'auth' in k.lower()])
print('Validation:', [k for k in deps if k in ['class-validator','class-transformer','zod','joi']])
print('Queue:', [k for k in deps if k in ['@nestjs/bull','bull','bullmq','@nestjs/schedule']])
print('Events:', [k for k in deps if 'event' in k.lower() or 'cqrs' in k.lower()])
print('Swagger:', deps.get('@nestjs/swagger','not found'))
print('Config:', deps.get('@nestjs/config','not found'))
print('Cache:', [k for k in deps if 'cache' in k.lower() or 'redis' in k.lower()])
print('WebSocket:', [k for k in deps if 'socket' in k.lower() or 'ws' in k.lower()])
" 2>/dev/null
```

### Map module structure
```bash
# Every *.module.ts = a feature module
find . -name "*.module.ts" | grep -v node_modules | grep -v spec | sort

# Show what each module imports/exports (understand dependencies)
for f in $(find src/ -name "*.module.ts" | grep -v spec | grep -v node_modules); do
  echo "=== $f ===";
  grep -n "imports:\|controllers:\|providers:\|exports:" $f | head -10;
  echo;
done
```

### Find all API endpoints
```bash
# All controllers
find . -name "*.controller.ts" | grep -v node_modules | grep -v spec | sort

# Extract routes from each controller
for f in $(find src/ -name "*.controller.ts" | grep -v spec); do
  echo "=== $f ===";
  grep -n "@Controller\|@Get\|@Post\|@Put\|@Patch\|@Delete\|@All" $f;
  echo;
done

# Find all role/permission decorators
grep -rn "@Roles\|@Permissions\|@Public\|@UseGuards\|@SkipAuth" \
  src/ --include="*.ts" | grep -v spec | head -40
```

### Services (business logic)
```bash
find . -name "*.service.ts" | grep -v node_modules | grep -v spec | sort

# For a specific service, extract method signatures
grep -n "async\|public\|private\|protected" src/[module]/[module].service.ts 2>/dev/null | head -30
```

### DTOs (request/response shapes)
```bash
find . -name "*.dto.ts" | grep -v node_modules | sort

# Show validations on each DTO
for f in $(find src/ -name "*.dto.ts"); do
  echo "=== $f ===";
  grep -n "@Is\|@Min\|@Max\|@Length\|@Matches\|@IsEmail\|@IsEnum\|@IsOptional\|ApiProperty" $f;
  echo;
done
```

### Entities / Data models
```bash
# TypeORM
find . -name "*.entity.ts" | grep -v node_modules | sort
grep -rn "@Column\|@PrimaryGeneratedColumn\|@ManyToOne\|@OneToMany\|@ManyToMany\|@OneToOne" \
  src/ --include="*.ts" | grep -v node_modules | head -50

# Prisma
cat prisma/schema.prisma 2>/dev/null
ls prisma/migrations/ 2>/dev/null | tail -10

# Mongoose
find . -name "*.schema.ts" | grep -v node_modules | sort
grep -rn "@Prop\|SchemaFactory\|@Schema" src/ --include="*.ts" | head -30
```

### Auth & Guards
```bash
# Guards
find . -name "*.guard.ts" | grep -v node_modules | sort
cat src/auth/jwt.strategy.ts 2>/dev/null
cat src/auth/local.strategy.ts 2>/dev/null
cat src/auth/jwt-auth.guard.ts 2>/dev/null

# Passport strategies
grep -rn "PassportStrategy\|Strategy\|validate(" src/ --include="*.ts" \
  | grep -v node_modules | head -20

# JWT config
grep -rn "JwtModule\|JwtService\|sign(\|verify(\|expiresIn\|secret" \
  src/ --include="*.ts" | grep -v node_modules | grep -v spec | head -20
```

### Interceptors, Pipes, Filters (cross-cutting concerns)
```bash
find . -name "*.interceptor.ts" -o -name "*.pipe.ts" -o -name "*.filter.ts" \
  | grep -v node_modules | sort

# Global error filter
grep -rn "@Catch\|ExceptionFilter\|HttpException\|RpcException" \
  src/ --include="*.ts" | grep -v node_modules | head -20
```

### Config & environment
```bash
cat src/config/*.ts 2>/dev/null
cat src/app.module.ts 2>/dev/null | grep -A5 "ConfigModule\|envFilePath\|validationSchema"

# All env vars used
grep -rn "configService\.get\|process\.env\." src/ --include="*.ts" \
  | grep -v node_modules | grep -o "'[A-Z_]*'\|process\.env\.[A-Z_]*" | sort -u
```

### Swagger / OpenAPI (if present)
```bash
grep -rn "@ApiProperty\|@ApiOperation\|@ApiResponse\|@ApiTags\|@ApiBearerAuth" \
  src/ --include="*.ts" | grep -v node_modules -l 2>/dev/null | head -5

# Main swagger setup
grep -n "SwaggerModule\|DocumentBuilder\|addTag\|setTitle" src/main.ts 2>/dev/null
```

### Queues & background jobs
```bash
# Bull/BullMQ
find . -name "*.processor.ts" | grep -v node_modules | sort
grep -rn "@Process\|@Processor\|@InjectQueue\|Queue(" src/ --include="*.ts" | head -20

# Scheduled tasks
grep -rn "@Cron\|@Interval\|@Timeout\|@SchedulerRegistry" src/ --include="*.ts" | head -10
```

### Events & CQRS
```bash
grep -rn "@EventsHandler\|@CommandHandler\|@QueryHandler\|EventBus\|CommandBus" \
  src/ --include="*.ts" | grep -v node_modules | head -20
```

### WebSockets
```bash
find . -name "*.gateway.ts" | grep -v node_modules | sort
grep -rn "@WebSocketGateway\|@SubscribeMessage\|@MessageBody" \
  src/ --include="*.ts" | head -20
```

***

## Supabase

### Detect usage & client setup
```bash
cat package.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
print('supabase-js:', deps.get('@supabase/supabase-js','not found'))
print('ssr helper:', deps.get('@supabase/ssr','not found'))
print('auth-helpers:', deps.get('@supabase/auth-helpers-nextjs','not found'))
" 2>/dev/null

# Find all client initializations
grep -rn "createClient\|createBrowserClient\|createServerClient\|createRouteHandlerClient\|createServerComponentClient" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

### Database schema (migrations & types)
```bash
# Supabase CLI migrations
ls supabase/migrations/ 2>/dev/null | sort

# Read recent migrations (most recent = current state)
ls -t supabase/migrations/*.sql 2>/dev/null | head -5 | xargs -I{} sh -c 'echo "=== {} ==="; cat "{}"'

# Auto-generated types (best source of truth for tables/columns)
cat supabase/types.ts 2>/dev/null \
  || cat src/types/supabase.ts 2>/dev/null \
  || find . -name "database.types.ts" | grep -v node_modules | head -1 | xargs cat 2>/dev/null

# Seed data
cat supabase/seed.sql 2>/dev/null | head -60
```

### Row Level Security (RLS) policies
```bash
# Policies in migrations
grep -rn "CREATE POLICY\|ALTER TABLE.*ENABLE ROW\|USING\|WITH CHECK" \
  supabase/migrations/ 2>/dev/null | head -40

# Or in a dedicated policies file
cat supabase/policies.sql 2>/dev/null
```

### Database queries used in code
```bash
# .from() calls reveal which tables are queried
grep -rn "\.from(" . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep "supabase\|\.from('" | head -40

# .select() — what columns/relations are fetched
grep -rn "\.select(" . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | head -30

# .insert() .update() .delete() — write operations
grep -rn "\.insert(\|\.update(\|\.delete(\|\.upsert(" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -30

# RPC (stored procedures / functions)
grep -rn "\.rpc(" . --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | head -20
```

### Auth configuration
```bash
cat supabase/config.toml 2>/dev/null | grep -A50 "\[auth\]"

# Auth methods used in code
grep -rn "signInWithPassword\|signInWithOAuth\|signInWithOtp\|signInWithMagicLink\
\|signUp\|signOut\|resetPasswordForEmail\|updateUser\|verifyOtp" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -30

# OAuth providers configured
grep -rn "provider:\|google\|github\|facebook\|twitter\|apple\|azure\|discord" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -i "oauth\|provider" | head -10
```

### Storage buckets
```bash
# Bucket names and file operations
grep -rn "storage\.from\|\.upload(\|\.download(\|\.getPublicUrl\|\.createSignedUrl" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

# Bucket definitions in migrations
grep -rn "storage\.buckets\|insert.*buckets\|bucket_id" \
  supabase/migrations/ 2>/dev/null | head -10
```

### Edge Functions
```bash
ls supabase/functions/ 2>/dev/null
for f in $(ls supabase/functions/ 2>/dev/null); do
  echo "=== $f ===";
  head -30 supabase/functions/$f/index.ts 2>/dev/null;
  echo;
done
```

### Realtime subscriptions
```bash
grep -rn "\.channel(\|\.on(\|\.subscribe(\|REALTIME\|RealtimeChannel" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

### Supabase config & env vars
```bash
cat supabase/config.toml 2>/dev/null

# Env vars
grep -rn "SUPABASE_URL\|SUPABASE_ANON_KEY\|SUPABASE_SERVICE_ROLE\|NEXT_PUBLIC_SUPABASE" \
  . --include="*.ts" --include="*.tsx" --include=".env*" \
  | grep -v node_modules | grep -v ".env:" | head -20

cat .env.local 2>/dev/null | grep -i supabase
cat .env.example 2>/dev/null | grep -i supabase
```

### Combined Next.js + Supabase patterns
```bash
# Server Component client
grep -rn "createServerComponentClient\|createServerClient\|cookies()" \
  app/ src/app/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -20

# Route Handler client
grep -rn "createRouteHandlerClient\|createServerClient" \
  app/ src/app/ --include="route.ts" 2>/dev/null | head -10

# Client Component client
grep -rn "createBrowserClient\|createClientComponentClient" \
  . --include="*.tsx" | grep -v node_modules | head -10

# Auth session handling
grep -rn "getSession\|getUser\|auth\.getUser\|supabase\.auth\.getSession" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

# Middleware (session refresh)
grep -n "supabase\|createServerClient\|updateSession" middleware.ts src/middleware.ts 2>/dev/null
```

***

## Other Stacks

### Node.js / Express
```bash
find . -name "*.routes.js" -o -name "*.router.js" | grep -v node_modules
grep -rn "router\.\(get\|post\|put\|delete\|patch\)" src/ --include="*.js" | head -40
find . -name "*.model.js" -o -name "*.schema.js" | grep -v node_modules
```

### Python / Django
```bash
find . -name "urls.py" | grep -v ".git"
find . -name "views.py" -o -name "serializers.py" -o -name "models.py" | grep -v ".git"
grep -rn "permission_classes\|@login_required\|IsAuthenticated" . --include="*.py" | head -20
```

### Python / FastAPI
```bash
grep -rn "@app\.\|@router\." . --include="*.py" | grep -v ".git" | head -40
find . -name "schemas.py" -o -name "models.py" | grep -v ".git"
grep -rn "Depends\|Security\|OAuth2PasswordBearer" . --include="*.py" | head -20
```

### Java / Spring Boot
```bash
find . -name "*Controller.java" | grep -v test
grep -rn "@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping" \
  . --include="*.java" | grep -v test | head -40
find . -name "*Entity.java" | grep -v test
cat src/main/resources/application.yml 2>/dev/null
```

### Monorepo‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
```bash
ls apps/ packages/ services/ 2>/dev/null
cat turbo.json 2>/dev/null || cat lerna.json 2>/dev/null
cat package.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('workspaces:', d.get('workspaces'))" 2>/dev/null
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
