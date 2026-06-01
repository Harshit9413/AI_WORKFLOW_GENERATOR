PATTERNS: list[str] = [
    """PATTERN: Single-Vendor Ecommerce
NODES: User (client), Auth Service (security), API Gateway (service), Product Service (service), Order Service (service), Cart Service (service), Message Queue (queue), PostgreSQL (datastore), Redis Cache (datastore), S3 Storage (storage)
EDGES: User→Auth Service (HTTP/REST), User→API Gateway (HTTP/REST), API Gateway→Product Service (HTTP/REST), API Gateway→Order Service (HTTP/REST), API Gateway→Cart Service (HTTP/REST), Order Service→Message Queue (Publishes), Order Service→PostgreSQL (SQL), Product Service→PostgreSQL (SQL), Cart Service→Redis Cache (Cache write), Product Service→S3 Storage (Reads)
USE CASE: Traditional online store with a single seller, product catalog, cart, checkout, and order management.""",

    """PATTERN: Microservices on AWS
NODES: Client (client), ALB (service), Auth Service (security), User Service (service), Product Service (service), Order Service (service), Notification Service (service), SQS (queue), RDS (datastore), DynamoDB (datastore), ElastiCache (datastore), S3 (storage), CloudWatch (cloud)
EDGES: Client→ALB (HTTP/REST), ALB→Auth Service (HTTP/REST), ALB→User Service (HTTP/REST), ALB→Product Service (HTTP/REST), ALB→Order Service (HTTP/REST), Order Service→SQS (Publishes), SQS→Notification Service (Subscribes), Order Service→RDS (SQL), Product Service→DynamoDB (NoSQL), User Service→ElastiCache (Cache read), Product Service→S3 (Stores), CloudWatch→Order Service (Monitors)
USE CASE: Cloud-native microservices architecture on AWS with independent deployable services.""",

    """PATTERN: Event-Driven Architecture
NODES: Producer Service (service), API Gateway (service), Kafka (queue), Consumer A (service), Consumer B (service), Consumer C (service), PostgreSQL (datastore), MongoDB (datastore), Elasticsearch (datastore), Redis (datastore)
EDGES: API Gateway→Producer Service (HTTP/REST), Producer Service→Kafka (Publishes), Kafka→Consumer A (Subscribes), Kafka→Consumer B (Subscribes), Kafka→Consumer C (Subscribes), Consumer A→PostgreSQL (SQL), Consumer B→MongoDB (NoSQL), Consumer C→Elasticsearch (NoSQL), Consumer A→Redis (Cache write)
USE CASE: High-throughput event streaming where multiple consumers process the same events independently.""",

    """PATTERN: Serverless API on AWS
NODES: Client (client), CloudFront (storage), API Gateway (service), Lambda Auth (security), Lambda Users (service), Lambda Products (service), Lambda Orders (service), DynamoDB (datastore), S3 (storage), SQS (queue)
EDGES: Client→CloudFront (HTTPS), CloudFront→API Gateway (HTTP/REST), API Gateway→Lambda Auth (HTTP/REST), Lambda Auth→Lambda Users (HTTP/REST), Lambda Auth→Lambda Products (HTTP/REST), Lambda Auth→Lambda Orders (HTTP/REST), Lambda Users→DynamoDB (NoSQL), Lambda Products→DynamoDB (NoSQL), Lambda Orders→SQS (Publishes), Lambda Products→S3 (Stores)
USE CASE: Pay-per-request serverless backend with auto-scaling Lambda functions.""",

    """PATTERN: RAG AI Pipeline
NODES: User (client), FastAPI (service), Embedding Service (service), Vector DB (datastore), LLM Service (service), Document Store (storage), Redis Cache (datastore), PostgreSQL (datastore)
EDGES: User→FastAPI (HTTP/REST), FastAPI→Embedding Service (HTTP/REST), Embedding Service→Vector DB (NoSQL), Vector DB→FastAPI (HTTP/REST), FastAPI→LLM Service (HTTP/REST), FastAPI→Redis Cache (Cache read), FastAPI→PostgreSQL (SQL), Document Store→Embedding Service (Reads)
USE CASE: Retrieval-Augmented Generation pipeline for question answering over a private document corpus.""",

    """PATTERN: Real-time Data Streaming
NODES: IoT Devices (client), Kafka (queue), Stream Processor (service), Aggregator (service), Time Series DB (datastore), PostgreSQL (datastore), Grafana (service), S3 (storage), Redis (datastore)
EDGES: IoT Devices→Kafka (Publishes), Kafka→Stream Processor (Subscribes), Stream Processor→Aggregator (Async), Stream Processor→Time Series DB (NoSQL), Aggregator→PostgreSQL (SQL), Grafana→Time Series DB (Reads), Stream Processor→S3 (Stores), Stream Processor→Redis (Cache write)
USE CASE: Real-time ingestion and processing of high-volume sensor or event data with time-series analytics.""",

    """PATTERN: Kubernetes Deployment
NODES: User (client), Ingress (service), Auth Pod (security), API Pod (service), Worker Pod (service), Redis (datastore), PostgreSQL (datastore), RabbitMQ (queue), S3 (storage), Prometheus (service)
EDGES: User→Ingress (HTTP/REST), Ingress→Auth Pod (HTTP/REST), Auth Pod→API Pod (HTTP/REST), API Pod→Worker Pod (Async), API Pod→PostgreSQL (SQL), API Pod→Redis (Cache read), Worker Pod→RabbitMQ (Publishes), RabbitMQ→Worker Pod (Subscribes), Worker Pod→S3 (Stores), Prometheus→API Pod (Monitors)
USE CASE: Container-orchestrated microservices with autoscaling, service discovery, and built-in observability.""",

    """PATTERN: Data Engineering Pipeline
NODES: Data Sources (client), Airflow (service), Spark (service), Data Lake (storage), Data Warehouse (datastore), dbt (service), BI Tool (service), Redis (datastore), PostgreSQL (datastore)
EDGES: Data Sources→Airflow (HTTP/REST), Airflow→Spark (Async), Spark→Data Lake (Stores), Spark→Data Warehouse (SQL), dbt→Data Warehouse (SQL), BI Tool→Data Warehouse (SQL), Airflow→Redis (Cache write), Airflow→PostgreSQL (SQL)
USE CASE: Batch ETL pipeline orchestrated by Airflow, transforming raw data into analytics-ready warehouse tables.""",

    """PATTERN: SaaS Multi-Tenant Platform
NODES: Browser (client), CDN (storage), Load Balancer (service), Auth Service (security), Tenant Router (service), Tenant A API (service), Tenant B API (service), Shared DB (datastore), Redis (datastore), S3 (storage)
EDGES: Browser→CDN (HTTPS), CDN→Load Balancer (HTTP/REST), Load Balancer→Auth Service (HTTP/REST), Auth Service→Tenant Router (HTTP/REST), Tenant Router→Tenant A API (HTTP/REST), Tenant Router→Tenant B API (HTTP/REST), Tenant A API→Shared DB (SQL), Tenant B API→Shared DB (SQL), Tenant A API→Redis (Cache read), Tenant A API→S3 (Stores)
USE CASE: Multi-tenant SaaS platform with tenant isolation at the API layer and shared infrastructure.""",

    """PATTERN: Mobile App Backend
NODES: Mobile App (client), API Gateway (service), Auth Service (security), Push Service (service), User Service (service), Content Service (service), MongoDB (datastore), Redis (datastore), S3 (storage), Firebase (cloud)
EDGES: Mobile App→API Gateway (HTTPS), API Gateway→Auth Service (HTTP/REST), Auth Service→User Service (HTTP/REST), Auth Service→Content Service (HTTP/REST), User Service→MongoDB (NoSQL), Content Service→S3 (Reads), User Service→Redis (Cache write), Push Service→Firebase (HTTPS), Content Service→Push Service (Async)
USE CASE: REST backend powering a mobile app with authentication, content delivery, and push notifications.""",

    """PATTERN: Fullstack Web Application
NODES: Browser (client), React App (client), Nginx (service), FastAPI (service), Celery Worker (service), PostgreSQL (datastore), Redis (datastore), S3 (storage), SMTP (cloud)
EDGES: Browser→Nginx (HTTP/REST), Nginx→React App (HTTP/REST), React App→FastAPI (HTTP/REST), FastAPI→PostgreSQL (SQL), FastAPI→Redis (Cache read), FastAPI→Celery Worker (Async), Celery Worker→SMTP (HTTPS), Celery Worker→S3 (Stores), Celery Worker→PostgreSQL (SQL)
USE CASE: Traditional fullstack web app with a React SPA frontend, FastAPI backend, and async background jobs.""",

    """PATTERN: CQRS with Event Sourcing
NODES: Client (client), Command API (service), Query API (service), Event Store (datastore), Read Model DB (datastore), Event Bus (queue), Projection Worker (service), Redis Cache (datastore)
EDGES: Client→Command API (HTTP/REST), Client→Query API (HTTP/REST), Command API→Event Store (SQL), Command API→Event Bus (Publishes), Event Bus→Projection Worker (Subscribes), Projection Worker→Read Model DB (SQL), Query API→Read Model DB (SQL), Query API→Redis Cache (Cache read)
USE CASE: CQRS pattern separating write commands from read queries, with event sourcing for full audit history.""",

    """PATTERN: API-First Monolith
NODES: Browser (client), Mobile (client), API Gateway (service), Monolith API (service), Auth Module (security), PostgreSQL (datastore), Redis (datastore), S3 (storage), Celery (queue)
EDGES: Browser→API Gateway (HTTP/REST), Mobile→API Gateway (HTTP/REST), API Gateway→Auth Module (HTTP/REST), Auth Module→Monolith API (HTTP/REST), Monolith API→PostgreSQL (SQL), Monolith API→Redis (Cache write), Monolith API→S3 (Stores), Monolith API→Celery (Publishes)
USE CASE: Well-structured monolith serving multiple clients via a single versioned REST API.""",

    """PATTERN: Jamstack with Headless CMS
NODES: Browser (client), CDN (storage), Static Site (client), API Gateway (service), Headless CMS (service), Auth Service (security), PostgreSQL (datastore), S3 (storage), Algolia (cloud)
EDGES: Browser→CDN (HTTPS), CDN→Static Site (HTTP/REST), Static Site→API Gateway (HTTP/REST), API Gateway→Auth Service (HTTP/REST), API Gateway→Headless CMS (HTTP/REST), Headless CMS→PostgreSQL (SQL), Headless CMS→S3 (Stores), Static Site→Algolia (HTTPS)
USE CASE: Statically generated frontend with a headless CMS backend, CDN delivery, and API-driven dynamic data.""",

    """PATTERN: ML Model Training Pipeline
NODES: Data Scientists (client), Jupyter (service), MLflow (service), Training Cluster (service), Model Registry (storage), Feature Store (datastore), PostgreSQL (datastore), S3 (storage), Grafana (service)
EDGES: Data Scientists→Jupyter (HTTP/REST), Jupyter→MLflow (HTTP/REST), MLflow→Training Cluster (Async), Training Cluster→Feature Store (Reads), Training Cluster→S3 (Stores), MLflow→Model Registry (Stores), Model Registry→PostgreSQL (SQL), Grafana→MLflow (Monitors)
USE CASE: End-to-end ML training pipeline with experiment tracking, feature store, and model versioning.""",

    """PATTERN: IoT Data Ingestion
NODES: IoT Devices (client), MQTT Broker (queue), Ingestion Service (service), Stream Processor (service), Time Series DB (datastore), Alert Service (service), S3 (storage), Dashboard (service), Redis (datastore)
EDGES: IoT Devices→MQTT Broker (Publishes), MQTT Broker→Ingestion Service (Subscribes), Ingestion Service→Stream Processor (Async), Stream Processor→Time Series DB (NoSQL), Stream Processor→Alert Service (Async), Alert Service→Redis (Cache read), Stream Processor→S3 (Stores), Dashboard→Time Series DB (Reads)
USE CASE: Ingestion and real-time processing of telemetry from thousands of IoT devices with alerting.""",

    """PATTERN: Real-time Chat Application
NODES: Browser (client), Load Balancer (service), Chat Server (service), Auth Service (security), WebSocket Hub (service), Message Queue (queue), PostgreSQL (datastore), Redis (datastore), S3 (storage)
EDGES: Browser→Load Balancer (HTTPS), Load Balancer→Auth Service (HTTP/REST), Auth Service→Chat Server (HTTP/REST), Chat Server→WebSocket Hub (HTTP/REST), WebSocket Hub→Message Queue (Publishes), Message Queue→WebSocket Hub (Subscribes), Chat Server→PostgreSQL (SQL), WebSocket Hub→Redis (Cache write), Chat Server→S3 (Stores)
USE CASE: Scalable real-time chat with WebSocket connections, message persistence, and media attachments.""",

    """PATTERN: GraphQL Federation
NODES: Client (client), Apollo Router (service), Auth Service (security), Users Subgraph (service), Products Subgraph (service), Orders Subgraph (service), PostgreSQL (datastore), MongoDB (datastore), Redis Cache (datastore)
EDGES: Client→Apollo Router (HTTP/REST), Apollo Router→Auth Service (HTTP/REST), Auth Service→Users Subgraph (HTTP/REST), Auth Service→Products Subgraph (HTTP/REST), Auth Service→Orders Subgraph (HTTP/REST), Users Subgraph→PostgreSQL (SQL), Products Subgraph→MongoDB (NoSQL), Orders Subgraph→PostgreSQL (SQL), Apollo Router→Redis Cache (Cache read)
USE CASE: Federated GraphQL architecture composing multiple independent subgraphs into a unified API.""",

    """PATTERN: Backend for Frontend (BFF)
NODES: Web Browser (client), Mobile App (client), Web BFF (service), Mobile BFF (service), Auth Service (security), User API (service), Product API (service), Order API (service), PostgreSQL (datastore), Redis (datastore)
EDGES: Web Browser→Web BFF (HTTP/REST), Mobile App→Mobile BFF (HTTP/REST), Web BFF→Auth Service (HTTP/REST), Mobile BFF→Auth Service (HTTP/REST), Auth Service→User API (HTTP/REST), Web BFF→Product API (HTTP/REST), Mobile BFF→Order API (HTTP/REST), User API→PostgreSQL (SQL), Product API→Redis (Cache read)
USE CASE: Separate BFF layers for web and mobile clients, each optimised for their client's data requirements.""",

    """PATTERN: Video Streaming Platform
NODES: Browser (client), CDN (storage), API Gateway (service), Auth Service (security), Upload Service (service), Transcoding Service (service), Metadata Service (service), Message Queue (queue), PostgreSQL (datastore), S3 (storage)
EDGES: Browser→CDN (HTTPS), Browser→API Gateway (HTTP/REST), API Gateway→Auth Service (HTTP/REST), Auth Service→Upload Service (HTTP/REST), Auth Service→Metadata Service (HTTP/REST), Upload Service→S3 (Stores), Upload Service→Message Queue (Publishes), Message Queue→Transcoding Service (Subscribes), Transcoding Service→S3 (Stores), Metadata Service→PostgreSQL (SQL)
USE CASE: Video upload, transcoding, and streaming platform with CDN delivery and async processing.""",
]
