import axios from "axios";

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/api`;
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8000/api";
  }
  return "/api";
};

const getHealthUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/health`;
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8000/health";
  }
  return "/health";
};

export const axiosInstance = axios.create({
  baseURL: getApiBase(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token from localStorage if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("aegissim_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unified API Object
export const api = {
  // Raw instance
  raw: axiosInstance,

  // Health
  health: () => axios.get(getHealthUrl()),


  // Auth
  auth: {
    login: (credentials: any) => axiosInstance.post("/auth/login", credentials),
    register: (data: any) => axiosInstance.post("/auth/register", data),
    getMe: () => axiosInstance.get("/auth/me"),
  },

  // Dashboard
  dashboard: {
    getSummary: () => axiosInstance.get("/dashboard/summary"),
    getTimeline: () => axiosInstance.get("/dashboard/timeline"),
    getSeverity: () => axiosInstance.get("/dashboard/severity"),
    getMitre: () => axiosInstance.get("/dashboard/mitre"),
    getTopAssets: () => axiosInstance.get("/dashboard/top-assets"),
  },

  // Events
  events: {
    getAll: (params?: any) => axiosInstance.get("/events", { params }),
    getById: (id: string) => axiosInstance.get(`/events/${id}`),
    ingest: (data: any) => axiosInstance.post("/events", data),
    ingestBulk: (events: any[]) => axiosInstance.post("/events/bulk", { events }),
  },

  // Alerts
  alerts: {
    getAll: (params?: any) => axiosInstance.get("/alerts", { params }),
    getById: (id: string) => axiosInstance.get(`/alerts/${id}`),
    update: (id: string, data: any) => axiosInstance.patch(`/alerts/${id}`, data),
    acknowledge: (id: string) => axiosInstance.post(`/alerts/${id}/acknowledge`),
  },

  // Incidents
  incidents: {
    getAll: (params?: any) => axiosInstance.get("/incidents", { params }),
    getById: (id: string) => axiosInstance.get(`/incidents/${id}`),
    create: (data: any) => axiosInstance.post("/incidents", data),
    update: (id: string, data: any) => axiosInstance.patch(`/incidents/${id}`, data),
    getTimeline: (id: string) => axiosInstance.get(`/incidents/${id}/timeline`),
    addNote: (id: string, note_text: string) => axiosInstance.post(`/incidents/${id}/notes`, { note_text }),
    addEvidence: (id: string, data: any) => axiosInstance.post(`/incidents/${id}/evidence`, data),
    executeAction: (id: string, data: any) => axiosInstance.post(`/incidents/${id}/actions`, data),
    evaluateTraining: (id: string, data: any) => axiosInstance.post(`/playbooks/training/evaluate/${id}`, data),
  },

  // Threat Hunting
  hunt: {
    search: (query: any) => axiosInstance.post("/hunt/search", query),
    save: (data: any) => axiosInstance.post("/hunt/save", data),
    getSaved: () => axiosInstance.get("/hunt/saved"),
  },

  // Detections & Coverage
  detections: {
    getAll: (params?: any) => axiosInstance.get("/detections", { params }),
    getById: (id: string) => axiosInstance.get(`/detections/${id}`),
    getCoverage: () => axiosInstance.get("/detections/coverage"),
    toggle: (id: string, enabled: boolean) => axiosInstance.patch(`/detections/${id}/toggle?enabled=${enabled}`),
  },

  // Simulations
  simulations: {
    getAll: () => axiosInstance.get("/simulations"),
    run: (id: string) => axiosInstance.post(`/simulations/${id}/run`),
    getRuns: () => axiosInstance.get("/simulations/runs"),
    getRun: (id: string) => axiosInstance.get(`/simulations/runs/${id}`),
  },

  // Playbooks
  playbooks: {
    getAll: () => axiosInstance.get("/playbooks"),
  },

  // IOCs & Threat Intel
  iocs: {
    getAll: (params?: any) => axiosInstance.get("/iocs", { params }),
    getById: (id: string) => axiosInstance.get(`/iocs/${id}`),
  },
  threatIntel: {
    lookup: (value: string, query_type: string = "ip") => 
      axiosInstance.post(`/iocs/lookup?query_type=${query_type}&value=${encodeURIComponent(value)}`),
  },

  // Reports
  reports: {
    getAll: () => axiosInstance.get("/reports"),
    getById: (id: string) => axiosInstance.get(`/reports/${id}`),
    generate: (incidentId: string, format: string) => 
      axiosInstance.post(`/reports/incidents/${incidentId}`, { format }),
  },

  // Audit Logs
  audit: {
    getAll: (params?: any) => axiosInstance.get("/audit", { params }),
  },
};

export const ApiService = {
  login: api.auth.login,
  register: api.auth.register,
  getMe: api.auth.getMe,
  getDashboardSummary: api.dashboard.getSummary,
  getDashboardTimeline: api.dashboard.getTimeline,
  getSeverityBreakdown: api.dashboard.getSeverity,
  getMitreDistribution: api.dashboard.getMitre,
  getTopAssets: api.dashboard.getTopAssets,
  getEvents: api.events.getAll,
  getEvent: api.events.getById,
  ingestEvent: api.events.ingest,
  ingestBulkEvents: api.events.ingestBulk,
  getAlerts: api.alerts.getAll,
  getAlert: api.alerts.getById,
  updateAlert: api.alerts.update,
  acknowledgeAlert: api.alerts.acknowledge,
  getIncidents: api.incidents.getAll,
  getIncident: api.incidents.getById,
  createIncident: api.incidents.create,
  updateIncident: api.incidents.update,
  getIncidentTimeline: api.incidents.getTimeline,
  addInvestigationNote: api.incidents.addNote,
  addEvidence: api.incidents.addEvidence,
  executeResponseAction: api.incidents.executeAction,
  searchHunt: api.hunt.search,
  saveHunt: api.hunt.save,
  getSavedHunts: api.hunt.getSaved,
  getDetectionRules: api.detections.getAll,
  getDetectionRule: api.detections.getById,
  getDetectionCoverage: api.detections.getCoverage,
  toggleDetectionRule: api.detections.toggle,
  getScenarios: api.simulations.getAll,
  runScenario: api.simulations.run,
  getSimulationRuns: api.simulations.getRuns,
  getSimulationRun: api.simulations.getRun,
  getPlaybooks: api.playbooks.getAll,
  evaluateTraining: api.incidents.evaluateTraining,
  getIOCs: api.iocs.getAll,
  getIOC: api.iocs.getById,
  lookupThreatIntel: api.threatIntel.lookup,
  generateReport: api.reports.generate,
  getReports: api.reports.getAll,
  getReport: api.reports.getById,
  getAuditLogs: api.audit.getAll,
};
