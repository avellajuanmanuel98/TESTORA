from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _cipher() -> Fernet:
    return Fernet(settings.FIELD_ENCRYPTION_KEY)


class EncryptedTextField(models.TextField):
    """Stores its value encrypted at rest (Fernet). Used for anything that
    might hold a credential or secret — never store those in plain text.
    Transparent on the Python side: assign/read a normal string."""

    def get_prep_value(self, value):
        if value is None:
            return value
        return _cipher().encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            return _cipher().decrypt(value.encode()).decode()
        except InvalidToken:
            return ""
