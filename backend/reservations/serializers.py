from rest_framework import serializers
from django.utils import timezone
from .models import Reservation
from accounts.serializers import UserPublicSerializer
from equipment.serializers import EquipmentSummarySerializer


class ReservationSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Reservation
    """
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    days_until_pickup = serializers.ReadOnlyField()
    
    # Relacionamentos aninhados para leitura
    user_detail = UserPublicSerializer(source='user', read_only=True)
    equipment_detail = EquipmentSummarySerializer(source='equipment', read_only=True)
    
    class Meta:
        model = Reservation
        fields = [
            'id', 'user', 'equipment', 'reservation_date', 'expected_pickup_date',
            'status', 'purpose', 'notes', 'created_at', 'updated_at',
            'created_by', 'confirmed_at', 'user_name', 'equipment_name',
            'is_expired', 'days_until_pickup', 'user_detail', 'equipment_detail'
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'created_by': {'read_only': True},
            'confirmed_at': {'read_only': True},
        }
    
    def validate(self, data):
        """
        Validações customizadas para reserva
        """
        equipment = data.get('equipment')
        expected_pickup_date = data.get('expected_pickup_date')
        reservation_date = data.get('reservation_date', timezone.now().date())
        
        # Verifica se o equipamento está disponível
        if equipment and equipment.status not in ['disponivel', 'reservado']:
            raise serializers.ValidationError({
                'equipment': f'Equipamento não está disponível para reserva. Status atual: {equipment.get_status_display()}'
            })
        
        # Verifica se a data de retirada é futura
        if expected_pickup_date and expected_pickup_date <= reservation_date:
            raise serializers.ValidationError({
                'expected_pickup_date': 'Data de retirada deve ser posterior à data da reserva.'
            })
        
        # Verifica se já existe uma reserva ativa para o mesmo equipamento na mesma data
        if equipment and expected_pickup_date:
            existing_reservation = Reservation.objects.filter(
                equipment=equipment,
                expected_pickup_date=expected_pickup_date,
                status__in=['ativa', 'confirmada']
            )
            
            # Se estamos editando, exclui a reserva atual da verificação
            instance = getattr(self, 'instance', None)
            if instance:
                existing_reservation = existing_reservation.exclude(pk=instance.pk)
            
            if existing_reservation.exists():
                raise serializers.ValidationError({
                    'expected_pickup_date': 'Já existe uma reserva para este equipamento nesta data.'
                })
        
        return data
    
    def create(self, validated_data):
        """
        Cria uma nova reserva
        """
        # Define o usuário que está criando a reserva
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ReservationListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de reservas
    """
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    days_until_pickup = serializers.ReadOnlyField()
    
    class Meta:
        model = Reservation
        fields = [
            'id', 'user_name', 'equipment_name', 'reservation_date',
            'expected_pickup_date', 'status', 'is_expired', 'days_until_pickup'
        ]


class ReservationConfirmSerializer(serializers.Serializer):
    """
    Serializer para confirmação de reserva
    """
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def save(self):
        """
        Confirma a reserva
        """
        reservation = self.context['reservation']
        notes = self.validated_data.get('notes', '')
        
        # Adiciona observações sobre a confirmação
        if notes:
            existing_notes = reservation.notes or ''
            reservation.notes = f"{existing_notes}\n\nConfirmação: {notes}".strip()
        
        reservation.confirm()
        return reservation


class ReservationCancelSerializer(serializers.Serializer):
    """
    Serializer para cancelamento de reserva
    """
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def save(self):
        """
        Cancela a reserva
        """
        reservation = self.context['reservation']
        reason = self.validated_data.get('reason', '')
        
        # Adiciona motivo do cancelamento às observações
        if reason:
            existing_notes = reservation.notes or ''
            reservation.notes = f"{existing_notes}\n\nCancelamento: {reason}".strip()
        
        reservation.cancel()
        return reservation


class ReservationToLoanSerializer(serializers.Serializer):
    """
    Serializer para conversão de reserva em empréstimo
    """
    expected_return_date = serializers.DateField()
    start_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_expected_return_date(self, value):
        """
        Valida a data de devolução esperada
        """
        start_date = self.initial_data.get('start_date', timezone.now().date())
        if isinstance(start_date, str):
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if value <= start_date:
            raise serializers.ValidationError(
                'Data de devolução deve ser posterior à data de início.'
            )
        
        return value
    
    def validate_start_date(self, value):
        """
        Valida a data de início do empréstimo
        """
        if not value:
            value = timezone.now().date()
        
        reservation = self.context['reservation']
        if value < reservation.expected_pickup_date:
            raise serializers.ValidationError(
                'Data de início não pode ser anterior à data prevista de retirada da reserva.'
            )
        
        return value
    
    def save(self):
        """
        Converte a reserva em empréstimo
        """
        reservation = self.context['reservation']
        expected_return_date = self.validated_data['expected_return_date']
        start_date = self.validated_data.get('start_date', timezone.now().date())
        notes = self.validated_data.get('notes', '')
        
        # Adiciona observações sobre a conversão
        conversion_notes = f"Convertido da reserva {reservation.id}."
        if notes:
            conversion_notes = f"{conversion_notes} {notes}"
        
        loan = reservation.convert_to_loan(
            expected_return_date=expected_return_date,
            start_date=start_date
        )
        
        # Atualiza as observações do empréstimo
        existing_notes = loan.notes or ''
        loan.notes = f"{existing_notes}\n{conversion_notes}".strip()
        loan.save()
        
        return loan


class ReservationStatsSerializer(serializers.Serializer):
    """
    Serializer para estatísticas de reservas
    """
    total_reservations = serializers.IntegerField()
    active_reservations = serializers.IntegerField()
    confirmed_reservations = serializers.IntegerField()
    expired_reservations = serializers.IntegerField()
    cancelled_reservations = serializers.IntegerField()
    
    # Estatísticas por período
    reservations_this_month = serializers.IntegerField()
    reservations_this_week = serializers.IntegerField()
    
    # Reservas próximas do vencimento
    expiring_soon = serializers.ListField() 