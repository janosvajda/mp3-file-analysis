# MP3 File Analysis App

Speedy and tiny API that accepts an MP3 upload at `/file-upload` and responds with the MPEG Version 1 Layer III frame count.

## Setup

1. Copy the env template and edit values as needed:

```bash
cp .env.example .env
```

2. Install deps and start the server:

```bash
npm install
npm run dev   # start with tsx watch
# or
npm run build && npm start
```

## Local commands (root package.json)

- `npm run dev` – start Fastify in watch mode via tsx.
- `npm run build` – type-check/compile with TypeScript.
- `npm start` – run the compiled server from `dist`.
- `npm test` – run Vitest suite (unit + integration).
- `npm run lint` – ESLint with TypeScript config.
- `npm run format` – Prettier format all files.

## Samples and integration tests

- Sample MP3/MP2 files live in `samples/`.
- `tests/mp3Parser.integration.test.ts` exercises the parser against known-good (and known-bad) samples and asserts exact frame counts (e.g., SoundHelix, 3‑minute sample, tiny 2‑frame file, truncated files, and invalid `.mp2`).
- You can drop additional MP3s into `samples/` and wire them into the expectation map in that test to validate against MediaInfo values.
- Root `npm test` only runs the main app suite (deploy tests live in the `deploy/` package).

## Main requirements

Does the solution meet the requirements? (Does the solution correctly determine the number of frames in the MP3 file correctly?) - I tested it with different types of MP3 files and I compared the results with Medianfo logs, tried to cover edge-cases, but of course there might be an mp3 that will cause invalid result.

Does the solution handle errors appropriately? - Yes, both client errors and internal errors.

Is the code well-organised, readable, and maintainable? - I used Fastify, and its plugin mechanism. I tried to create a well roganised and clean code, that should be maintable.

Does the code follow TypeScript good practices? - I tried to use all neccessary and latest TypeScript features.

Does the solution include standardised tooling for formatting, linting, testing etc? - Yes, code is linted, and eslint can be run from the package json. I did not add Husky Git commit triggers, but easyli can be added later.

Is the solution scalable and able to handle large files? Is the solution optimised for performance - It uses Fastify multipart uploading that uses Node.js streams/ This provide a stream that pipe directly to the file system using pipeline(), and handles errors properly and uses memory efficiently. The app does not store the uploaded file.

Has the candidate used Git effectively? - I created PRs, waited until the created workflow was green and merged them. My PRs was mixed: bigger and smaller, tried to use good named branches and added descriptions.

## Logging

App uses and extends Fastify logger and logs warnings, infos and errors in terminal.

## Endpoint

- `POST /file-upload` with `multipart/form-data` and a single MP3 file field.
- Success response: (200) `{"frameCount": <number>}`
- Error response (400): `{"error": "<reason>"}`
- Error response (500): `Unexpected error`

## How to manual test locally and responses

Examples (curl):

You will need two terminal windows

First terminal window: `npm run dev`

Second terminal window (got to the dir where the project is checkouted):

- Upload: `curl -F "file=@samples/SoundHelix-Song-1.mp3;type=audio/mpeg" http://localhost:3000/file-upload`
- Upload with different sample: `curl -F "file=@samples/tiny2frames.mp3;type=audio/mpeg" http://localhost:3000/file-upload`
- No file upload (expect 400): `curl -X POST http://localhost:3000/file-upload`

- If the file is bigger than the limit: HTTP 400 {"error":"File too large."}
- Invalid mp3 file: HTTP 400 {"error":"Invalid MP3 file content."}

Postman: import `postman/MP3 File Analysis.postman_collection.json` and set:

- `baseUrl` (e.g., `http://localhost:3000`)
- `sampleFile` pointing to a local MP3

## Running automated tests -- it runs all unit and integration tests in root directory

```bash
npm test
```

Tests cover parser helpers, upload plugin, error handling, server wiring, and integration against the sample audio files. Deploy-layer tests live under `deploy/`.

## Scripts (package.json)

- `npm run dev` – start Fastify in watch mode via tsx.
- `npm run build` – type-check/compile with TypeScript.
- `npm start` – run the compiled server from dist.
- `npm test` – run Vitest suite (unit + integration).
- `npm run lint` – ESLint with TypeScript config.
- `npm run format` – Prettier format all files.

## CI

In .github directory there is a PR validation. It is simple, it runs type checking, all tests on the PR and fails if something went wrong.

GitHub Actions workflow `.github/workflows/pull-request.yml` runs on pull requests:

- Node matrix: 20, 22
- `npm ci` (clean install)
- `npm run build -- --noEmit` (type check)
- `npm test`

## Notes

- The app is fully tested (unit + integration) and documented in this README, inline comments, and Postman collection.
- Samples are versioned alongside tests to guard against regressions in parsing/counting.

## Remaining Tasks / Future Work

- Exercise the parser against a more wider variety of MP3s produced by different encoders/tools to harden validation.
- Succesfully deploy it to AWS, and might create a lambda + s3 and some messaging solution for huge files.
- Support big files (streaming, s3 )
- Adding caching
- Adding virus/malware scanning if this was a production used service
- Adding OpenAPI

## Deploy (CDK) --- not tested yet, please do not deploy it :)

- The content of deploy directory is only for me. Later I want to deploy it to my personal AWS account, this part in deploy directory has not been tested/deployed yet. I mention it to Readme, avoiding the confusions.

- CDK app lives in `deploy/` (separate package.json).
- Install deps there with `npm install` (inside `deploy/`), then:
  - `npm run synth` – synthesize the stack
  - `npm run diff` – compare against deployed stack
  - `npm run deploy` – deploy
  - `npm run test` – Vitest snapshot test for the stack template
  - `npm run snapshot:update` – update the stack snapshot
- Main stack file: `deploy/lib/mp3-file-analysis-stack.ts`
- Snapshot test: `deploy/test/mp3-file-analysis-stack.test.ts`
