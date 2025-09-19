import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'equipahub.settings')
django.setup()

from notifications.models import Notification
from django.contrib.auth import get_user_model
from django.utils import timezone

def create_test_notification():
    User = get_user_model()
    
    try:
        user = User.objects.first()
        if not user:
            print("❌ Nenhum usuário encontrado no sistema")
            return
        
        print(f"👤 Criando notificação para: {user.name} ({user.email})")
        
        # Criar notificação de teste de atraso
        notification = Notification.objects.create(
            user=user,
            type='alert',
            title='🚨 Empréstimo em atraso há 3 horas',
            message='Empréstimo #123\nEquipamento: HP EliteDesk 800\nData/Hora prevista: 19/09/2025 às 19:04\nAtraso: 3 horas\n\nAÇÃO NECESSÁRIA: Devolva o equipamento o mais breve possível.',
            action_required=True
        )
        
        print(f"✅ Notificação criada com sucesso!")
        print(f"🆔 ID: {notification.id}")
        print(f"📨 Título: {notification.title}")
        print(f"🕐 Criada em: {notification.created_at}")
        print("🔔 Deve aparecer no frontend em até 10 segundos!")
        
        # Verificar total de notificações
        total = Notification.objects.filter(user=user).count()
        print(f"📊 Total de notificações do usuário: {total}")
        
    except Exception as e:
        print(f"❌ Erro ao criar notificação: {e}")

if __name__ == "__main__":
    create_test_notification()