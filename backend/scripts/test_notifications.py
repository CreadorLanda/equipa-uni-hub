#!/usr/bin/env python3
"""
Script de teste para o sistema de notificações de empréstimos
"""

import os
import sys
import django
from datetime import datetime, timedelta
from pathlib import Path

# Adicionar o diretório backend ao path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'equipahub.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from loans.models import Loan
from equipment.models import Equipment
from loans.services import LoanNotificationService
from notifications.models import Notification

User = get_user_model()


def create_test_data():
    """Cria dados de teste para empréstimos"""
    print("📋 Criando dados de teste...")
    
    # Criar usuário de teste
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={
            'name': 'Usuário Teste',
            'role': 'docente',
            'is_active': True
        }
    )
    if created:
        user.set_password('password123')
        user.save()
    
    print(f"👤 Usuário: {user.name} ({user.email})")
    
    # Criar equipamento de teste
    equipment, created = Equipment.objects.get_or_create(
        serial_number='TEST001',
        defaults={
            'brand': 'MacBook',
            'model': 'Pro 13"',
            'type': 'notebook',
            'status': 'disponivel',
            'acquisition_date': timezone.now().date(),
            'description': 'Equipamento de teste'
        }
    )
    
    print(f"💻 Equipamento: {equipment.brand} {equipment.model}")
    
    return user, equipment


def test_loan_reminder():
    """Testa lembrete de devolução"""
    print("\n⏰ Testando lembrete de devolução...")
    
    user, equipment = create_test_data()
    
    # Criar empréstimo que vence em 1 hora
    now = timezone.now()
    return_datetime = now + timedelta(hours=1)
    
    loan = Loan.objects.create(
        user=user,
        equipment=equipment,
        expected_return_date=return_datetime.date(),
        expected_return_time=return_datetime.time(),
        purpose='Teste de lembrete',
        status='ativo'
    )
    
    print(f"📝 Empréstimo criado: #{loan.id}")
    print(f"📅 Vence em: {return_datetime.strftime('%d/%m/%Y às %H:%M')}")
    
    # Testar lembrete
    reminders_sent = LoanNotificationService.check_upcoming_returns(hours_before=2)
    
    notifications = Notification.objects.filter(user=user).order_by('-created_at')[:1]
    
    if notifications.exists():
        notification = notifications.first()
        print(f"✅ Lembrete criado: {notification.title}")
        print(f"📨 Mensagem: {notification.message[:100]}...")
        print(f"🔔 Tipo: {notification.type}")
    else:
        print("❌ Nenhum lembrete foi criado")
    
    return loan


def test_overdue_notification():
    """Testa notificação de atraso"""
    print("\n🚨 Testando notificação de atraso...")
    
    user, equipment = create_test_data()
    
    # Criar empréstimo em atraso
    now = timezone.now()
    past_datetime = now - timedelta(hours=2)
    
    loan = Loan.objects.create(
        user=user,
        equipment=equipment,
        expected_return_date=past_datetime.date(),
        expected_return_time=past_datetime.time(),
        purpose='Teste de atraso',
        status='ativo'
    )
    
    print(f"📝 Empréstimo criado: #{loan.id}")
    print(f"📅 Deveria ter sido devolvido: {past_datetime.strftime('%d/%m/%Y às %H:%M')}")
    
    # Testar atraso
    overdue_sent = LoanNotificationService.check_overdue_loans()
    
    # Verificar se o status foi atualizado
    loan.refresh_from_db()
    print(f"📊 Status atualizado: {loan.status}")
    
    notifications = Notification.objects.filter(
        user=user,
        type='alert'
    ).order_by('-created_at')[:1]
    
    if notifications.exists():
        notification = notifications.first()
        print(f"✅ Notificação de atraso criada: {notification.title}")
        print(f"📨 Mensagem: {notification.message[:100]}...")
        print(f"🔔 Tipo: {notification.type}")
    else:
        print("❌ Nenhuma notificação de atraso foi criada")
    
    return loan


