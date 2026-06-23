from __future__ import annotations

import re
from typing import Dict, Iterable, List

try:
    from .models import DeviceInfo
except ImportError:  # 允許以腳本方式執行
    from models import DeviceInfo

try:
    import wmi
except ImportError:  # wmi 為選配：無則退回 pyserial
    wmi = None

try:
    from serial.tools import list_ports
except ImportError:  # pyserial 為選配：無則只保留空清單
    list_ports = None


_USB_SERIAL_NAME = "USB Serial Device"
_USB_SERIAL_ALIASES = (
    "USB Serial Device",
    "USB-SERIAL",
    "STMicroelectronics",
)
_COM_PATTERN = re.compile(r"\((COM\d+)\)")


def _extract_com_port(name: str) -> str | None:
    match = _COM_PATTERN.search(name)
    return match.group(1) if match else None


def _is_target_device(name: str, manufacturer: str | None, location: str | None) -> bool:
    if _USB_SERIAL_NAME not in name:
        return False
    if (manufacturer or "").strip() != "Microsoft":
        return False
    if "hub" not in (location or "").lower():
        return False
    return True


def _is_relaxed_target(name: str) -> bool:
    return any(alias in name for alias in _USB_SERIAL_ALIASES)


def scan_devices() -> List[DeviceInfo]:
    devices: List[DeviceInfo] = []
    relaxed_candidates: List[DeviceInfo] = []
    port_index = _merge_port_index()

    for entry in port_index.values():
        if _is_target_device(entry.name, entry.manufacturer, entry.location):
            devices.append(entry)
            continue
        if _is_relaxed_target(entry.name):
            relaxed_candidates.append(entry)

    if devices or relaxed_candidates:
        return devices or relaxed_candidates

    return list(port_index.values())


def list_all_ports() -> List[DeviceInfo]:
    return list(_merge_port_index().values())


def diagnostic_report() -> List[str]:
    lines: List[str] = []
    if wmi is None:
        lines.append("WMI unavailable: no module named 'wmi'")
        try:
            pyserial_ports = list(_scan_ports_pyserial())
            lines.append(f"pyserial ports count: {len(pyserial_ports)}")
        except Exception as exc:  # pragma: no cover - 只用於診斷
            lines.append(f"pyserial error: {exc}")
        return lines

    try:
        wmi_conn = wmi.WMI()
        pnpe_items = list(wmi_conn.Win32_PnPEntity())
        lines.append(f"WMI Win32_PnPEntity count: {len(pnpe_items)}")
        pnpe_ports = [
            item
            for item in pnpe_items
            if _extract_com_port(getattr(item, "Name", "") or "")
        ]
        lines.append(f"WMI Win32_PnPEntity with COM: {len(pnpe_ports)}")
    except Exception as exc:  # pragma: no cover - 只用於診斷
        lines.append(f"WMI Win32_PnPEntity error: {exc}")

    try:
        serial_ports = list(_scan_ports_wmi_serial_port())
        lines.append(f"WMI Win32_SerialPort count: {len(serial_ports)}")
    except Exception as exc:  # pragma: no cover - 只用於診斷
        lines.append(f"WMI Win32_SerialPort error: {exc}")

    try:
        pyserial_ports = list(_scan_ports_pyserial())
        lines.append(f"pyserial ports count: {len(pyserial_ports)}")
    except Exception as exc:  # pragma: no cover - 只用於診斷
        lines.append(f"pyserial error: {exc}")

    return lines


def _scan_ports_pyserial() -> List[DeviceInfo]:
    results: List[DeviceInfo] = []
    if list_ports is None:
        return results
    for port in list_ports.comports():
        name = port.description or port.hwid or port.device
        results.append(
            DeviceInfo(
                port=port.device,
                name=name,
                manufacturer=port.manufacturer or "",
                location=port.location or "",
            )
        )
    return results


def _scan_ports_pyserial_index() -> Dict[str, DeviceInfo]:
    results: Dict[str, DeviceInfo] = {}
    if list_ports is None:
        return results
    for port in list_ports.comports():
        name = port.description or port.hwid or port.device
        results[port.device] = DeviceInfo(
            port=port.device,
            name=name,
            manufacturer=port.manufacturer or "",
            location=port.location or "",
        )
    return results


def _build_wmi_index() -> Dict[str, DeviceInfo]:
    results: Dict[str, DeviceInfo] = {}
    if wmi is None:
        return results
    wmi_conn = wmi.WMI()

    for device in wmi_conn.Win32_PnPEntity():
        name = getattr(device, "Name", "") or ""
        port = _extract_com_port(name)
        if not port:
            continue
        results[port] = DeviceInfo(
            port=port,
            name=name,
            manufacturer=getattr(device, "Manufacturer", "") or "",
            location=getattr(device, "LocationInfo", "") or "",
        )

    for port in wmi_conn.Win32_SerialPort():
        port_name = getattr(port, "DeviceID", "") or ""
        if not port_name:
            continue
        if port_name in results:
            continue
        name = (
            getattr(port, "Name", "")
            or getattr(port, "Description", "")
            or getattr(port, "Caption", "")
            or port_name
        )
        results[port_name] = DeviceInfo(
            port=port_name,
            name=name,
            manufacturer=getattr(port, "Manufacturer", "") or "",
            location=getattr(port, "LocationInfo", "") or "",
        )

    return results


def _merge_port_index() -> Dict[str, DeviceInfo]:
    wmi_index = _build_wmi_index()
    pyserial_index = _scan_ports_pyserial_index()
    for port, entry in pyserial_index.items():
        wmi_index.setdefault(port, entry)
    return wmi_index


def _scan_ports_wmi_serial_port() -> List[DeviceInfo]:
    results: List[DeviceInfo] = []
    if wmi is None:
        return results
    wmi_conn = wmi.WMI()
    for port in wmi_conn.Win32_SerialPort():
        port_name = getattr(port, "DeviceID", "") or ""
        if not port_name:
            continue
        name = (
            getattr(port, "Name", "")
            or getattr(port, "Description", "")
            or getattr(port, "Caption", "")
            or port_name
        )
        results.append(
            DeviceInfo(
                port=port_name,
                name=name,
                manufacturer=getattr(port, "Manufacturer", "") or "",
                location=getattr(port, "LocationInfo", "") or "",
            )
        )
    return results
