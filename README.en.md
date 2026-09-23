# Career Quest

**Language:** **English (EN)** | [Русский (RU)](README.md) | [Қазақша (KZ)](README.kz.md)

## Problem and audience

Career Quest is an employee development navigator for the HackAlem AI Halyk Bank track. It helps employees understand which skills they need for their career goal and choose suitable learning activities. HR can inspect team skill gaps and individual development profiles in a separate workspace.

## What is implemented

- Personal skill map, target role/grade, readiness indicator and development journal.
- Up to three recommendations with evidence about skill gaps, activity gains, participation history, format and effort.
- A voluntary activity catalog, personal plan, enrollment, withdrawal and completion with capped skill updates.
- Role, grade, prerequisite and session checks; duplicate completions do not receive repeated credit or distort completion analytics.
- Automatic catalog supplementation with clearly labeled self-study tasks when existing activities cannot cover a development path; HR can inspect the coverage report.
- HR team analytics, employee previews, validated JSON/CSV imports, dataset export and full backup/restore.
- English, Russian and Kazakh interface selection, responsive layouts and links to individual screens.

## How it works

1. The server loads saved state, or reads employee profiles, skill requirements, activities and participation history from the supplied dataset.
2. It compares current skills with an explicit career goal, or the next grade of the current role, and identifies gaps and critical requirements.
3. Rules filter available voluntary activities and rank their expected contribution. Optional AI selects and explains activities from this checked shortlist; otherwise the rules provide recommendations directly.
4. The employee reviews the evidence, joins an activity and marks it completed. The app updates skills within activity caps, records the action and refreshes the development path.
5. HR reviews aggregate gaps and profiles. At startup and after saved changes, catalog checks can add proposed self-study tasks without automatically changing employees' skills or history.

## Technologies

| Component | Technology used in this repository |
| --- | --- |
| Server | JavaScript ES modules, Node.js 22+, built-in HTTP and filesystem APIs |
| Browser | HTML, CSS and vanilla JavaScript; no frontend framework or build step |
| Storage | JSON application state; JSON and CSV imports |
| Recommendations | Deterministic scoring; optional OpenAI Responses API or local Ollama |
| OpenAI model | `gpt-4.1-mini` by default; configurable through `OPENAI_MODEL` |
| Ollama model | User-installed model selected through `OLLAMA_MODEL`; none bundled |
| Tests | Built-in Node.js test runner (`node --test`) |

`package.json` declares no external npm dependencies. AI services are optional; the rules mode needs neither an API key nor a model download.

## Architecture

```text
Browser (public/) <-> Node.js HTTP API (server.js) <-> data/state.json
                            |
                  domain rules + dataset adapters
                            |
                  catalog coverage checks
                            |
                  optional OpenAI / local Ollama
```

| Path | Responsibility |
| --- | --- |
| `server.js` | Authentication, employee/HR permissions, API, persistence and recommendation cache |
| `lib/domain.js` | Career targets, eligibility, ranking, progress, analytics and import validation |
| `lib/dataset.js`, `lib/dataset-loader.js` | Source format adaptation and assessment/history reconciliation |
| `lib/catalog-repair.js` | Detect missing learning paths and generate proposed practice tasks |
| `lib/ai.js` | Provider requests, model response validation and rules fallback |
| `public/` | Screens, components, routing and EN/RU/KZ translations |
| `scripts/import-dataset.js`, `test/` | Offline dataset replacement and regression tests |

## Installation and startup

1. Install **Node.js 22 or newer** and Git, then open a terminal.
2. Obtain the project and enter its directory:

   ```sh
   git clone https://github.com/BAITC-Hacks/hack-c063abd8-team-core.git
   cd hack-c063abd8-team-core
   node --version
   ```

3. Start the server. No `npm install` or frontend build is required:

   ```sh
   npm start
   ```

4. Open **http://127.0.0.1:3000**. Stop the server with **Ctrl+C**.

In Windows PowerShell, use `npm.cmd start` if `npm` scripts are blocked; the same substitution works for the other npm commands below. A fresh clone starts in rules mode if no provider is configured. Existing environment variables or `.env` settings can select another mode.

| Workspace | Username | Default password |
| --- | --- | --- |
| Employee (profile `E0028`) | `employee` | `grow-together` |
| HR specialist | `hr` | `support-growth` |

`EMPLOYEE_ID` can select another employee profile. `HOST` and `PORT` default to `127.0.0.1` and `3000`. Binding to another network interface requires explicit `EMPLOYEE_PASSWORD` and `HR_PASSWORD` values.

### Optional AI configuration

