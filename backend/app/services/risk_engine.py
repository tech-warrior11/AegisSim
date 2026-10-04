import math
from typing import Dict, Any, List, Optional


class RiskScoringEngine:
    """
    Transparent, deterministic risk scoring engine.
    Calculates a normalized 0-100 risk score based on:
    - Severity Weight
    - Confidence Weight
    - Event Volume / Frequency Factor
    - Asset Criticality Factor
    - MITRE ATT&CK Kill-Chain Impact
    """

    SEVERITY_WEIGHTS: Dict[str, int] = {
        "info": 10,
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 90,
    }

    ASSET_CRITICALITY: Dict[str, int] = {
        "dc-01": 20,
        "prod-db-01": 20,
        "lab-linux-01": 10,
        "lab-web-01": 10,
        "workstation-01": 5,
        "default": 10,
    }

    MITRE_TACTIC_WEIGHTS: Dict[str, int] = {
        "Impact": 20,
        "Exfiltration": 18,
        "Privilege Escalation": 15,
        "Credential Access": 15,
        "Defense Evasion": 12,
        "Execution": 12,
        "Persistence": 12,
        "Lateral Movement": 15,
        "Initial Access": 10,
        "Discovery": 8,
        "Reconnaissance": 5,
        "Command and Control": 15,
    }

    @classmethod
    def calculate_alert_risk(
        cls,
        severity: str,
        confidence: float = 0.8,
        event_count: int = 1,
        host: Optional[str] = None,
        mitre_tactic: Optional[str] = None,
    ) -> int:
        """Calculates a risk score for an individual alert (0-100)."""
        sev_score = cls.SEVERITY_WEIGHTS.get(severity.lower(), 40)
        conf_boost = int(confidence * 10)  # 0 to 10
        vol_boost = int(min(10, math.log2(event_count + 1) * 2.5)) if event_count > 1 else 0
        asset_crit = cls.ASSET_CRITICALITY.get(host.lower() if host else "default", cls.ASSET_CRITICALITY["default"])
        tactic_weight = cls.MITRE_TACTIC_WEIGHTS.get(mitre_tactic, 8) if mitre_tactic else 5

        raw_score = (sev_score * 0.50) + (conf_boost) + (vol_boost) + (asset_crit * 0.75) + (tactic_weight * 0.75)
        return int(max(0, min(100, round(raw_score))))

    @classmethod
    def calculate_incident_risk(
        cls,
        alerts: List[Dict[str, Any]],
        affected_assets: List[str],
        mitre_tactics: List[str],
    ) -> int:
        """
        Calculates aggregate incident risk score (0-100).
        Incorporates multi-alert correlation and kill-chain depth.
        """
        if not alerts:
            return 25

        # 1. Peak Severity Baseline
        max_sev_score = max(
            cls.SEVERITY_WEIGHTS.get(str(a.get("severity", "medium")).lower(), 40) for a in alerts
        )

        # 2. Average Confidence
        conf_sum = sum(float(a.get("confidence", 0.8)) for a in alerts)
        avg_conf = conf_sum / len(alerts)
        conf_boost = int(avg_conf * 10)

        # 3. Alert Count / Depth Multiplier
        alert_vol_boost = min(15, len(alerts) * 3)

        # 4. Highest Asset Criticality
        max_asset_crit = 10
        for asset in affected_assets:
            crit = cls.ASSET_CRITICALITY.get(asset.lower(), cls.ASSET_CRITICALITY["default"])
            if crit > max_asset_crit:
                max_asset_crit = crit

        # 5. MITRE Tactics Depth (Multiple distinct tactics indicate multi-stage APT)
        distinct_tactics = set(mitre_tactics)
        tactic_impact = min(20, sum(cls.MITRE_TACTIC_WEIGHTS.get(t, 5) for t in distinct_tactics) // 2)

        # Total Aggregate
        raw_score = (max_sev_score * 0.45) + conf_boost + alert_vol_boost + (max_asset_crit * 0.6) + tactic_impact
        return int(max(0, min(100, round(raw_score))))

    @staticmethod
    def get_risk_category(score: int) -> str:
        """Returns the severity label from numeric risk score."""
        if score >= 90:
            return "critical"
        elif score >= 75:
            return "high"
        elif score >= 50:
            return "medium"
        elif score >= 25:
            return "low"
        return "info"
