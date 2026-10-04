import json
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.app.config import get_settings


class ThreatIntelProvider(ABC):
    """Abstract Base Class for pluggable Threat Intelligence providers."""

    @abstractmethod
    def lookup_ip(self, ip: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def lookup_domain(self, domain: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def lookup_hash(self, file_hash: str) -> Dict[str, Any]:
        pass


class LocalThreatIntelProvider(ThreatIntelProvider):
    """Local Threat Intel Provider utilizing an offline JSON reputation dataset."""

    def __init__(self, db_path: Optional[str] = None):
        settings = get_settings()
        self.db_path = db_path or settings.IOC_DB_PATH
        self.db: Dict[str, Dict[str, Any]] = {"ips": {}, "domains": {}, "hashes": {}}
        self._load_db()

    def _load_db(self):
        target_path = self.db_path
        if not os.path.exists(target_path):
            alt = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/sample-iocs/ioc_reputation_db.json"))
            if os.path.exists(alt):
                target_path = alt
            elif os.path.exists(os.path.join("..", target_path)):
                target_path = os.path.join("..", target_path)

        if os.path.exists(target_path):
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    self.db = json.load(f)
            except Exception as e:
                print(f"Failed to load local threat intel DB from {target_path}: {e}")

    def lookup_ip(self, ip: str) -> Dict[str, Any]:
        ip_clean = ip.strip().split(":")[0]
        match = self.db.get("ips", {}).get(ip_clean)
        if match:
            return {
                "found": True,
                "value": ip_clean,
                "type": "ip",
                "reputation": match.get("reputation", "SUSPICIOUS"),
                "threat_actor": match.get("threat_actor", "Unknown"),
                "confidence": match.get("confidence", 0.8),
                "tags": match.get("tags", []),
                "description": match.get("description", "Identified in local threat intel."),
            }
        return {
            "found": False,
            "value": ip_clean,
            "type": "ip",
            "reputation": "UNKNOWN",
            "threat_actor": "None",
            "confidence": 0.5,
            "tags": [],
            "description": "No intelligence found in local database.",
        }

    def lookup_domain(self, domain: str) -> Dict[str, Any]:
        dom_clean = domain.strip().lower()
        match = self.db.get("domains", {}).get(dom_clean)
        if match:
            return {
                "found": True,
                "value": dom_clean,
                "type": "domain",
                "reputation": match.get("reputation", "SUSPICIOUS"),
                "threat_actor": match.get("threat_actor", "Unknown"),
                "confidence": match.get("confidence", 0.8),
                "tags": match.get("tags", []),
                "description": match.get("description", "Identified in local threat intel."),
            }
        return {
            "found": False,
            "value": dom_clean,
            "type": "domain",
            "reputation": "UNKNOWN",
            "threat_actor": "None",
            "confidence": 0.5,
            "tags": [],
            "description": "No intelligence found in local database.",
        }

    def lookup_hash(self, file_hash: str) -> Dict[str, Any]:
        hash_clean = file_hash.strip().lower()
        match = self.db.get("hashes", {}).get(hash_clean)
        if match:
            return {
                "found": True,
                "value": hash_clean,
                "type": "hash",
                "reputation": match.get("reputation", "MALICIOUS"),
                "threat_actor": match.get("threat_actor", "Unknown"),
                "confidence": match.get("confidence", 0.95),
                "tags": match.get("tags", []),
                "description": match.get("description", "Known malicious hash in local database."),
            }
        return {
            "found": False,
            "value": hash_clean,
            "type": "hash",
            "reputation": "UNKNOWN",
            "threat_actor": "None",
            "confidence": 0.5,
            "tags": [],
            "description": "No intelligence found in local database.",
        }


# Global threat intel singleton
threat_intel = LocalThreatIntelProvider()
