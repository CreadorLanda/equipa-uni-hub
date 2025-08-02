from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from django.utils import timezone

from accounts.models import User
from equipment.models import Equipment
from loans.models import Loan
from reservations.models import Reservation

User = get_user_model()


class Command(BaseCommand):
    help = 'Cria dados iniciais para o sistema baseado nos mock data do frontend'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Remove todos os dados existentes antes de criar os novos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Removendo dados existentes...')
            Loan.objects.all().delete()
            Reservation.objects.all().delete()
            Equipment.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        self.stdout.write('Criando usuários...')
        self.create_users()

        self.stdout.write('Criando equipamentos...')
        self.create_equipment()

        self.stdout.write('Criando empréstimos...')
        self.create_loans()

        self.stdout.write('Criando reservas...')
        self.create_reservations()

        self.stdout.write(
            self.style.SUCCESS('Dados iniciais criados com sucesso!')
        )

    def create_users(self):
        """Cria usuários iniciais"""
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@unihub.com',
                'name': 'Administrador',
                'role': 'coordenador',
                'department': 'TI',
                'is_staff': True,
                'is_superuser': True,
                'password': 'admin123'
            },
            {
                'username': 'tecnico1',
                'email': 'tecnico@unihub.com',
                'name': 'Carlos Silva',
                'role': 'tecnico',
                'department': 'TI',
                'password': 'tecnico123'
            },
            {
                'username': 'secretaria',
                'email': 'secretaria@unihub.com',
                'name': 'Maria Santos',
                'role': 'secretario',
                'department': 'Administração',
                'password': 'secretaria123'
            },
            {
                'username': 'ana.santos',
                'email': 'ana.santos@unihub.com',
                'name': 'Ana Santos',
                'role': 'docente',
                'department': 'Ciência da Computação',
                'password': 'docente123'
            },
            {
                'username': 'joao.oliveira',
                'email': 'joao.oliveira@unihub.com',
                'name': 'João Oliveira',
                'role': 'docente',
                'department': 'Engenharia',
                'password': 'docente123'
            },
            {
                'username': 'maria.costa',
                'email': 'maria.costa@unihub.com',
                'name': 'Maria Costa',
                'role': 'docente',
                'department': 'Administração',
                'password': 'docente123'
            }
        ]

        for user_data in users_data:
            password = user_data.pop('password')
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'Usuário {user.name} criado')
            else:
                self.stdout.write(f'Usuário {user.name} já existe')

    def create_equipment(self):
        """Cria equipamentos iniciais baseados no mockData"""
        equipment_data = [
            {
                'brand': 'Dell',
                'model': 'Latitude 5520',
                'type': 'notebook',
                'status': 'disponivel',
                'serial_number': 'DL001',
                'acquisition_date': date(2023, 1, 15),
                'description': 'Notebook para uso acadêmico',
                'location': 'Laboratório 1'
            },
            {
                'brand': 'HP',
                'model': 'EliteDesk 800',
                'type': 'desktop',
                'status': 'emprestado',
                'serial_number': 'HP002',
                'acquisition_date': date(2023, 2, 20),
                'description': 'Desktop para desenvolvimento',
                'location': 'Sala 201'
            },
            {
                'brand': 'Epson',
                'model': 'PowerLite X49',
                'type': 'projetor',
                'status': 'reservado',
                'serial_number': 'EP003',
                'acquisition_date': date(2023, 3, 10),
                'description': 'Projetor para apresentações',
                'location': 'Auditório'
            },
            {
                'brand': 'Apple',
                'model': 'iPad Air',
                'type': 'tablet',
                'status': 'manutencao',
                'serial_number': 'AP004',
                'acquisition_date': date(2023, 4, 5),
                'description': 'Tablet para pesquisa de campo',
                'location': 'Laboratório 2'
            },
            {
                'brand': 'Canon',
                'model': 'PIXMA G3110',
                'type': 'impressora',
                'status': 'disponivel',
                'serial_number': 'CN005',
                'acquisition_date': date(2023, 5, 12),
                'description': 'Impressora multifuncional',
                'location': 'Secretaria'
            },
            # Equipamentos adicionais
            {
                'brand': 'Lenovo',
                'model': 'ThinkPad X1',
                'type': 'notebook',
                'status': 'disponivel',
                'serial_number': 'LN006',
                'acquisition_date': date(2023, 6, 1),
                'description': 'Notebook executivo',
                'location': 'Laboratório 1'
            },
            {
                'brand': 'Samsung',
                'model': 'Monitor 24"',
                'type': 'monitor',
                'status': 'disponivel',
                'serial_number': 'SM007',
                'acquisition_date': date(2023, 7, 15),
                'description': 'Monitor Full HD',
                'location': 'Laboratório 3'
            }
        ]

        for equip_data in equipment_data:
            equipment, created = Equipment.objects.get_or_create(
                serial_number=equip_data['serial_number'],
                defaults=equip_data
            )
            if created:
                self.stdout.write(f'Equipamento {equipment} criado')
            else:
                self.stdout.write(f'Equipamento {equipment} já existe')

    def create_loans(self):
        """Cria empréstimos iniciais"""
        # Busca usuários e equipamentos
        ana = User.objects.get(email='ana.santos@unihub.com')
        joao = User.objects.get(email='joao.oliveira@unihub.com')
        maria = User.objects.get(email='maria.costa@unihub.com')
        admin = User.objects.get(email='admin@unihub.com')

        hp_desktop = Equipment.objects.get(serial_number='HP002')
        dell_notebook = Equipment.objects.get(serial_number='DL001')
        canon_printer = Equipment.objects.get(serial_number='CN005')

        loans_data = [
            {
                'user': ana,
                'equipment': hp_desktop,
                'start_date': date(2024, 1, 15),
                'expected_return_date': date(2024, 1, 22),
                'status': 'ativo',
                'purpose': 'Desenvolvimento de projeto de pesquisa',
                'notes': 'Equipamento em bom estado',
                'created_by': admin
            },
            {
                'user': maria,
                'equipment': dell_notebook,
                'start_date': date(2024, 1, 10),
                'expected_return_date': date(2024, 1, 20),
                'actual_return_date': date(2024, 1, 19),
                'status': 'concluido',
                'purpose': 'Apresentação em congresso',
                'notes': 'Devolvido em perfeito estado',
                'created_by': admin
            },
            {
                'user': joao,
                'equipment': canon_printer,
                'start_date': date(2024, 1, 5),
                'expected_return_date': date(2024, 1, 12),
                'status': 'atrasado',
                'purpose': 'Impressão de documentos administrativos',
                'notes': 'Aguardando devolução',
                'created_by': admin
            }
        ]

        for loan_data in loans_data:
            loan, created = Loan.objects.get_or_create(
                user=loan_data['user'],
                equipment=loan_data['equipment'],
                start_date=loan_data['start_date'],
                defaults=loan_data
            )
            if created:
                self.stdout.write(f'Empréstimo {loan} criado')
            else:
                self.stdout.write(f'Empréstimo {loan} já existe')

    def create_reservations(self):
        """Cria reservas iniciais"""
        # Busca usuários e equipamentos
        ana = User.objects.get(email='ana.santos@unihub.com')
        maria = User.objects.get(email='maria.costa@unihub.com')
        admin = User.objects.get(email='admin@unihub.com')

        epson_projector = Equipment.objects.get(serial_number='EP003')
        lenovo_notebook = Equipment.objects.get(serial_number='LN006')

        reservations_data = [
            {
                'user': ana,
                'equipment': epson_projector,
                'reservation_date': date(2024, 1, 18),
                'expected_pickup_date': date(2024, 1, 25),
                'status': 'ativa',
                'purpose': 'Palestra sobre sustentabilidade',
                'notes': 'Reserva para evento especial',
                'created_by': admin
            },
            {
                'user': maria,
                'equipment': lenovo_notebook,
                'reservation_date': date(2024, 1, 20),
                'expected_pickup_date': date(2024, 1, 30),
                'status': 'ativa',
                'purpose': 'Trabalho de campo',
                'notes': 'Necessário carregador extra',
                'created_by': admin
            }
        ]

        for reservation_data in reservations_data:
            reservation, created = Reservation.objects.get_or_create(
                user=reservation_data['user'],
                equipment=reservation_data['equipment'],
                reservation_date=reservation_data['reservation_date'],
                defaults=reservation_data
            )
            if created:
                self.stdout.write(f'Reserva {reservation} criada')
            else:
                self.stdout.write(f'Reserva {reservation} já existe') 