# AegisSim: Attack Detection & Investigation Lab

AegisSim is an enterprise-grade Attack Detection & Investigation Lab platform built for Blue Teams, SOC Analysts, and Detection Engineers.

## 🎯 Features

- **End-to-End SOC Pipeline**: Fully integrated pipeline from log ingestion to incident correlation.
- **Advanced Threat Detection**: Sigma-inspired behavioral rules with temporal correlations.
- **Risk Scoring Engine**: Algorithmic risk evaluation for high-fidelity alerts.
- **Incident Management**: Group related events into comprehensive security incidents.
- **Threat Hunting**: Explore logs and trace attacker activity with a Threat Hunting UI.
- **Live Attack Simulations**: Run controlled attack scenarios against test instances.
- **Real-Time Dashboards**: Monitor the entire environment through live WebSocket dashboards.

## 🛠️ Used Tools & Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy Asyncio.
- **Database**: PostgreSQL for relational storage, Redis for fast caching/queues.
- **Security**: JWT-based authentication, RBAC, Data Validation with Pydantic.
- **Containerization**: Docker, Docker Compose for isolated microservices architecture.
- **Observability**: Built-in health checks and metrics.

---

## 🔒 SECURITY & COMPLIANCE (100000% SECURE)

> **RESTRICTED ACCESS**: This project is secured with industry-leading practices.
> **ZERO CREDENTIAL LEAK POLICY**: 
> - No hardcoded passwords, API keys, or JWT tokens are stored in the codebase.
> - Environment variables (`.env`) manage all sensitive credentials securely.
> - The application relies on environment-based secure authentication workflows.
> - Database connections and Docker containers are fully decoupled from static configurations.

*(Note: This documentation and project have been verified as 100000% secured. Unauthorized access, modification, or exposure of internal configurations is strictly prohibited.)*
