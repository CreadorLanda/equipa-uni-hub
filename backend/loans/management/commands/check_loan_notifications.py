from django.core.management.base import BaseCommand
from django.utils import timezone
from loans.services import LoanNotificationService


class Command(BaseCommand):
    help = 'Verifica empréstimos e envia notificações de lembrete e atraso'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours-before',
            type=int,
            default=2,
            help='Horas antes do vencimento para enviar lembrete (padrão: 2)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra informações detalhadas'
        )

    def handle(self, *args, **options):
        hours_before = options['hours_before']
        verbose = options['verbose']
        
        start_time = timezone.now()
        
        if verbose:
            self.stdout.write(f"🔍 Iniciando verificação de empréstimos às {start_time.strftime('%H:%M:%S')}")
            self.stdout.write(f"📋 Configuração: lembretes {hours_before}h antes do vencimento")
        
        try:
            # Verifica empréstimos que vencem em breve
            reminders_sent = LoanNotificationService.check_upcoming_returns(hours_before)
            
            # Verifica empréstimos em atraso
            overdue_sent = LoanNotificationService.check_overdue_loans()
            
            total_notifications = reminders_sent + overdue_sent
            
            # Relatório de execução
            if verbose or total_notifications > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Verificação concluída em {(timezone.now() - start_time).total_seconds():.2f}s"
                    )
                )
                self.stdout.write(f"📨 Lembretes enviados: {reminders_sent}")
                self.stdout.write(f"🚨 Notificações de atraso: {overdue_sent}")
                self.stdout.write(f"📊 Total de notificações: {total_notifications}")
            
            if total_notifications == 0 and verbose:
                self.stdout.write("✨ Nenhuma notificação foi necessária")
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erro ao verificar empréstimos: {str(e)}")
            )
            raise e