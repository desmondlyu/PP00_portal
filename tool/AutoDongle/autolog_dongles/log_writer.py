from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Dict, TextIO


@dataclass(frozen=True)
class LogEntry:
    timestamp: datetime
    port: str
    status: str
    raw_data: str


class LogWriter:
    def __init__(self, log_dir: Path) -> None:
        self._log_dir = log_dir
        self._lock = Lock()
        self._file_handles: Dict[str, TextIO] = {}

    @property
    def log_dir(self) -> Path:
        return self._log_dir

    def _ensure_file(self, port: str) -> TextIO:
        file_handle = self._file_handles.get(port)
        if file_handle and not file_handle.closed:
            return file_handle

        self._log_dir.mkdir(parents=True, exist_ok=True)
        file_path = self._log_dir / f"{port}_log.txt"
        file_handle = file_path.open("w", encoding="utf-8", newline="")
        self._file_handles[port] = file_handle
        return file_handle

    def write(self, entry: LogEntry) -> None:
        with self._lock:
            file_handle = self._ensure_file(entry.port)
            raw_data = entry.raw_data
            if raw_data and not raw_data.endswith("\n"):
                raw_data += "\n"
            file_handle.write(raw_data)
            file_handle.flush()

    def close(self) -> None:
        for file_handle in self._file_handles.values():
            if not file_handle.closed:
                file_handle.close()
        self._file_handles.clear()
