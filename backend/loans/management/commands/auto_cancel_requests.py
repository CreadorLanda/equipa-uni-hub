from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from loans.models import Loan, LoanRequest
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Cancela automaticamente solicitações/empréstimos que ficaram sem confirmação completa por X dias'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=None,
            help='Número de dias sem confirmação para auto-cancelar (padrão: valor em settings)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas lista o que seria cancelado, sem executar'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra informações detalhadas'
        )

    def handle(self, *args, **options):
        days = options['days'] or getattr(settings, 'AUTO_CANCEL_DAYS', 3)
        dry_run = options['dry_run']
        verbose = options['verbose']
        cutoff = timezone.now() - timedelta(days=days)
        today = timezone.now().date()

        self.stdout.write(f"🔍 Auto-cancel: solicitações sem confirmação há >{days} dias")
        if dry_run:
            self.stdout.write(self.style.WARNING("   Modo DRY-RUN — nenhuma alteração será feita"))

        total = 0

        # 1. LoanRequests pendentes/autorizadas sem confirmação completa
        pendentes = LoanRequest.objects.filter(
            status__in=['pendente', 'autorizado'],
            created_at__lt=cutoff
        )
        for req in pendentes:
            if req.confirmado_pelo_tecnico and req.confirmado_pelo_utente:
                continue
            if verbose:
                self.stdout.write(
                    f"  LR#{req.id} - {req.user_name} - status={req.status} "
                    f"criada={req.created_at.strftime('%d/%m/%Y')}"
                )
            if not dry_run:
                req.cancelar(
                    cancelador=None,
                    motivo=f'Cancelamento automático por falta de confirmação em {days} dias.'
                )
                Notification.objects.create(
                    user=req.user,
                    type='warning',
                    title='Solicitação cancelada automaticamente',
                    message=f'A solicitação #{req.id} foi cancelada por não ter sido confirmada dentro de {days} dias.',
                    action_required=False
                )
            total += 1

        # 2. Loans pendentes sem confirmação dupla
        loans_pendentes = Loan.objects.filter(
            status='pendente',
            created_at__lt=cutoff
        )
        for loan in loans_pendentes:
            if loan.confirmado_tecnico and loan.confirmado_utente:
                continue
            if verbose:
                self.stdout.write(
                    f"  Loan#{loan.id} - {loan.user_name} - criada={loan.created_at.strftime('%d/%m/%Y')}"
                )
            if not dry_run:
                loan.status = 'cancelado'
                loan.notes = f"{loan.notes or ''}\n\nCancelamento automático por falta de confirmação em {days} dias.".strip()
                loan.save()
                Notification.objects.create(
                    user=loan.user,
                    type='warning',
                    title='Empréstimo cancelado automaticamente',
                    message=f'O empréstimo #{loan.id} foi cancelado por não ter sido confirmado dentro de {days} dias.',
                    action_required=False
                )
            total += 1

        if total == 0:
            self.stdout.write(self.style.SUCCESS("✨ Nenhum registo para cancelar"))
        else:
            action = "seriam" if dry_run else "foram"
            self.stdout.write(self.style.SUCCESS(f"✅ {total} registo(s) {action} cancelados"))
