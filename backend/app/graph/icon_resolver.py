import logging
import re
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

_ICONS_DIR = Path(__file__).parent.parent.parent.parent / "icons"
_SCORE_CUTOFF = 80        # fuzz.ratio – close spellings / minor edits
_TOKEN_CUTOFF = 75        # fuzz.token_set_ratio – word-reorder / multi-word labels
_PARTIAL_CUTOFF = 90      # fuzz.partial_ratio on cloud icons – label is substring of key


_CLOUD_PREFIXES = (
    "aws-", "amazon-", "azure-", "microsoft-azure-",
    "google-cloud-", "google-", "gcp-", "oci-",
)

# Curated aliases for well-known abbreviations whose full icon filename
# cannot be derived from the abbreviation alone.
_ALIASES: dict[str, str] = {
    "s3":        "aws-simple-storage-service.svg",
    "sqs":       "aws-simple-queue-service.svg",
    "sns":       "aws-simple-notification-service.svg",
    "ses":       "aws-simple-email-service.svg",
    "ecs":       "aws-elastic-container-service.svg",
    "eks":       "aws-elastic-kubernetes-service.svg",
    "elb":       "aws-elastic-load-balancing.svg",
    "alb":       "aws-elb-application-load-balancer.svg",
    "nlb":       "aws-elb-network-load-balancer.svg",
    "ecr":       "aws-elastic-container-registry.svg",
    "k8s":       "kubernetes.svg",
    "k8":        "kubernetes.svg",
}


def _normalise(label: str) -> str:
    label = label.lower()
    label = re.sub(r"[^a-z0-9]+", "-", label)
    return label.strip("-")


def _build_index(icons_dir: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Return (full_index, cloud_index).

    full_index  — maps normalised stem → filename; includes one short-name
                  entry per cloud-prefixed icon (e.g. "ec2" → "aws-ec2.svg").
    cloud_index — maps normalised stem → filename for cloud-prefixed icons only;
                  used as the search space for partial-ratio fallback matching.
    """
    if not icons_dir.exists():
        logger.warning(
            "icons directory not found at %s — icon_url will be None for all nodes",
            icons_dir,
        )
        return {}, {}

    full_index: dict[str, str] = {}
    short_names: dict[str, str] = {}   # stripped key → filename (cloud icons only)
    cloud_index: dict[str, str] = {}   # full cloud key → filename

    for f in icons_dir.iterdir():
        if f.suffix != ".svg":
            continue
        key = _normalise(f.stem)
        full_index[key] = f.name

        for prefix in _CLOUD_PREFIXES:
            if key.startswith(prefix):
                cloud_index[key] = f.name
                short_key = key[len(prefix):]
                if short_key:
                    short_names[short_key] = f.name
                break

    # Merge short names into full index without overwriting existing entries
    for k, v in short_names.items():
        if k not in full_index:
            full_index[k] = v

    logger.info(
        "icon_resolver: indexed %d icons (%d cloud, %d short-name shortcuts)",
        len(full_index), len(cloud_index), len(short_names),
    )
    return full_index, cloud_index


_INDEX, _CLOUD_INDEX = _build_index(_ICONS_DIR)


def resolve_icon(label: str, *, _index: dict[str, str] | None = None) -> Optional[str]:
    """Return the static-file path for the best-matching SVG icon, or None.

    Resolution order
    ----------------
    1. Curated alias table   — exact match for well-known abbreviations (S3, SQS …).
    2. Exact key match       — normalized label matches a full or short-name index key.
    3. fuzz.ratio            — handles typos / close spellings (cutoff 80).
    4. fuzz.token_set_ratio  — handles multi-word / reordered labels, e.g.
                               "Amazon EC2 Instance" → aws-ec2 (cutoff 75).
    5. fuzz.partial_ratio    — label is a substring of a cloud icon key (cutoff 90),
                               searched only against cloud-prefixed icons to avoid
                               false positives with short labels.

    Pass ``_index`` in tests to inject a fake index; aliases and cloud partial
    matching are skipped when a custom index is supplied.
    """
    using_real_index = _index is None
    index = _INDEX if using_real_index else _index
    cloud_index = _CLOUD_INDEX if using_real_index else {}

    if not index:
        return None

    key = _normalise(label)
    # Spaced version used for token-based matching (rapidfuzz tokenises on spaces)
    key_spaced = key.replace("-", " ")

    # 1. Curated alias
    if using_real_index:
        alias_file = _ALIASES.get(key)
        if alias_file:
            return f"/static/icons/{alias_file}"

    # 2. Exact match
    if key in index:
        return f"/static/icons/{index[key]}"

    # 3. Fuzzy ratio (close spelling / minor edits)
    match = process.extractOne(key, index.keys(), scorer=fuzz.ratio, score_cutoff=_SCORE_CUTOFF)
    if match:
        return f"/static/icons/{index[match[0]]}"

    # 4. Token-set ratio on cloud icons only – handles word-reorder / multi-word
    #    labels like "Amazon EC2 Instance" → aws-ec2, without false-positive
    #    matches against short generic icons like amazon.svg.
    if cloud_index:
        spaced_cloud = {k.replace("-", " "): k for k in cloud_index}
        match = process.extractOne(
            key_spaced, spaced_cloud.keys(), scorer=fuzz.token_set_ratio, score_cutoff=_TOKEN_CUTOFF
        )
        if match:
            original_key = spaced_cloud[match[0]]
            return f"/static/icons/{cloud_index[original_key]}"

    # 5. Partial-ratio on cloud icons only (label is a substring of the icon key)
    if cloud_index:
        match = process.extractOne(
            key, cloud_index.keys(), scorer=fuzz.partial_ratio, score_cutoff=_PARTIAL_CUTOFF
        )
        if match:
            return f"/static/icons/{cloud_index[match[0]]}"

    # 6. Per-word exact lookup — handles compound labels like "User / Client"
    #    (normalised to "user-client") where a single token matches an icon.
    #    Require ≥4 chars per word to avoid noise from short tokens ("of", "db").
    words = [w for w in key.split("-") if len(w) >= 4]
    for word in words:
        if word in index:
            return f"/static/icons/{index[word]}"

    return None
