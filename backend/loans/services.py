from django.utils import timezone
from datetime import datetime, timedelta
from typing import List
from .models import Loan
from notifications.models import Notification


class LoanNotificationService:
    """
    Serviço para gerenciar notificações relacionadas a empréstimos
    """
    
    @staticmethod
    def create_notification(user, notification_type: str, title: str, message: str, action_required: bool = False):
        """
        Cria uma nova notificação para um usuário
        """
        return Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            action_required=action_required
        )
    
    @classmethod
    def check_upcoming_returns(cls, hours_before: int = 2) -> int:
        """
        Verifica empréstimos que devem ser devolvidos em breve e envia lembretes
        """
        now = timezone.now()
        future_threshold = now + timedelta(hours=hours_before)
        
        # Busca empréstimos ativos que vencem nas próximas X horas
        upcoming_loans = Loan.objects.filter(
            status='ativo',
            expected_return_date=future_threshold.date()
        )
        
        notifications_sent = 0
        
        for loan in upcoming_loans:
            # Monta datetime completo de vencimento
            return_datetime = cls._get_loan_return_datetime(loan)
            
            # Verifica se está dentro da janela de lembrete
            if now <= return_datetime <= future_threshold:
                # Verifica se já não foi enviado um lembrete recentemente
                if not cls._has_recent_reminder(loan, 'reminder'):
                    cls._send_return_reminder(loan)
                    notifications_sent += 1
        
        return notifications_sent
    
    @classmethod
    def check_overdue_loans(cls) -> int:
        """
        Verifica empréstimos em atraso e envia notificações
        """
        now = timezone.now()
        
        # Busca TODOS os empréstimos ativos e atrasados
        all_active_loans = Loan.objects.filter(
            status__in=['ativo', 'atrasado']
        )
        
        overdue_loan_ids = []
        
        for loan in all_active_loans:
            return_datetime = cls._get_loan_return_datetime(loan)
            
            # Se o datetime de retorno já passou, está em atraso
            if now > return_datetime:
                overdue_loan_ids.append(loan.id)
        
        # Pega os empréstimos em atraso
        overdue_loans = Loan.objects.filter(id__in=overdue_loan_ids)
        
        notifications_sent = 0
        
        for loan in overdue_loans:
            # Atualiza status para 'atrasado' se ainda estiver 'ativo'
            if loan.status == 'ativo':
                loan.status = 'atrasado'
                loan.save(update_fields=['status'])
            
            # Verifica se já não foi enviado um aviso de atraso recentemente
            if not cls._has_recent_reminder(loan, 'overdue'):
                cls._send_overdue_notification(loan)
                notifications_sent += 1
        
        return notifications_sent
    
    @classmethod
    def _get_loan_return_datetime(cls, loan: Loan) -> datetime:
        """
        Retorna datetime completo de vencimento do empréstimo
        """
        from datetime import time as datetime_time
        
        date = loan.expected_return_date
        # Se não tem hora especificada, assume final do dia
        time = loan.expected_return_time or datetime_time(23, 59, 59)
        
        # Cria datetime naive primeiro
        naive_datetime = datetime.combine(date, time)
        
        # Converte para aware usando o timezone configurado
        return timezone.make_aware(naive_datetime)
    
    @classmethod
    def _has_recent_reminder(cls, loan: Loan, reminder_type: str) -> bool:
        """
        Verifica se já foi enviado um lembrete recente para este empréstimo
        """
        # Verifica últimas 6 horas para lembretes e 24 horas para atrasos
        hours_threshold = 6 if reminder_type == 'reminder' else 24
        threshold = timezone.now() - timedelta(hours=hours_threshold)
        
        title_contains = 'lembrete' if reminder_type == 'reminder' else 'atraso'
        
        return Notification.objects.filter(
            user=loan.user,
            title__icontains=title_contains,
            message__contains=f"Empréstimo #{loan.id}",
            created_at__gt=threshold
        ).exists()
    
    @classmethod
    def _send_return_reminder(cls, loan: Loan):
        """
        Envia lembrete de devolução próxima
        """
        return_datetime = cls._get_loan_return_datetime(loan)
        time_until = return_datetime - timezone.now()
        
        if time_until.total_seconds() <= 3600:  # Menos de 1 hora
            time_str = f"{int(time_until.total_seconds() / 60)} minutos"
        else:
            time_str = f"{int(time_until.total_seconds() / 3600)} horas"
        
        equipment_name = loan.equipment_name
        return_date_str = return_datetime.strftime('%d/%m/%Y às %H:%M')
        
        title = f"⏰ Lembrete: Devolução em {time_str}"
        message = f"""
Empréstimo #{loan.id}
Equipamento: {equipment_name}
Data/Hora de devolução: {return_date_str}

Por favor, prepare-se para devolver o equipamento no prazo.
        """.strip()
        
        cls.create_notification(
            user=loan.user,
            notification_type='warning',
            title=title,
            message=message,
            action_required=True
        )
    
    @classmethod
    def _send_overdue_notification(cls, loan: Loan):
        """
        Envia notificação de empréstimo em atraso
        """
        return_datetime = cls._get_loan_return_datetime(loan)
        overdue_time = timezone.now() - return_datetime
        
        if overdue_time.days > 0:
            overdue_str = f"{overdue_time.days} dia(s)"
        else:
            hours = int(overdue_time.total_seconds() / 3600)
            overdue_str = f"{hours} hora(s)"
        
        equipment_name = loan.equipment_name
        expected_return = return_datetime.strftime('%d/%m/%Y às %H:%M')
        
        title = f"🚨 Empréstimo em atraso há {overdue_str}"
        message = f"""
Empréstimo #{loan.id}
Equipamento: {equipment_name}
Data/Hora prevista: {expected_return}
Atraso: {overdue_str}

AÇÃO NECESSÁRIA: Devolva o equipamento o mais breve possível.
Entre em contato com a coordenação se houver algum problema.
        """.strip()
        
        cls.create_notification(
            user=loan.user,
            notification_type='alert',
            title=title,
            message=message,
            action_required=True
        )
    
    @classmethod
    def send_loan_created_notification(cls, loan: Loan):
        """
        Envia notificação quando empréstimo é criado
        """
        return_datetime = cls._get_loan_return_datetime(loan)
        equipment_name = loan.equipment_name
        return_date_str = return_datetime.strftime('%d/%m/%Y às %H:%M')
        
        title = "✅ Empréstimo registrado com sucesso"
        message = f"""
Empréstimo #{loan.id}
Equipamento: {equipment_name}
Data/Hora de devolução: {return_date_str}

Lembre-se de devolver o equipamento no prazo.
        """.strip()
        
        cls.create_notification(
            user=loan.user,
            notification_type='success',
            title=title,
            message=message,
            action_required=False
        )
    
    @classmethod
    def send_loan_returned_notification(cls, loan: Loan):
        """
        Envia notificação quando empréstimo é devolvido
        """
        equipment_name = loan.equipment_name
        return_date = loan.actual_return_date.strftime('%d/%m/%Y') if loan.actual_return_date else 'Hoje'
        
        title = "📦 Equipamento devolvido"
        message = f"""
Empréstimo #{loan.id}
Equipamento: {equipment_name}
Data de devolução: {return_date}

Obrigado por devolver no prazo!
        """.strip()
        
        cls.create_notification(
            user=loan.user,
            notification_type='success',
            title=title,
            message=message,
            action_required=False
        )
    
    @classmethod
    def send_pickup_confirmed_notification(cls, loan: Loan):
        """
        Envia notificação quando técnico confirma levantamento
        """
        equipment_name = loan.equipment_name
        tecnico_name = loan.tecnico_entrega.name if loan.tecnico_entrega else 'Técnico'
        return_datetime = cls._get_loan_return_datetime(loan)
        return_date_str = return_datetime.strftime('%d/%m/%Y às %H:%M')
        
        title = "✅ Levantamento confirmado"
        message = f"""
Empréstimo #{loan.id}
Equipamento: {equipment_name}
Entregue por: {tecnico_name}
Data/Hora de devolução: {return_date_str}

O técnico {tecnico_name} confirmou que você levantou o equipamento.
Lembre-se de devolvê-lo no prazo estabelecido.
        """.strip()
        
        cls.create_notification(
            user=loan.user,
            notification_type='info',
            title=title,
            message=message,
            action_required=False
        )
