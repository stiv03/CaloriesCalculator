# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Layout

Two-tier app in one repo:
- **Backend** (repo root): Spring Boot 3.3 / Java 17, Maven. Source under `src/main/java/com/stoyandev/caloriecalculator`. Runs on port `8080`.
- **Frontend** (`frontend/`): Create React App (react-scripts 3 + react-router-dom 6). Runs on port `3000`. Talks to backend via `axios` configured in `frontend/src/axiosConfig.js` with hardcoded base URL `http://localhost:8080/api/v1/`.

The backend's CORS config (`security/SecurityConfiguration.java`) only allows origin `http://localhost:3000` — the dev ports on both sides are baked in, change them together.

## Common Commands

Backend (run from repo root):
```bash
./mvnw spring-boot:run                          # start app on :8080
./mvnw test                                     # run all tests
./mvnw -Dtest=CalorieCalculatorApplicationTests test   # run a single test class
./mvnw -Dtest=ClassName#methodName test         # run a single test method
./mvnw clean package                            # build jar (target/calories-0.0.1-SNAPSHOT.jar)
```

Frontend (from `frontend/`):
```bash
npm install
npm start                                       # CRA dev server on :3000
npm test                                        # CRA Jest watcher
npm run build
```
The CRA scripts pass `--openssl-legacy-provider` because react-scripts is pinned to v3 on a modern Node — don't drop that flag.

## Database

PostgreSQL is required. Connection details are in `src/main/resources/application.properties`:
- URL: `jdbc:postgresql://localhost:5432/first_test`
- User/pass: `codeninjas` / `121222tu` (committed in plaintext — note this if changing auth)
- `spring.jpa.hibernate.ddl-auto=update` — Hibernate auto-migrates the schema on boot. There are no Flyway/Liquibase scripts; entity changes apply directly.

## Architecture

### Backend layering
Standard Spring layered structure under `com.stoyandev.caloriecalculator`:
- `controller/` — REST endpoints, all under `/api/v1/...`
- `service/` (interfaces) + `service/implementations/` — business logic. Note `GoalServiceImp` is a concrete class without an interface (the rest follow the interface+impl split).
- `repository/` — Spring Data JPA repositories
- `entity/` + `entity/enums/` — JPA entities
- `dto/` — request/response records and DTOs
- `mapper/` — static mapper classes (`UserMapper.mapToUserDTO(...)`, etc.) used to convert entities ↔ DTOs. No MapStruct.
- `exception/` — `ResourceNotFoundException` is the standard "not found" throw across services
- `security/` — see below

Lombok is used heavily (`@Data`, `@Builder`, `@AllArgsConstructor`, `@RequiredArgsConstructor`); the spring-boot-maven-plugin excludes Lombok from the repackaged jar.

### Security model
- JWT-based auth implemented in `security/`. `AuthenticationController` exposes `/api/v1/auth/register` and `/api/v1/auth/login` (the only `permitAll` endpoints — everything else requires auth).
- `JwtService` is **all-static** with a JVM-lifetime `SECRET_KEY = Keys.secretKeyFor(HS256)` generated at class load. This means **every backend restart invalidates all existing tokens** and tokens are not portable across instances. Don't be surprised when auth breaks after a restart in dev. Token TTL is `1000 * 60 * 48` ms (~48 seconds, almost certainly meant to be 48 minutes — verify before changing).
- `JwtAuthenticationFilter` runs before `UsernamePasswordAuthenticationFilter`, reads `Authorization: Bearer ...`, and populates `SecurityContextHolder`.
- `ApplicationConfig` provides `BCryptPasswordEncoder`, `DaoAuthenticationProvider` wired to a `UserDetailsService` that loads `Users` (which itself implements `UserDetails`).
- **Per-user authorization** is enforced via `@PreAuthorize("@userAccessService.hasAccess(#userId)")` (see `security/service/UserAccessService.java`). It compares the path's `userId` against the authenticated principal's username. `UserMealsController` uses this on every endpoint; `UserController` and `GoalController` mostly do not — when adding new user-scoped endpoints, mirror the `UserMealsController` pattern.

### Domain model
- `Users` (entity) = the user account *and* `UserDetails` for Spring Security. Holds current `weight`, `height`, `age`, plus `Status` (bulk/cut/maintain variants) and `Activity` (5 levels) enums that drive calorie calculations.
- `Goal` is a `@OneToOne` with `Users` — daily calorie/macro targets. Created with zeros at registration time (see `AuthenticationService.register`).
- `UserMeals` records each consumed product (entity + product + grams + `consumedAt` timestamp). `UserMealsServiceImpl.calculateDailyMacros` aggregates these per-day, scaling each product's per-100g macros by quantity.
- `WeightRecord` and `MeasurementsRecord` are time-series logs. `updateWeight` upserts into `WeightRecord` keyed by `(userId, today)` so multiple same-day updates overwrite that day's row, while also syncing the snapshot on `Users`.
- `Status` and `Activity` enums use **integer codes** (`Status.fromCode(int)`, `Activity.fromCode(int)`) — the relevant `PUT` endpoints accept the raw int code in the body, not the enum name.

### Goal auto-calculation
`GoalServiceImp.autoSetGoal` derives daily macros from the user's body stats:
- BMR via the Mifflin-St Jeor formula (`10*weight + 6.25*height - 5*age + 5`)
- Activity multiplier (1.2 → 1.9 across MINIMAL → VERY_HIGH)
- Calorie surplus/deficit added per `Status` (e.g. `NORMAL_BULK` = +450, `FAST_CUT` = -700)
- Protein = `2.2 * weight`, fat = 20% of calories / 9, carbs = remainder / 4

### Frontend
Single-page React app, no Redux/state library. Routing in `App.js`:
- `/register`, `/login`, `/calories-calculator`, `/user-profile` (default redirect `/` → `/register`)
- Auth state lives in `localStorage` under keys `jwtToken` and `userId` (see `utils/auth.js`)
- All HTTP goes through the shared `axios` instance in `axiosConfig.js`, which auto-injects `Authorization: Bearer <jwtToken>` on every request *except* paths containing `/auth/`
- Charts use `chart.js` + `react-chartjs-2`; circular goal display uses `react-circular-progressbar`

## Things to know when editing

- The backend prints/uses Bulgarian comments in places (e.g. `AuthenticationService.register`) — fine to keep or replace, but don't be confused by them.
- `ddl-auto=update` will not drop columns; renaming/removing entity fields requires manual SQL on the dev DB.
- `target/` is checked in (compiled `.class` files appear in `git status`). Avoid committing further `target/` churn; consider `./mvnw clean` before staging if it gets noisy.
- There is exactly one Spring test (`contextLoads`); there is no real test suite to lean on. New features are unverified by CI.