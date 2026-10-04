import os
import re
import glob
import yaml
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Set
from collections import defaultdict


class DetectionEngine:
    """
    YAML-based Detection Engine supporting Sigma-inspired rules, regexes,
    sliding-window thresholds, distinct field counts, sequence matching, and suppression.
    """

    def __init__(self, rules_dir: Optional[str] = None):
        if rules_dir is None:
            from backend.app.config import get_settings
            self.rules_dir = get_settings().DETECTION_RULES_PATH
        else:
            self.rules_dir = rules_dir
        self.rules: Dict[str, Dict[str, Any]] = {}
        self.compiled_regexes: Dict[str, List[re.Pattern]] = {}
        # Sliding window buffer: rule_id -> group_key -> list of (timestamp, event_data)
        self.state_buffer: Dict[str, Dict[str, List[Any]]] = defaultdict(lambda: defaultdict(list))
        # Suppression tracker: rule_id -> group_key -> last_alert_time
        self.suppression_tracker: Dict[str, Dict[str, datetime]] = defaultdict(dict)
        self.load_rules()

    def load_rules(self) -> int:
        """Loads all YAML rules from the rules directory."""
        self.rules.clear()
        self.compiled_regexes.clear()
        count = 0

        target_dir = self.rules_dir
        if not os.path.exists(target_dir):
            alt = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../detection-rules"))
            if os.path.exists(alt):
                target_dir = alt
            elif os.path.exists(os.path.join("..", target_dir)):
                target_dir = os.path.join("..", target_dir)

        yaml_files = glob.glob(os.path.join(target_dir, "**", "*.yaml"), recursive=True) + \
                     glob.glob(os.path.join(target_dir, "**", "*.yml"), recursive=True)


        for path in yaml_files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if not data or not isinstance(data, dict):
                        continue
                    rule_id = data.get("id")
                    if not rule_id:
                        continue

                    self.rules[rule_id] = data

                    # Compile regex patterns for performance
                    patterns = []
                    pattern_match = data.get("condition", {}).get("pattern_match", {})
                    for p in pattern_match.get("patterns", []):
                        try:
                            patterns.append(re.compile(p, re.IGNORECASE))
                        except re.error:
                            pass
                    if patterns:
                        self.compiled_regexes[rule_id] = patterns

                    count += 1
            except Exception as e:
                print(f"Error loading rule file {path}: {e}")

        return count

    def get_group_key(self, event: Dict[str, Any], group_by: List[str]) -> str:
        """Generates a composite group key from event fields."""
        if not group_by:
            return "global"
        keys = []
        for field in group_by:
            val = self.get_nested_field(event, field)
            keys.append(str(val) if val is not None else "null")
        return ":".join(keys)

    @staticmethod
    def get_nested_field(data: Dict[str, Any], path: str) -> Any:
        """Retrieves field values using dot notation (e.g. 'metadata.url')."""
        if "." not in path:
            return data.get(path)
        parts = path.split(".")
        curr = data
        for p in parts:
            if isinstance(curr, dict):
                curr = curr.get(p)
            else:
                return None
        return curr

    def _matches_condition(self, rule: Dict[str, Any], event: Dict[str, Any]) -> bool:
        cond = rule.get("condition", {})
        rule_id = rule.get("id", "")

        # 1. Base Event Type & Action Match
        if "event_type" in cond and cond["event_type"] != event.get("event_type"):
            return False
        if "action" in cond and cond["action"] != event.get("action"):
            return False

        # 2. Field Match with Regex
        if "field_match" in cond:
            for field, pattern in cond["field_match"].items():
                if field.endswith("_regex"):
                    actual_field = field[:-6]
                    val = str(self.get_nested_field(event, actual_field) or "")
                    if not re.search(pattern, val, re.IGNORECASE):
                        return False
                else:
                    val = str(self.get_nested_field(event, field) or "")
                    if val != str(pattern):
                        return False

        # 3. Numeric Filter Comparison
        if "numeric_filter" in cond:
            num_cfg = cond["numeric_filter"]
            field_val = self.get_nested_field(event, num_cfg.get("field", ""))
            try:
                num_val = float(field_val) if field_val is not None else 0.0
                target_val = float(num_cfg.get("value", 0))
                op = num_cfg.get("operator", ">=")
                if op == ">=" and not (num_val >= target_val):
                    return False
                elif op == ">" and not (num_val > target_val):
                    return False
                elif op == "<=" and not (num_val <= target_val):
                    return False
                elif op == "<" and not (num_val < target_val):
                    return False
                elif op == "==" and not (num_val == target_val):
                    return False
            except (ValueError, TypeError):
                return False

        # 4. Pattern Match (compiled regexes across specified fields)
        if rule_id in self.compiled_regexes:
            target_fields = cond.get("pattern_match", {}).get("fields", ["raw_message"])
            text_to_search = " ".join(
                str(self.get_nested_field(event, f) or "") for f in target_fields
            )
            matched = any(regex.search(text_to_search) for regex in self.compiled_regexes[rule_id])
            if not matched:
                return False

        return True

    def evaluate_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Evaluates a normalized event against all active detection rules.
        Returns a list of generated Alert dictionaries if conditions and thresholds are met.
        """
        generated_alerts: List[Dict[str, Any]] = []
        event_ts = event.get("timestamp")
        if isinstance(event_ts, str):
            try:
                event_ts = datetime.fromisoformat(event_ts.replace("Z", "+00:00"))
            except ValueError:
                event_ts = datetime.now(timezone.utc)
        elif not isinstance(event_ts, datetime):
            event_ts = datetime.now(timezone.utc)

        for rule_id, rule in self.rules.items():
            if not rule.get("enabled", True):
                continue

            if not self._matches_condition(rule, event):
                continue

            # Check Threshold & Time Window
            group_by = rule.get("group_by", [])
            group_key = self.get_group_key(event, group_by)
            threshold = rule.get("threshold", {"count": 1, "window_minutes": 1})
            required_count = threshold.get("count", 1)
            window_minutes = threshold.get("window_minutes", 1)
            distinct_field = threshold.get("distinct_field")
            distinct_count = threshold.get("distinct_count")

            # Manage sliding window
            cutoff = event_ts - timedelta(minutes=window_minutes)
            buffer = self.state_buffer[rule_id][group_key]
            # Prune old events outside window
            buffer = [(ts, ev) for ts, ev in buffer if ts >= cutoff]
            buffer.append((event_ts, event))
            self.state_buffer[rule_id][group_key] = buffer

            # Evaluate Threshold Match
            is_threshold_met = False
            if distinct_field and distinct_count:
                distinct_values = set(
                    str(self.get_nested_field(ev, distinct_field))
                    for _, ev in buffer
                    if self.get_nested_field(ev, distinct_field) is not None
                )
                if len(distinct_values) >= distinct_count:
                    is_threshold_met = True
            elif len(buffer) >= required_count:
                is_threshold_met = True

            # Handle sequence prior (e.g. login_success preceded by >= 3 login_failed)
            sequence_prior = rule.get("condition", {}).get("sequence_prior")
            if sequence_prior:
                prior_action = sequence_prior.get("action")
                min_prior = sequence_prior.get("min_prior_count", 1)
                prior_window = sequence_prior.get("window_minutes", 10)
                prior_cutoff = event_ts - timedelta(minutes=prior_window)
                # Check history in auth failed buffer for same group
                fail_buffer = self.state_buffer.get("CR-AUTH-001", {}).get(group_key, [])
                priors = [ev for ts, ev in fail_buffer if ts >= prior_cutoff and ev.get("action") == prior_action]
                if len(priors) < min_prior:
                    is_threshold_met = False
                else:
                    is_threshold_met = True

            if not is_threshold_met:
                continue

            # Check Suppression
            suppression_mins = rule.get("suppression_minutes", 0)
            last_alerted = self.suppression_tracker[rule_id].get(group_key)
            if last_alerted and (event_ts - last_alerted) < timedelta(minutes=suppression_mins):
                continue  # Suppressed

            # Update suppression tracker
            self.suppression_tracker[rule_id][group_key] = event_ts

            # Build Alert
            mitre = rule.get("mitre_attack", {})
            first_seen = buffer[0][0] if buffer else event_ts
            last_seen = event_ts
            hosts = list({ev.get("host") for _, ev in buffer if ev.get("host")})
            source_ips = list({ev.get("source_ip") for _, ev in buffer if ev.get("source_ip")})
            users = list({ev.get("user") for _, ev in buffer if ev.get("user")})
            # Sanitize sample events for JSON serialization
            sanitized_samples = []
            for _, ev in buffer[-5:]:
                s_dict = {}
                for k, v in ev.items():
                    if isinstance(v, datetime):
                        s_dict[k] = v.isoformat()
                    elif k == "extracted_iocs":
                        continue  # avoid redundant nesting
                    else:
                        s_dict[k] = v
                sanitized_samples.append(s_dict)

            alert_dict = {
                "rule_id": rule_id,
                "title": rule.get("name", f"Alert from {rule_id}"),
                "description": rule.get("description", ""),
                "severity": rule.get("severity", "medium"),
                "confidence": rule.get("confidence", 0.8),
                "source": "detection-engine",
                "mitre_tactic": mitre.get("tactic", "Discovery"),
                "mitre_technique_id": mitre.get("technique_id", "T1046"),
                "mitre_technique_name": mitre.get("technique_name", ""),
                "first_seen": first_seen,
                "last_seen": last_seen,
                "event_count": len(buffer),
                "status": "NEW",
                "affected_hosts": hosts,
                "source_ips": source_ips,
                "target_users": users,
                "sample_events": sanitized_samples,
            }
            generated_alerts.append(alert_dict)

        return generated_alerts


# Type alias for buffer items
Tuple_Event = Any
