from django.db import models


class TimestampedModel(models.Model):
    """Shared audit columns. Full history/versioning is deliberately out of
    scope until a feature actually needs it (see architecture notes)."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
