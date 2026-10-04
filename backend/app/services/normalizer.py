import re
import ipaddress
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List, Optional


class NormalizationError(Exception):
    pass


class LogNormalizer:
    """Normalizes raw logs from various sources into a unified SIEM event schema and extracts IOCs."""

    # Regex patterns for IOC extraction
    IPV4_REGEX = re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b")
    SHA256_REGEX = re.compile(r"\b[a-fA-F0-9]{64}\b")
    MD5_REGEX = re.compile(r"\b[a-fA-F0-9]{32}\b")
    URL_REGEX = re.compile(r"https?://[^\s\"'>]+")
    DOMAIN_REGEX = re.compile(r"\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b")
    FILEPATH_LINUX_REGEX = re.compile(r"(?:/[a-zA-Z0-9_.-]+)+")
    FILEPATH_WIN_REGEX = re.compile(r"[a-zA-Z]:\\(?:[a-zA-Z0-9_.-]+\\)*[a-zA-Z0-9_.-]+")

    # Common log parser regexes
    SSH_AUTH_FAIL_REGEX = re.compile(
        r"Failed\s+(?:password|publickey)\s+for\s+(?:invalid\s+user\s+)?(?P<user>[\w.-]+)\s+from\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\s+port\s+(?P<port>\d+)",
        re.IGNORECASE,
    )
    SSH_AUTH_SUCCESS_REGEX = re.compile(
        r"Accepted\s+(?:password|publickey)\s+for\s+(?P<user>[\w.-]+)\s+from\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\s+port\s+(?P<port>\d+)",
        re.IGNORECASE,
    )
    NGINX_ACCESS_REGEX = re.compile(
        r'(?P<ip>\d+\.\d+\.\d+\.\d+)\s+-\s+(?P<user>[^\s]+)\s+\[(?P<time>[^\]]+)\]\s+"(?P<method>[A-Z]+)\s+(?P<url>[^\s]+)\s+HTTP/[0-9.]+"\s+(?P<status>\d+)\s+(?P<bytes>\d+)',
        re.IGNORECASE,
    )
    SUDO_EXEC_REGEX = re.compile(
        r"(?P<user>[\w.-]+)\s*:\s*TTY=[^\s]+\s*;\s*PWD=[^\s]+\s*;\s*USER=(?P<target_user>[\w.-]+)\s*;\s*COMMAND=(?P<command>.+)",
        re.IGNORECASE,
    )

    @classmethod
    def clean_ip(cls, ip_str: Optional[str]) -> Optional[str]:
        if not ip_str:
            return None
        ip_str = ip_str.strip().split(":")[0]  # strip port if attached
        try:
            ipaddress.ip_address(ip_str)
            return ip_str
        except ValueError:
            return None

    @classmethod
    def extract_iocs(cls, text: str) -> List[Dict[str, Any]]:
        """Extracts candidate IOCs from text (IPs, URLs, Hashes, Domains, Filepaths)."""
        iocs: List[Dict[str, Any]] = []
        if not text:
            return iocs

        seen = set()

        # Extract IPv4
        for ip in cls.IPV4_REGEX.findall(text):
            cleaned = cls.clean_ip(ip)
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                # Check if loopback/private vs routable
                try:
                    ip_obj = ipaddress.ip_address(cleaned)
                    is_private = ip_obj.is_private or ip_obj.is_loopback
                except Exception:
                    is_private = False
                iocs.append({
                    "type": "ip",
                    "value": cleaned,
                    "confidence": 0.9 if not is_private else 0.7,
                    "metadata": {"is_private": is_private},
                })

        # Extract SHA256
        for h in cls.SHA256_REGEX.findall(text):
            if h not in seen:
                seen.add(h)
                iocs.append({"type": "hash", "value": h.lower(), "confidence": 0.95, "metadata": {"algo": "sha256"}})

        # Extract MD5
        for h in cls.MD5_REGEX.findall(text):
            if h not in seen:
                seen.add(h)
                iocs.append({"type": "hash", "value": h.lower(), "confidence": 0.85, "metadata": {"algo": "md5"}})

        # Extract URLs
        for u in cls.URL_REGEX.findall(text):
            if u not in seen:
                seen.add(u)
                iocs.append({"type": "url", "value": u, "confidence": 0.85, "metadata": {}})

        # Extract Domains
        for d in cls.DOMAIN_REGEX.findall(text):
            # ignore ip-like matches
            if not cls.IPV4_REGEX.match(d) and d not in seen and not d.endswith(".exe") and not d.endswith(".so"):
                seen.add(d)
                iocs.append({"type": "domain", "value": d.lower(), "confidence": 0.75, "metadata": {}})

        return iocs

    @classmethod
    def normalize(cls, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes a raw dictionary input into a unified SIEM event schema.
        Handles both pre-structured events and unformatted raw syslog/web strings.
        """
        raw_msg = str(raw.get("raw_message", "")).strip()
        source = str(raw.get("source", "generic")).lower()
        host = str(raw.get("host", "lab-linux-01"))

        # Default timestamp to UTC now if missing/invalid
        ts = raw.get("timestamp")
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                dt = datetime.now(timezone.utc)
        elif isinstance(ts, datetime):
            dt = ts
        else:
            dt = datetime.now(timezone.utc)

        event_type = raw.get("event_type")
        action = raw.get("action")
        user = raw.get("user")
        src_ip = cls.clean_ip(raw.get("source_ip"))
        dst_ip = cls.clean_ip(raw.get("destination_ip"))
        process = raw.get("process")
        severity = str(raw.get("severity", "low")).lower()
        metadata = dict(raw.get("metadata", {}))

        # Specialized parsing if fields are not explicitly provided
        if not event_type or not action:
            # 1. SSH Auth Failures
            ssh_fail = cls.SSH_AUTH_FAIL_REGEX.search(raw_msg)
            if ssh_fail:
                event_type = "authentication"
                action = "login_failed"
                user = user or ssh_fail.group("user")
                src_ip = src_ip or cls.clean_ip(ssh_fail.group("ip"))
                severity = "medium"
                metadata["port"] = int(ssh_fail.group("port"))

            # 2. SSH Auth Success
            ssh_succ = cls.SSH_AUTH_SUCCESS_REGEX.search(raw_msg)
            if ssh_succ:
                event_type = "authentication"
                action = "login_success"
                user = user or ssh_succ.group("user")
                src_ip = src_ip or cls.clean_ip(ssh_succ.group("ip"))
                severity = "low"
                metadata["port"] = int(ssh_succ.group("port"))

            # 3. Nginx / Web Access
            web_match = cls.NGINX_ACCESS_REGEX.search(raw_msg)
            if web_match:
                event_type = "web"
                action = "http_request"
                src_ip = src_ip or cls.clean_ip(web_match.group("ip"))
                metadata["method"] = web_match.group("method")
                metadata["url"] = web_match.group("url")
                metadata["status_code"] = int(web_match.group("status"))
                status = metadata["status_code"]
                if status >= 500:
                    severity = "medium"
                elif status == 404 or status == 403:
                    severity = "low"

            # 4. Sudo Execution
            sudo_match = cls.SUDO_EXEC_REGEX.search(raw_msg)
            if sudo_match:
                event_type = "privilege"
                action = "sudo_command"
                user = user or sudo_match.group("user")
                process = process or sudo_match.group("command")
                metadata["target_user"] = sudo_match.group("target_user")
                severity = "medium"

        # Fallback defaults if still unspecified
        event_type = event_type or "security"
        action = action or "generic_activity"

        # Validate severity
        if severity not in {"info", "low", "medium", "high", "critical"}:
            severity = "low"

        # Extract IOC candidates
        extracted_iocs = cls.extract_iocs(raw_msg)
        if src_ip:
            extracted_iocs.append({"type": "ip", "value": src_ip, "confidence": 0.9, "metadata": {}})
        if dst_ip:
            extracted_iocs.append({"type": "ip", "value": dst_ip, "confidence": 0.9, "metadata": {}})

        return {
            "timestamp": dt,
            "source": source,
            "host": host,
            "event_type": event_type,
            "action": action,
            "user": user,
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "process": process,
            "severity": severity,
            "raw_message": raw_msg if raw_msg else f"{event_type}:{action} on {host}",
            "metadata_payload": metadata,
            "is_synthetic": raw.get("is_synthetic", True),
            "extracted_iocs": extracted_iocs,
        }
