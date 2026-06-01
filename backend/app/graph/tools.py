from langchain_core.tools import tool

from app.graph.icon_resolver import resolve_icon


@tool
def lookup_icon(service_name: str) -> str:
    """Look up the SVG icon URL for a cloud service or technology.

    Call this for EVERY distinct technology or cloud service you plan to include
    in the architecture diagram.  Use the canonical product / service name.

    Good examples:
      Cloud:     "EC2", "S3", "Lambda", "RDS", "CloudFront", "DynamoDB",
                 "SQS", "SNS", "ECS", "EKS", "CloudWatch", "Route 53",
                 "Azure VM", "GCP Cloud Run", "Google Cloud Storage"
      Databases: "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
                 "DynamoDB", "Cassandra", "CockroachDB"
      Queues:    "Kafka", "RabbitMQ", "Celery", "SQS", "Redis"
      Runtimes:  "Django", "FastAPI", "Flask", "Node.js", "Next.js", "React",
                 "Spring Boot", "Rails", "Laravel"
      Infra:     "Nginx", "Docker", "Kubernetes", "Terraform", "Consul"

    Returns the /static/icons/... URL, or empty string if no icon is available.
    """
    return resolve_icon(service_name) or ""
