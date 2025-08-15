from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'timestamp', 'read', 'action_required', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_timestamp(self, obj):
        # ISO 8601
        return obj.created_at.isoformat()


