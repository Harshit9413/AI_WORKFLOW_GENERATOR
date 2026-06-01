from app.graph.icon_resolver import _normalise, resolve_icon


def test_normalise_lowercases():
    assert _normalise("AWS Lambda") == "aws-lambda"


def test_normalise_strips_special_chars():
    assert _normalise("Amazon S3!") == "amazon-s3"


def test_normalise_collapses_multiple_separators():
    assert _normalise("Google  Cloud  Storage") == "google-cloud-storage"


def test_resolve_icon_exact_match():
    # Build a minimal fake index
    fake_index = {"aws-lambda": "aws-lambda.svg", "redis": "redis.svg"}
    result = resolve_icon("AWS Lambda", _index=fake_index)
    assert result == "/static/icons/aws-lambda.svg"


def test_resolve_icon_fuzzy_match():
    fake_index = {"aws-lambda": "aws-lambda.svg", "redis": "redis.svg"}
    # "AWS Lambdaa" is close enough to "aws-lambda"
    result = resolve_icon("AWS Lambdaa", _index=fake_index)
    assert result == "/static/icons/aws-lambda.svg"


def test_resolve_icon_returns_none_when_no_match():
    fake_index = {"aws-lambda": "aws-lambda.svg"}
    result = resolve_icon("zxqyfoo", _index=fake_index)
    assert result is None


def test_resolve_icon_returns_none_on_empty_index():
    result = resolve_icon("AWS Lambda", _index={})
    assert result is None


def test_resolve_icon_case_insensitive():
    fake_index = {"redis": "redis.svg"}
    result = resolve_icon("Redis", _index=fake_index)
    assert result == "/static/icons/redis.svg"
