# WhisprX

Production-oriented FastAPI app for media upload, WhisperX transcription/alignment/diarization, multi-format exports, and optional summary generation through an OpenAI-compatible API.

## Features

- Upload video/audio files (`mp4`, `mov`, `mkv`, `mp3`, `wav`, `m4a`, ...)
- Auto-detect media type
- Video to MP3 conversion using FFmpeg
- WhisperX transcription + timestamp alignment
- Optional speaker diarization using WhisperX diarization pipeline
- Download outputs: `txt`, `srt`, `vtt`, `tsv`, `json`
- Optional summary generation (`short`, `detailed`, `bullet`, `action_items`)
- Async background job processing with progress polling
- Web UI for configuring model/language/device/diarization/summary/output formats

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

## Local Run (Virtual Environment First)

1. Install prerequisites:
- Python 3.11+
- FFmpeg
- `uv` (recommended): `pip install uv`

2. Create and activate a virtual environment with `uv`:

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

3. Install dependencies inside the virtual environment:

```bash
uv pip install -r requirements.txt
```

4. Configure environment variables:

```bash
cp .env.example .env
# set HF_TOKEN for diarization
# set LLM_API_BASE + LLM_API_KEY if summary is enabled
```

5. Run the app from the same virtual environment:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

6. Open `http://localhost:8000`

### Pip Fallback (if you do not use uv)

```bash
python -m venv .venv
```

Activate:
- PowerShell: `.venv\Scripts\Activate.ps1`
- macOS/Linux: `source .venv/bin/activate`

Install and run:

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

- `GET /api/config`
- `POST /api/jobs` (multipart upload + config fields)
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/download/{fmt}`

## WhisperX Flow

This implementation follows the official WhisperX flow:
1. `whisperx.load_model(...).transcribe(...)`
2. `whisperx.load_align_model(...)` and `whisperx.align(...)`
3. Optional `whisperx.DiarizationPipeline(...)`
4. `whisperx.assign_word_speakers(...)`

For diarization, set `HF_TOKEN` with access to required diarization models.

## Troubleshooting

### PyTorch 2.6+ `weights_only` error during diarization

If you see an error like:
- `Weights only load failed`
- `Unsupported global: omegaconf.listconfig.ListConfig`

the app now includes a compatibility fix in `app/services/transcription_service.py` for trusted WhisperX/pyannote checkpoints.

If you still hit the issue in an existing environment:

1. Reinstall dependencies in a clean virtual environment.
2. Ensure torch and whisperx dependencies are consistent.
3. As a temporary workaround, disable diarization in the UI.

If needed, you can also pin torch below 2.6:

```bash
uv pip install "torch<2.6"
```
