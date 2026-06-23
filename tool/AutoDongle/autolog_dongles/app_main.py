from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict

from PyQt6.QtCore import QTimer
from PyQt6.QtWidgets import QApplication

from .auto_summary import run_auto_summary
from .device_scanner import diagnostic_report, list_all_ports, scan_devices
from .log_writer import LogEntry, LogWriter
from .models import PortStatus
from .serial_reader import SerialReaderThread
from .ui_main_window import MainWindow


@dataclass
class ReaderBundle:
    thread: SerialReaderThread


class AppController:
    def __init__(self, window: MainWindow) -> None:
        self._window = window
        self._readers: Dict[str, ReaderBundle] = {}
        self._log_writer = LogWriter(self._build_log_dir())

        self._window.start_requested.connect(self.start)
        self._window.stop_requested.connect(self.stop)
        self._window.clear_requested.connect(self.clear)
        self._window.summary_requested.connect(self.run_summary)
        self._window.open_log_dir_requested.connect(self.open_log_dir)

    def _build_log_dir(self) -> Path:
        return Path.cwd() / "logs"

    def open_log_dir(self) -> None:
        log_dir = self._build_log_dir()
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            os.startfile(str(log_dir))
            self._window.append_log(f"已開啟資料夾：{log_dir}")
        except Exception as exc:
            self._window.append_log(f"開啟資料夾失敗：{exc}")

    def start(self) -> None:
        self.stop()
        self._window.append_log("開始偵測...")
        try:
            devices = scan_devices()
        except Exception as exc:  # pragma: no cover - UI 診斷用
            self._window.append_log(f"偵測發生錯誤：{exc}")
            self._append_diagnostic_report()
            self._window.set_capture_active(False)
            return
        self._window.set_ports(devices)

        if not devices:
            self._window.append_log("未偵測到符合條件的裝置。")
            self._append_port_diagnostics()
            self._window.set_capture_active(False)
            return

        for device in devices:
            reader = SerialReaderThread(device.port)
            reader.data_received.connect(self._handle_data)
            reader.status_changed.connect(self._handle_status)
            self._readers[device.port] = ReaderBundle(thread=reader)
            reader.start()

        self._window.set_capture_active(True)

    def stop(self) -> None:
        for bundle in self._readers.values():
            bundle.thread.stop()
            bundle.thread.wait(500)
        self._readers.clear()
        self._log_writer.close()
        self._window.set_capture_active(False)

    def clear(self) -> None:
        self._window.clear_logs()

    def run_summary(self, cyc_type: int) -> None:
        self._log_writer.close()
        log_dir = self._log_writer.log_dir
        if not log_dir.exists():
            self._window.append_log("醒醒吧，你忘記讀取Donlg Log")
            return

        result = run_auto_summary(log_dir, cyc_type)
        if "empty_log" in result.warnings or "no_data" in result.warnings:
            self._window.append_log("醒醒吧，你忘記讀取Donlg Log")
            return

        self._window.append_log(f"Auto Summary 完成：{result.output_path}")
        for warning in result.warnings:
            self._window.append_log(f"Auto Summary 警告：{warning}")

    def _append_port_diagnostics(self) -> None:
        try:
            ports = list_all_ports()
        except Exception as exc:  # pragma: no cover - UI 診斷用
            self._window.append_log(f"列出 COM 失敗：{exc}")
            self._append_diagnostic_report()
            return
        if not ports:
            self._window.append_log("偵測不到任何 COM 連接埠。")
            self._append_diagnostic_report()
            return

        self._window.append_log("偵測到的 COM 清單：")
        for device in ports:
            self._window.append_log(
                f"{device.port} | {device.name} | {device.manufacturer} | {device.location}"
            )

    def _append_diagnostic_report(self) -> None:
        self._window.append_log("偵測診斷：")
        for line in diagnostic_report():
            self._window.append_log(line)

    def _handle_data(self, port: str, data: str) -> None:
        timestamp = datetime.now()
        log_entry = LogEntry(
            timestamp=timestamp,
            port=port,
            status=PortStatus.SAVED.value,
            raw_data=data,
        )
        self._log_writer.write(log_entry)
        self._window.append_log(f"{timestamp:%H:%M:%S} {port} {data}")
        self._window.update_port_status(port, PortStatus.SAVED)

    def _handle_status(self, port: str, status: str) -> None:
        if status == PortStatus.READY.value:
            self._window.update_port_status(port, PortStatus.READY)
        else:
            self._window.update_port_status(port, PortStatus.OFFLINE)


def main() -> None:
    app = QApplication([])
    window = MainWindow()
    controller = AppController(window)
    window._controller = controller  # type: ignore[assignment]
    app.aboutToQuit.connect(controller.stop)
    window.show()
    QTimer.singleShot(0, controller.start)
    app.exec()


if __name__ == "__main__":
    main()
