from django.db import models
from django.conf import settings


class Notification(models.Model):
    """Notificação destinada a um usuário específico"""
    TYPE_CHOICES = [
        ('alert', 'Alerta'),
        ('warning', 'Aviso'),
        ('success', 'Sucesso'),
        ('info', 'Informação'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    action_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"[{self.type}] {self.title} -> {self.user_id}"


