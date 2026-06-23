from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class PortStatus(str, Enum):
    READY = "ready"
    OFFLINE = "offline"
    SAVED = "saved"


@dataclass(frozen=True)
class DeviceInfo:
    port: str
    name: str
    manufacturer: str
    location: str
