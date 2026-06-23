from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from PyQt6.QtCore import QThread, pyqtSignal

try:
    import serial
except ImportError:  # pyserial 為選配：無則只回報離線
    serial = None

_SERIAL_AVAILABLE = serial is not None and hasattr(serial, "Serial") and hasattr(serial, "SerialException")
_SerialException = getattr(serial, "SerialException", Exception) if serial is not None else Exception


@dataclass(frozen=True)
class SerialConfig:
    baudrate: int = 115200
    timeout: float = 0.2


class SerialReaderThread(QThread):
    data_received = pyqtSignal(str, str)
    status_changed = pyqtSignal(str, str)

    def __init__(self, port: str, config: Optional[SerialConfig] = None) -> None:
        super().__init__()
        self._port = port
        self._config = config or SerialConfig()
        self._running = True
        self._serial: serial.Serial | None = None

    @property
    def port(self) -> str:
        return self._port

    def stop(self) -> None:
        self._running = False
        self._close_serial()

    def _close_serial(self) -> None:
        if not self._serial:
            return
        if not self._serial.is_open:
            self._serial = None
            return
        try:
            self._serial.close()
        except AttributeError:
            pass
        except Exception:
            pass
        finally:
            self._serial = None

    def run(self) -> None:
        if not _SERIAL_AVAILABLE:
            self.status_changed.emit(self._port, "offline")
            return

        try:
            self._serial = serial.Serial(
                self._port,
                self._config.baudrate,
                timeout=self._config.timeout,
            )
            self.status_changed.emit(self._port, "ready")
        except _SerialException:
            self.status_changed.emit(self._port, "offline")
            return

        while self._running:
            try:
                line = self._serial.readline()
            except _SerialException:
                self.status_changed.emit(self._port, "offline")
                break

            if not line:
                continue

            try:
                text = line.decode("utf-8", errors="replace").strip()
            except UnicodeDecodeError:
                text = ""

            if text:
                self.data_received.emit(self._port, text)

        self.status_changed.emit(self._port, "offline")
        self._close_serial()