If `.env` does not exist, copy `.env.example` to `.env` in the project root (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in a Unix shell). Keep any existing configuration. Edit the file locally and restart the server:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4.1-mini
```

For local Ollama, run an installed model and set `AI_PROVIDER=ollama`, `OLLAMA_MODEL` to its name and `OLLAMA_URL=http://127.0.0.1:11434`. The application accepts only loopback Ollama URLs. Set `AI_PROVIDER=rules` to explicitly disable model requests. Environment variables take precedence over `.env`.

Keys stay on the server. `.env`, working state and backups are Git-ignored. Model requests have an eight-second timeout; failures or invalid answers produce a visible rules fallback.

## A reproducible jury walkthrough

Use **EN** to follow these button labels. The scenario changes saved progress; download a full backup first if you need to preserve an existing demonstration state.

1. Sign in as `employee`. Open **My growth path** and compare current skill levels with targets. Return to **Overview**, open **Why this step?** on a recommendation and inspect the evidence and predicted gains.
2. Choose **Add to my plan** or **Join activity**. Find it under **Explore activities → My plan**, open its details and select **Mark as completed**. Check the new journal entry and updated skill levels. Completion is self-reported in this demo.
3. Switch between **EN / RU / KZ** and refresh the page to check that the chosen language and saved progress persist.
4. Sign out and sign in as `hr`. Inspect **Team overview**, the catalog coverage report and an employee profile preview.
5. With the supplied catalog loaded, open **Data workspace**, select `fixtures/jury-profiles.json` and click **Validate files**. Review the preview, then **Import validated data**. Find `JURY01`, `JURY02` and `JURY03` in the team list. They add three profiles if those IDs were not already present.
6. Use **Download full backup**. To test restoration, select that file, validate it and read the replacement notice before choosing **Restore full backup**: this replaces the current dataset and personal plans.

Run the automated checks separately:

```sh
npm test
npm run check
```

Tests cover domain rules, imports, permissions, AI request/response validation, language behavior, import races, backups and catalog supplementation. AI tests use mocked responses and do not spend API credits; supplied-data tests run when `data/source/` is available.

The [supplied-dataset regression](test/catalog-repair.test.js) checks that supplementation reduces employees with skill gaps but no recommendation from **30 to 0**, without changing assessments or history. This measures catalog coverage in the fixture, not learning effectiveness.

## Data and integrations

The supplied synthetic dataset in `data/source/` contains **200 employees across 8 roles, 40 original activities, 60 skills, 32 role/grade profiles and 2,743 participation records**, with snapshot date **2026-10-01**. Inputs are `employees.json`, `events.json`, `skills.json` and `activity_history.csv`; descriptions are in [data/source/README.md](data/source/README.md). Generated practice tasks increase the working catalog without modifying these source files.

Existing `data/state.json` always takes precedence. Without it, the server loads the supplied files if available, otherwise generates demo data. To replace state from the source dataset, **stop the server**, run `npm run import:dataset`, then `npm start`. The offline importer backs up existing state under `data/backups/` before replacement. An alternate directory can be passed as `npm run import:dataset -- /path/to/dataset`.

Live HR imports support JSON/CSV, including the four starter-kit files together. Profiles, events and skills merge by ID; uploaded history replaces history for employees represented in that file. Preview validation must precede application and is bound to the payload, session and data revision. **Download current dataset** exports collections for merging and excludes personal plans. **Download full backup** also preserves enrollments, withdrawals and saved skill levels; restoration replaces all application data and rechecks catalog coverage. Credentials and login sessions are not part of a backup.

OpenAI mode sends role, grade, tenure, career goal, work format, skills and candidate activity evidence to `api.openai.com`, excluding employee names, employee IDs, manager IDs and raw history. Requests use `store: false`. Use this mode only when external processing is permitted. Rules operate locally; Ollama inference depends on the locally configured model. There is no integration with a real bank HR system or learning management system.

## Current limitations

- This is a hackathon prototype with two demo accounts, not an SSO-enabled production service. Sessions are kept in memory and end when the server restarts.
- Storage is a JSON file in one server process; there is no database, multi-instance coordination or production audit system.
- Completion is self-reported and immediately updates skills, including for a chosen future session. Attendance and real learning outcomes are not verified.
- Automatically added tasks are proposed self-study instructions, not provider-verified courses. Catalog coverage does not prove educational effectiveness.
- The supplied snapshot date is fixed. Readiness is a guide based on configured skill requirements, not a promotion decision; HR support signals are not performance or attrition predictions.
- AI explanations can be wrong; availability and latency depend on the chosen provider. Custom imported text and some technical validation details may remain in their original language.
- Import requests are limited to 8 MB. Public deployment still requires appropriate HTTPS, authentication and data-protection configuration.

## Deployed version

No public deployment URL is documented in this repository. The verified startup entry point is the local application at **http://127.0.0.1:3000**.
