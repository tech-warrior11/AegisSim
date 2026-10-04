import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "../types";

interface Notification {
  id: string;
  type: "ALERT" | "INCIDENT" | "SIMULATION" | "INFO";
  title: string;
  message: string;
  severity?: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: Notification[];
  latestAlert: Alert | null;
  wsConnected: boolean;
  clearNotification: (id: string) => void;
  clearLatestAlert: () => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        let wsUrl = "";
        if (import.meta.env.VITE_WS_BASE_URL) {
          wsUrl = import.meta.env.VITE_WS_BASE_URL;
        } else if (import.meta.env.VITE_API_BASE_URL) {
          const apiUrl = import.meta.env.VITE_API_BASE_URL;
          const wsProto = apiUrl.startsWith("https") ? "wss:" : "ws:";
          const cleanHost = apiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
          wsUrl = `${wsProto}//${cleanHost}/ws`;
        } else {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const hostname = window.location.hostname || "localhost";
          const port = hostname === "localhost" || hostname === "127.0.0.1" ? ":8000" : (window.location.port ? `:${window.location.port}` : "");
          wsUrl = `${protocol}//${hostname}${port}/ws`;
        }
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload.type === "NEW_ALERT") {
              const alertData = payload.data as Alert;
              setLatestAlert(alertData);
              addNotification({
                type: "ALERT",
                title: `🚨 ${alertData.severity.toUpperCase()} Alert: ${alertData.title}`,
                message: alertData.description || `Rule triggered: ${alertData.rule_id}`,
                severity: alertData.severity,
              });
            } else if (payload.type === "INCIDENT_CREATED" || payload.type === "INCIDENT_UPDATE") {
              addNotification({
                type: "INCIDENT",
                title: `🛡️ Incident Correlated: ${payload.data.title}`,
                message: `Risk Score: ${payload.data.risk_score} | Status: ${payload.data.status}`,
                severity: payload.data.severity,
              });
            } else if (payload.type === "SIMULATION_COMPLETED") {
              addNotification({
                type: "SIMULATION",
                title: `⚡ Simulation Complete: ${payload.data.scenario_name}`,
                message: `Events: ${payload.data.events_generated} | Detections: ${payload.data.detections_triggered} | Risk: ${payload.data.risk_score}`,
                severity: "high",
              });
            }
          } catch (err) {
            // ignore non-json
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const addNotification = (n: Omit<Notification, "id" | "timestamp">) => {
    const newEntry: Notification = {
      ...n,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearLatestAlert = () => {
    setLatestAlert(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        latestAlert,
        wsConnected,
        clearNotification,
        clearLatestAlert,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

