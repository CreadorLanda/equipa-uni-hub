from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from loans.models import Loan, LoanRequest
from notifications.models import Notification


NORMAL_EXPIRY_HOURS = 24
SPECIAL_EXPIRY_HOURS = 72


class Command(BaseCommand):
    help = 'Cancela automaticamente solicitações/empréstimos que expiraram sem confirmação'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Apenas lista, sem executar')
        parser.add_argument('--verbose', action='store_true', help='Mostra detalhes')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        now = timezone.now()
        total = 0

        self.stdout.write(f"🔍 Auto-cancel: solicitações sem confirmação no prazo")
        if dry_run:
            self.stdout.write(self.style.WARNING("   Modo DRY-RUN — sem alterações"))

        # LoanRequests: normais expiram 24h, especiais (com quantity) 72h
        for req in LoanRequest.objects.filter(status__in=['pendente', 'autorizado']):
            if req.confirmado_pelo_tecnico and req.confirmado_pelo_utente:
                continue
            expiry_hours = SPECIAL_EXPIRY_HOURS if req.is_special else NORMAL_EXPIRY_HOURS
            cutoff = req.created_at + timedelta(hours=expiry_hours)
            if now < cutoff:
                continue

            if verbose:
                self.stdout.write(f"  LR#{req.id} - {req.user_name} - expirou ({expiry_hours}h)")
            if not dry_run:
                req.cancelar(
                    cancelador=None,
                    motivo=f'Cancelamento automático: prazo de {expiry_hours}h expirado sem confirmação.'
                )
                Notification.objects.create(
                    user=req.user, type='warning',
                    title='Solicitação cancelada (prazo expirado)',
                    message=f'A solicitação #{req.id} expirou após {expiry_hours}h sem confirmação.',
                    action_required=False
                )
            total += 1

        # Loans pendentes: expiram 24h
        for loan in Loan.objects.filter(status='pendente'):
            if loan.confirmado_tecnico and loan.confirmado_utente:
                continue
            cutoff = loan.created_at + timedelta(hours=NORMAL_EXPIRY_HOURS)
            if now < cutoff:
                continue

            if verbose:
                self.stdout.write(f"  Loan#{loan.id} - {loan.user_name} - expirou (24h)")
            if not dry_run:
                loan.status = 'cancelado'
                loan.notes = f"{loan.notes or ''}\n\nCancelamento automático: prazo de 24h expirado.".strip()
                loan.save()
                Notification.objects.create(
                    user=loan.user, type='warning',
                    title='Empréstimo cancelado (prazo expirado)',
                    message=f'O empréstimo #{loan.id} expirou após 24h sem confirmação.',
                    action_required=False
                )
            total += 1

        if total == 0:
            self.stdout.write(self.style.SUCCESS("✨ Nenhum registo expirado"))
        else:
            action = "seriam" if dry_run else "foram"
            self.stdout.write(self.style.SUCCESS(f"✅ {total} registo(s) {action} cancelados"))
