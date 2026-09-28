from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Email-based auth. `username` is kept (Django admin relies on it) but
    is not what people log in with."""

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self) -> str:
        return self.full_name or self.email
