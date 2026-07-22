from django.core.management.base import BaseCommand
from equipment.models import Equipment


class Command(BaseCommand):
    help = 'Gera QR Code hashes para equipamentos que ainda não têm'

    def handle(self, *args, **options):
        qtd = 0
        for eq in Equipment.objects.filter(qrcode_hash__isnull=True):
            eq.save()  # save() gera qrcode_hash automaticamente
            qtd += 1
            self.stdout.write(f'  QR gerado para {eq} — {eq.qrcode_hash}')
        self.stdout.write(self.style.SUCCESS(f'{qtd} QR Code(s) gerados.'))
