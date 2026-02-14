from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Literal

from fastapi import UploadFile

from app.config import settings
from app.utils.media import detect_media_type


class FileService:
    async def save_upload(self, file: UploadFile, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)

    def get_media_type(self, path: Path) -> Literal["audio", "video"]:
        return detect_media_type(path)

    async def ensure_audio_mp3(
        self,
        source_path: Path,
        job_dir: Path,
        media_type: Literal["audio", "video"],
    ) -> Path:
        if media_type == "audio":
            return source_path
        target = job_dir / "input.mp3"
        await asyncio.to_thread(self._convert_video_to_mp3, source_path, target)
        return target

    def _convert_video_to_mp3(self, src: Path, target: Path) -> None:
        cmd = [
            settings.ffmpeg_binary,
            "-y",
            "-i",
            str(src),
            "-vn",
            "-acodec",
            "libmp3lame",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-b:a",
            "192k",
            str(target),
        ]
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg conversion failed: {proc.stderr}")
