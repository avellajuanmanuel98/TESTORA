from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.organizations import get_current_organization
from apps.organizations.serializers import OrganizationSerializer
from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]
        read_only_fields = fields


class MeSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    organization_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "organization", "organization_role"]
        read_only_fields = fields

    def get_organization(self, user):
        organization = get_current_organization(user)
        return OrganizationSerializer(organization).data if organization else None

    def get_organization_role(self, user):
        membership = user.organization_memberships.select_related("organization").first()
        return membership.role if membership else None


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds the authenticated user (and their organization) to the login
    response so the frontend doesn't need a second round trip on sign-in."""

    default_error_messages = {"no_active_account": "Correo o contraseña incorrectos."}

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user).data
        return data
