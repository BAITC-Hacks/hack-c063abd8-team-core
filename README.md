# Career Quest

An employee development navigator for the HackAlem AI Halyk Bank track. Includes explainable recommendations, career trajectories, voluntary activities, skill updates, a development journal, HR analytics and jury-data imports.

## Run

Requires Node.js 22+. No package installation or frontend build is needed.

```sh
npm start
```

In Windows PowerShell use `npm.cmd start` if script execution is disabled. Open **http://127.0.0.1:3000**.

| Workspace | Username | Default password |
| --- | --- | --- |
| Employee, E0028 (Akmaral Ismailova in the supplied dataset) | `employee` | `grow-together` |
| HR specialist | `hr` | `support-growth` |

`EMPLOYEE_ID` can map the demo employee login to another profile. Account labels come from the loaded data. Custom passwords are required when binding outside loopback.

## Supplied dataset

The provided `career_quest_dataset.zip` has been extracted to **data/source/** and loaded into **data/state.json**. The original archive is unchanged. Previous application state is backed up under **data/backups/**. Source records, working state and backups are Git-ignored.

- 200 employees across 8 roles
- 40 activities, including mandatory processes
- 60 skills and 32 role/grade requirement profiles
- 2,743 participation records
- Snapshot date: **2026-10-01**, used as the application's reference date

On first launch without state, the server loads `data/source/` if available, otherwise generates the original demo dataset. `DATASET_MODE=demo` explicitly chooses generated data when no state exists. Existing state always takes precedence.

To replace the complete dataset again, stop the server, extract the four starter-kit data files into `data/source/`, then run:

```sh
npm run import:dataset
npm start
```

An alternate extracted directory can be supplied: `npm run import:dataset -- /path/to/dataset`. This offline command validates first, backs up existing state, and atomically replaces it. Never run the offline migration against a running server; use the HR import screen for live updates.

The HR screen accepts the original `employees.json`, `events.json`, `skills.json` and `activity_history.csv` files together, as well as combined JSON and individual profile/history uploads. It preserves wrappers, metadata, role profiles and proficiency descriptions. Validate is a dry run; applying checks the dataset revision. Profiles/events/skills merge by ID. History replaces records for employees represented in the uploaded history file. An empty history file leaves existing history unchanged.

The HR export is a normalized application snapshot, including assessment baselines and original fields, and can be reimported without double-counting gains. Additional original-format jury profiles and history work without schema conversion. The fixture `fixtures/jury-profiles.json` is an example compatible with the supplied catalog.

## OpenAI and local AI

The server supports OpenAI, local Ollama, or explicit multi-factor rules. API keys are read only by the server and never returned to the browser or included in source code.

To configure a replacement key locally, copy `.env.example` to `.env`, enter the key in `OPENAI_API_KEY`, and restart:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your-new-key
OPENAI_MODEL=gpt-4.1-mini
```

Do not commit `.env` or paste keys into chat. Environment variables take precedence over `.env`. A key supplied only through the server process environment is temporary and must be configured again after that process exits.

OpenAI mode uses the [Responses API with Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). The default [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) supports structured output; `OPENAI_MODEL` is configurable. The model chooses 1-3 activities from a validated shortlist. Returned IDs, uniqueness and explanation length are checked again in application code. Model prose is explicitly separated from deterministic evidence and may still contain mistakes.

**Data flow:** OpenAI mode sends role, grade, tenure, career goal, work format, current skills, candidate activities and history-derived evidence to `api.openai.com`. Employee names, employee IDs, manager IDs and raw participation records are excluded. Requests use `store: false`; this is not a claim of zero retention. Use this provider only where the hackathon's data rules permit that processing. No API key is required for local rules.

For local-only inference, run Ollama with an installed local model and configure:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=your-installed-model
OLLAMA_URL=http://127.0.0.1:11434
```

Ollama URLs are restricted to loopback and redirects are rejected. Use a local model rather than a cloud-backed Ollama model. For rules only, set `AI_PROVIDER=rules`. Without an explicit provider, a configured OpenAI key selects OpenAI, otherwise an Ollama model selects Ollama, otherwise rules are used.

Requests have an eight-second timeout. Missing credentials, errors, quota limits, incomplete output or invalid model selections produce a visible rules fallback, never a false AI success label. Successful recommendations are cached for five minutes per employee and dataset revision; data changes invalidate the cache. Model performance and the 10-second recommendation target must be verified with the selected model and deployment network.

## Dataset semantics and recommendations

- **Assessment reconciliation:** original `skills` are stored as `assessed_skills`. Completed history records strictly after `last_review_date`, up to the dataset snapshot, are applied in chronological order using each activity's gains and caps. Re-import reconstructs from the assessment baseline, preventing double counting. Same-day review records are treated as already assessed. The source records session/enrollment dates, not exact completion timestamps; reconciliation uses the supplied `date` as the available proxy. Unknown on-time performance is not invented.
- **Career targets:** explicit `career_goal.target_role/target_grade` takes precedence. Without a goal, the next grade in the current role is used. Lead without a goal has no fabricated next grade. Missing skills have level 0. `role_profiles.required_skills` and `critical_skills` define the actual target, including career changes.
- **Eligibility:** mandatory activities are excluded from recommendations and the voluntary catalog. The current role and grade must match the activity audience, all prerequisites must be met, and scheduled activities need an upcoming session (or an existing enrollment). Career-change goals do not bypass audience restrictions.
- **Completion:** completed activities cannot be repeated, except recurring `EV_036` (Public Speaking Club). Each recurring session needs a separate enrollment and cannot be credited twice. In-progress source records appear in My plan; voluntarily leaving them is preserved through later reconciliation.
- **Ranking:** considers target-gap closure, gap size, critical skill importance, relevant completions and dropouts/no-shows/declines, historical success with the actual online/offline/self-paced format, and effort. Completed non-recurring events are excluded. The model selects from the best eligible candidates and explains tradeoffs. Remote workers are warned when a suggested event is in person.

The deterministic score is `12 * gap_closure + 4 * gap_weighted_closure + 3 * format_completion_rate + min(relevant_completions, 3) - 5 * relevant_skips - 0.4 * hours`. Gap-weighted closure doubles the weight of critical skills. A new format starts with a neutral completion rate of 0.5.

```text
new_level = max(current, min(5, activity.max_level, current + activity.gain))
readiness = round(100 * sum(min(current, target)) / sum(target))
```

Skills with no target do not increase the readiness denominator. Readiness is a development guide, not a promotion decision. Individual skill gaps and critical requirements remain visible. The interface is English; source language preferences are preserved, but RU/KK localization is not implemented.

Completion is **self-reported for the demo** and immediately updates skill levels, including for a selected future session; it is not proof of real attendance. A production deployment should verify completion through the learning system. The snapshot clock remains fixed for reproducible hackathon evaluation.

## HR, privacy and persistence

HR sees aggregate skill gaps and private, alphabetical employee profiles, never a public employee leaderboard. Support prompts mean repeated no-shows/declines in 90 days or no recent completion, relative to the snapshot. They are not employee performance or attrition predictions. All statuses, including in-progress, dropped and overdue, are retained in the journal.

Employee/HR permissions are enforced by server routes. Employees cannot request another employee's profile; only HR may import/export data or see team analytics. Cookies are HTTP-only and SameSite=Strict with eight-hour sessions. Cross-origin mutations are rejected and login attempts are rate-limited. Sessions end on server restart. State is stored using atomic JSON file replacement in a single server process.

| Variable | Default |
| --- | --- |
| `HOST`, `PORT` | `127.0.0.1`, `3000` |
| `STATE_FILE` | `data/state.json` |
| `DATASET_DIR` | `data/source` |
| `EMPLOYEE_ID` | `E0028` |
| `EMPLOYEE_PASSWORD`, `HR_PASSWORD` | Demo passwords above |
| `COOKIE_SECURE` | Set `true` behind HTTPS |
| `AI_PROVIDER` | Automatic selection described above |
| `OPENAI_API_KEY` | Unset |
| `OPENAI_MODEL` | `gpt-4.1-mini` |
| `OLLAMA_MODEL` | Unset |
| `OLLAMA_URL` | `http://127.0.0.1:11434` |

This remains a hackathon prototype with two demo accounts. Production use needs SSO, a durable database, audit storage, encrypted-at-rest storage, HTTPS and verified learning-system completion. No real personal data should be loaded.

## Verification

```sh
npm test
npm run check
```

Tests cover permissions, persistence, adversarial ranking, original starter-kit wrappers, role/critical requirements, cross-role goals, prerequisites, scheduled/mandatory/recurring activities, post-review gain reconciliation, idempotent imports, CSV, OpenAI request/response validation and local-model fallback. The full supplied-data regression runs when `data/source/` is available; portable fixtures cover its schema independently. Automated AI tests use mocked responses and do not spend API credits.

| Path | Responsibility |
| --- | --- |
| `server.js` | API, authentication, permissions, persistence, caching |
| `lib/domain.js` | Eligibility, scoring, growth, HR aggregates, validation |
| `lib/dataset.js`, `lib/dataset-loader.js` | Starter-kit adapter and assessment reconciliation |
| `lib/ai.js` | OpenAI / Ollama selection and validated fallback |
| `scripts/import-dataset.js` | Backed-up offline dataset replacement |
| `public/` | Responsive web UI |
| `test/` | Regression tests |
| `.env.example` | Server configuration template, no credentials |
