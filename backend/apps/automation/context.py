"""Resolves {{VARIABLE}} placeholders in step params against an
Environment's variables. EnvironmentVariable.value is already decrypted
transparently by EncryptedTextField (apps/core/fields.py) — no special
accessor needed."""

import re

VARIABLE_PATTERN = re.compile(r"\{\{\s*(\w+)\s*\}\}")


class ExecutionContext:
    def __init__(self, environment):
        self.environment = environment
        self.variables = {"BASE_URL": environment.base_url}
        self.variables.update({v.key: v.value for v in environment.variables.all()})

    def resolve(self, text):
        if not isinstance(text, str):
            return text
        return VARIABLE_PATTERN.sub(lambda m: str(self.variables.get(m.group(1), m.group(0))), text)
