from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QAction, QIcon
from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSizePolicy,
    QTableWidget,
    QTableWidgetItem,
    QToolBar,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

try:
    from .models import DeviceInfo, PortStatus
except ImportError:  # 允許以腳本方式執行
    from models import DeviceInfo, PortStatus


@dataclass
class PortRowWidgets:
    status_label: QLabel
    status_text: QTableWidgetItem


class MainWindow(QMainWindow):
    start_requested = pyqtSignal()
    stop_requested = pyqtSignal()
    clear_requested = pyqtSignal()
    summary_requested = pyqtSignal(int)
    open_log_dir_requested = pyqtSignal()

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Dongle Autolog Loader")
        self.resize(1100, 720)
        self._controller = None  # type: ignore[assignment]

        icon_path = self._resolve_icon_path()
        if icon_path:
            self.setWindowIcon(QIcon(str(icon_path)))

        self._port_table = QTableWidget(0, 4)
        self._port_table.setHorizontalHeaderLabels(["Port", "裝置", "狀態", "狀態文字"])
        self._port_table.horizontalHeader().setStretchLastSection(True)
        self._port_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._port_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)

        self._log_view = QTextEdit()
        self._log_view.setReadOnly(True)

        self._start_button = QPushButton("開始偵測")
        self._stop_button = QPushButton("停止偵測")
        self._clear_button = QPushButton("清除顯示/狀態")
        self._open_log_button = QPushButton("開啟資料位置")
        self._summary_button = QPushButton("執行資料整理")
        self._cyc_type_combo = QComboBox()
        self._cyc_type_combo.addItem("1 block 100K", 0)
        self._cyc_type_combo.addItem("1 sector 100K", 3)
        self._cyc_type_combo.addItem("16 sectors 100K", 1)
        self._cyc_type_combo.addItem("7 to 1 Blocks 100K", 2)
        self._cyc_type_combo.addItem("15 to 1 sectors 100K", 4)
        self._cyc_type_combo.setCurrentIndex(0)

        self._start_button.clicked.connect(self.start_requested.emit)
        self._stop_button.clicked.connect(self.stop_requested.emit)
        self._clear_button.clicked.connect(self.clear_requested.emit)
        self._open_log_button.clicked.connect(self.open_log_dir_requested.emit)
        self._summary_button.clicked.connect(self._emit_summary_requested)

        self._port_widgets: Dict[str, PortRowWidgets] = {}

        self._build_layout()
        self._build_toolbar()

    def _build_layout(self) -> None:
        central = QWidget()
        self.setCentralWidget(central)

        main_layout = QHBoxLayout(central)
        left_layout = QVBoxLayout()
        right_layout = QVBoxLayout()

        left_layout.addWidget(QLabel("Port 狀態"))
        left_layout.addWidget(self._port_table)

        right_layout.addWidget(QLabel("Log 顯示"))
        right_layout.addWidget(self._log_view)

        button_layout = QHBoxLayout()
        button_layout.addWidget(self._start_button)
        button_layout.addWidget(self._stop_button)
        button_layout.addWidget(self._clear_button)
        button_layout.addWidget(QLabel("Cycling類型"))
        button_layout.addWidget(self._cyc_type_combo)
        button_layout.addStretch(1)
        button_layout.addWidget(self._open_log_button)
        button_layout.addWidget(self._summary_button)

        right_layout.addLayout(button_layout)

        main_layout.addLayout(left_layout, 4)
        main_layout.addLayout(right_layout, 6)

    def _build_toolbar(self) -> None:
        toolbar = QToolBar("Main")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)

        about_action = QAction("About", self)
        about_action.triggered.connect(self._show_about)
        toolbar.addAction(about_action)

    def _resolve_icon_path(self) -> Optional[Path]:
        candidates = [
            Path(sys.executable).parent / "pp00.ico" if getattr(sys, "frozen", False) else None,
            Path(__file__).resolve().parents[2] / "pp00.ico",
            Path(__file__).resolve().parents[1] / "pp00.ico",
            Path.cwd() / "pp00.ico",
        ]
        for path in candidates:
            if path and path.exists():
                return path
        return None

    def set_ports(self, devices: List[DeviceInfo]) -> None:
        self._port_table.setRowCount(0)
        self._port_widgets.clear()

        for device in devices:
            row = self._port_table.rowCount()
            self._port_table.insertRow(row)

            self._port_table.setItem(row, 0, QTableWidgetItem(device.port))
            self._port_table.setItem(row, 1, QTableWidgetItem(device.name))

            status_label = self._create_status_label(PortStatus.READY)
            self._port_table.setCellWidget(row, 2, status_label)

            status_text = QTableWidgetItem(PortStatus.READY.value)
            self._port_table.setItem(row, 3, status_text)
            self._port_widgets[device.port] = PortRowWidgets(
                status_label=status_label,
                status_text=status_text,
            )

    def update_port_status(self, port: str, status: PortStatus) -> None:
        widgets = self._port_widgets.get(port)
        if not widgets:
            return
        self._apply_status_color(widgets.status_label, status)
        widgets.status_text.setText(status.value)

    def append_log(self, message: str) -> None:
        self._log_view.append(message)

    def clear_logs(self) -> None:
        self._log_view.clear()
        for widgets in self._port_widgets.values():
            self._apply_status_color(widgets.status_label, PortStatus.READY)
            widgets.status_text.setText(PortStatus.READY.value)

    def set_capture_active(self, active: bool) -> None:
        self._start_button.setEnabled(not active)
        self._clear_button.setEnabled(not active)

    def _emit_summary_requested(self) -> None:
        cyc_type = self._cyc_type_combo.currentData()
        if cyc_type is None:
            cyc_type = 0
        self.summary_requested.emit(int(cyc_type))

    def _show_about(self) -> None:
        QMessageBox.information(
            self,
            "About",
            "作者: PP32 YPLu\n版本: v20260505",
        )

    def _create_status_label(self, status: PortStatus) -> QLabel:
        label = QLabel()
        label.setFixedSize(18, 18)
        label.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._apply_status_color(label, status)
        return label

    def _apply_status_color(self, label: QLabel, status: PortStatus) -> None:
        color = {
            PortStatus.READY: "#27ae60",
            PortStatus.OFFLINE: "#e74c3c",
            PortStatus.SAVED: "#3498db",
        }[status]
        label.setStyleSheet(
            "QLabel {"
            f"background-color: {color};"
            "border-radius: 9px;"
            "border: 1px solid #2c3e50;"
            "}"
        )
