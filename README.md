# Steno

Steno is a FastAPI-based transcription workspace built on WhisperX. It supports audio/video upload, alignment, optional diarization, multiple export formats, and AI summary generation through an OpenAI-compatible API.

## Current Status

- Active and usable for local/self-hosted deployment.
- UI supports:
  - per-generation overrides before processing
  - persisted global defaults in the Settings modal
  - summary generation/regeneration
  - direct summary export as Markdown (`.md`)
- Job history is persisted on disk and reloads across restarts.

## Key Features

- Upload audio/video files (`mp3`, `wav`, `m4a`, `mp4`, `mov`, `mkv`, etc.)
- Auto-detect media type and convert video to MP3 via FFmpeg
- WhisperX transcription + timestamp alignment
- Optional speaker diarization (requires Hugging Face token)
- Output export formats: `txt`, `srt`, `vtt`, `tsv`, `json`
- Optional AI summaries: `short`, `detailed`, `bullet`, `action_items`
- Async queue-based background processing
- In-UI job history, progress, logs, and output preview
- Global settings persisted in `storage/global_settings.json`

## Tech Stack

- Python 3.11+
- FastAPI + Uvicorn
- WhisperX
- OpenAI Python SDK (OpenAI-compatible endpoints)
- Jinja2 + Tailwind CSS
- FFmpeg

## Project Structure

```text
.
├── app
│   ├── api
│   │   └── routes.py
│   ├── core
│   │   └── logging.py
│   ├── services
│   │   ├── export_service.py
│   │   ├── file_service.py
│   │   ├── global_settings_service.py
│   │   ├── job_service.py
│   │   ├── summarization_service.py
│   │   └── transcription_service.py
│   ├── utils
│   │   └── media.py
│   ├── config.py
│   ├── main.py
│   └── schemas.py
├── static
│   ├── app.js
│   └── styles.css
├── templates
│   └── index.html
├── storage
│   ├── jobs
│   └── uploads
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Installation

### 1. Prerequisites

- Python 3.11+
- FFmpeg available on PATH
- Git
- Recommended: `uv`

Install `uv` (if missing):

```bash
pip install uv
```

### 2. Create and Activate Virtual Environment

```bash
uv venv .venv
```

PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
uv pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Set at least the values you need:

- `HF_TOKEN` (required only if diarization is enabled)
- `LLM_API_BASE`, `LLM_API_KEY`, `LLM_MODEL` (required only if summaries are enabled)

### 5. Run

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000`.

## Configuration Reference (`.env`)

| Variable | Purpose | Required |
|---|---|---|
| `APP_HOST` | Uvicorn host bind | No |
| `APP_PORT` | Uvicorn port | No |
| `APP_RELOAD` | Auto reload in dev | No |
| `DEFAULT_MODEL` | Default WhisperX model | No |
| `DEFAULT_LANGUAGE` | Default language code | No |
| `DEFAULT_BATCH_SIZE` | Default batch size | No |
| `DEFAULT_DEVICE` | `auto`, `cpu`, `cuda` | No |
| `COMPUTE_TYPE` | `float32`, `float16`, `int8` | No |
| `HF_TOKEN` | Hugging Face auth for diarization | If diarization enabled |
| `LLM_API_BASE` | OpenAI-compatible base URL | If summaries enabled |
| `LLM_API_KEY` | LLM API key | If summaries enabled |
| `LLM_MODEL` | Model name for summaries | If summaries enabled |

Note: many defaults can also be managed from the UI Settings modal. UI values are persisted to `storage/global_settings.json`.

## Docker

Build and run:

```bash
docker compose up --build
```

The service is exposed at `http://localhost:8000` and persists data to `./storage`.

## API Endpoints

- `GET /api/config`
- `GET /api/settings/global`
- `PUT /api/settings/global`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/output/{fmt}`
- `GET /api/jobs/{job_id}/download/{fmt}`
- `GET /api/jobs/{job_id}/summary/export` (download AI summary as `.md`)
- `POST /api/jobs/{job_id}/summary`
- `POST /api/jobs/{job_id}/cancel`
- `POST /api/queue/clear`
- `DELETE /api/jobs/{job_id}`

## Operational Notes

- Prefer `device=auto` unless your GPU runtime is validated.
- On many Windows AMD setups, CPU is the most stable option.
- Diarization may fail without a valid HF token or model access.
- `torchaudio` deprecation warnings can appear in logs; they are warnings and do not necessarily indicate job failure.

## License

MIT
