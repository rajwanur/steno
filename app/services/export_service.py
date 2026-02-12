from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


class ExportService:
    def _fmt_time(self, seconds: float, srt: bool = False) -> str:
        ms = int((seconds % 1) * 1000)
        total_seconds = int(seconds)
        hrs = total_seconds // 3600
        mins = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        sep = "," if srt else "."
        return f"{hrs:02d}:{mins:02d}:{secs:02d}{sep}{ms:03d}"

    def write_outputs(
        self,
        job_dir: Path,
        base_name: str,
        result: dict,
        output_formats: List[str],
    ) -> Dict[str, str]:
        files: Dict[str, str] = {}
        segments = result.get("segments", [])
        text = result.get("text", "").strip()
        if not text and segments:
            text = " ".join((seg.get("text", "").strip() for seg in segments)).strip()

        if "txt" in output_formats:
            p = job_dir / f"{base_name}.txt"
            p.write_text(text + "\n", encoding="utf-8")
            files["txt"] = str(p)

        if "json" in output_formats:
            p = job_dir / f"{base_name}.json"
            p.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            files["json"] = str(p)

        if "srt" in output_formats:
            p = job_dir / f"{base_name}.srt"
            with p.open("w", encoding="utf-8") as f:
                for i, seg in enumerate(segments, start=1):
                    speaker = seg.get("speaker")
                    prefix = f"[{speaker}] " if speaker else ""
                    line = seg.get("text", "").strip()
                    f.write(f"{i}\n")
                    f.write(
                        f"{self._fmt_time(seg.get('start', 0), srt=True)} --> {self._fmt_time(seg.get('end', 0), srt=True)}\n"
                    )
                    f.write(f"{prefix}{line}\n\n")
            files["srt"] = str(p)

        if "vtt" in output_formats:
            p = job_dir / f"{base_name}.vtt"
            with p.open("w", encoding="utf-8") as f:
                f.write("WEBVTT\n\n")
                for seg in segments:
                    speaker = seg.get("speaker")
                    prefix = f"[{speaker}] " if speaker else ""
                    line = seg.get("text", "").strip()
                    f.write(f"{self._fmt_time(seg.get('start', 0))} --> {self._fmt_time(seg.get('end', 0))}\n")
                    f.write(f"{prefix}{line}\n\n")
            files["vtt"] = str(p)

        if "tsv" in output_formats:
            p = job_dir / f"{base_name}.tsv"
            with p.open("w", encoding="utf-8") as f:
                f.write("start\tend\tspeaker\ttext\n")
                for seg in segments:
                    f.write(
                        f"{seg.get('start', 0):.3f}\t{seg.get('end', 0):.3f}\t{seg.get('speaker', '')}\t{seg.get('text', '').strip()}\n"
                    )
            files["tsv"] = str(p)

        return files
