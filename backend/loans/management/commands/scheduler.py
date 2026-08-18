"""
Agendador simples do EquipaHub.

RF22 (notificações de atraso) e RF23 (cancelamento automático por
temporizador) dependem de dois comandos de gestão que, por si sós, não
correm sozinhos. Este comando mantém-nos a correr em intervalos regulares
sem exigir cron, Celery ou tarefas do Windows — basta deixá-lo aberto
num terminal, ou arrancá-lo junto com o servidor.

    python manage.py scheduler                 # de 30 em 30 minutos
    python manage.py scheduler --interval 300  # de 5 em 5 minutos
    python manage.py scheduler --once          # corre uma vez e sai
"""

import time
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Corre periodicamente as tarefas agendadas (notificações de atraso e cancelamento automático)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval', type=int, default=1800,
            help='Segundos entre execuções (por omissão 1800 = 30 minutos)'
        )
        parser.add_argument(
            '--once', action='store_true',
            help='Corre uma única vez e termina (útil para cron ou para testar)'
        )

    def handle(self, *args, **options):
        intervalo = options['interval']
        uma_vez = options['once']

        if not uma_vez:
            self.stdout.write(self.style.SUCCESS(
                f'Agendador do EquipaHub activo — a cada {intervalo}s. Ctrl+C para parar.'
            ))

        while True:
            self._ciclo()

            if uma_vez:
                break

            try:
                time.sleep(intervalo)
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('\nAgendador terminado.'))
                break

    def _ciclo(self):
        momento = timezone.localtime().strftime('%d/%m/%Y %H:%M:%S')
        self.stdout.write(f'[{momento}] a correr tarefas agendadas...')

        for comando in ('check_loan_notifications', 'auto_cancel_requests'):
            try:
                call_command(comando)
            except Exception as erro:
                self.stderr.write(self.style.ERROR(f'  {comando} falhou: {erro}'))
