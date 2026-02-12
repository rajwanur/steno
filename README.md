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

## Local Run

1. Install FFmpeg and Python 3.11+
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment:

```bash
cp .env.example .env
# set HF_TOKEN for diarization
# set LLM_API_BASE + LLM_API_KEY if summary is enabled
```

4. Start server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

5. Open `http://localhost:8000`

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