def test_loan_created_notification():
    """Testa notificação de empréstimo criado"""
    print("\n✅ Testando notificação de empréstimo criado...")
    
    user, equipment = create_test_data()
    
    # Criar empréstimo
    now = timezone.now()
    return_datetime = now + timedelta(days=3)
    
    loan = Loan.objects.create(
        user=user,
        equipment=equipment,
        expected_return_date=return_datetime.date(),
        expected_return_time=return_datetime.time(),
        purpose='Teste de criação',
        status='ativo'
    )
    
    print(f"📝 Empréstimo criado: #{loan.id}")
    
    # Testar notificação
    LoanNotificationService.send_loan_created_notification(loan)
    
    notifications = Notification.objects.filter(
        user=user,
        type='success'
    ).order_by('-created_at')[:1]
    
    if notifications.exists():
        notification = notifications.first()
        print(f"✅ Notificação criada: {notification.title}")
        print(f"📨 Mensagem: {notification.message[:100]}...")
    else:
        print("❌ Nenhuma notificação foi criada")
    
    return loan


def test_loan_returned_notification():
    """Testa notificação de devolução"""
    print("\n📦 Testando notificação de devolução...")
    
    user, equipment = create_test_data()
    
    # Criar empréstimo e marcar como devolvido
    loan = Loan.objects.create(
        user=user,
        equipment=equipment,
        expected_return_date=timezone.now().date(),
        purpose='Teste de devolução',
        status='ativo'
    )
    
    # Marcar como devolvido
    loan.return_equipment()
    
    print(f"📝 Empréstimo devolvido: #{loan.id}")
    
    # Testar notificação
    LoanNotificationService.send_loan_returned_notification(loan)
    
    notifications = Notification.objects.filter(
        user=user,
        type='success'
    ).order_by('-created_at')[:1]
    
    if notifications.exists():
        notification = notifications.first()
        print(f"✅ Notificação criada: {notification.title}")
        print(f"📨 Mensagem: {notification.message[:100]}...")
    else:
        print("❌ Nenhuma notificação foi criada")
    
    return loan


def show_stats():
    """Mostra estatísticas dos testes"""
    print("\n📊 Estatísticas:")
    print(f"👤 Usuários: {User.objects.count()}")
    print(f"💻 Equipamentos: {Equipment.objects.count()}")
    print(f"📋 Empréstimos: {Loan.objects.count()}")
    print(f"🔔 Notificações: {Notification.objects.count()}")
    
    # Notificações por tipo
    print("\n🔔 Notificações por tipo:")
    for notification_type in ['alert', 'warning', 'success', 'info']:
        count = Notification.objects.filter(type=notification_type).count()
        icons = {'alert': '🚨', 'warning': '⚠️', 'success': '✅', 'info': '🔵'}
        print(f"   {icons[notification_type]} {notification_type.title()}: {count}")


def cleanup():
    """Limpa dados de teste"""
    response = input("\n🧹 Deseja limpar os dados de teste? (s/N): ")
    if response.lower() == 's':
        print("🧹 Limpando dados de teste...")
        Notification.objects.filter(user__email='test@example.com').delete()
        Loan.objects.filter(user__email='test@example.com').delete()
        Equipment.objects.filter(serial_number__startswith='TEST').delete()
        User.objects.filter(email='test@example.com').delete()
        print("✅ Dados de teste removidos")


def main():
    """Função principal"""
    print("🧪 Sistema de Teste de Notificações de Empréstimos")
    print("=" * 60)
    
    try:
        # Executar testes
        test_loan_created_notification()
        test_loan_reminder()
        test_overdue_notification()
        test_loan_returned_notification()
        
        # Mostrar estatísticas
        show_stats()
        
        # Opção de limpeza
        cleanup()
        
    except Exception as e:
        print(f"❌ Erro durante os testes: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✅ Testes concluídos!")


if __name__ == "__main__":
    main()