from django.core.management.base import BaseCommand
from django.utils import timezone
from random import choice
from equipment.models import Equipment

BRANDS = ["Lenovo", "HP", "Dell", "Asus", "Acer"]
MODELS = ["ThinkPad", "EliteBook", "Latitude", "VivoBook", "Aspire"]
TYPES = ["notebook", "desktop", "tablet", "projetor", "monitor"]

class Command(BaseCommand):
    help = "Adiciona equipamentos de teste rapidamente. Use --count para definir a quantidade (padrão: 10)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Quantidade de equipamentos de teste a criar (padrão: 10)",
        )

    def handle(self, *args, **options):
        count = options.get("count") or 10
        created = 0
        for i in range(count):
            brand = choice(BRANDS)
            model = choice(MODELS)
            eq_type = choice(TYPES)
            serial = f"TEST-{timezone.now().strftime('%Y%m%d%H%M%S')}-{i:03d}"
            try:
                Equipment.objects.create(
                    brand=brand,
                    model=model,
                    type=eq_type,
                    status="disponivel",
                    serial_number=serial,
                    description="Equipamento de teste gerado via comando.",
                    location="Laboratório de Testes",
                )
                created += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Falha ao criar equipamento {serial}: {e}"))
        self.stdout.write(self.style.SUCCESS(f"Criados {created} equipamentos de teste."))
