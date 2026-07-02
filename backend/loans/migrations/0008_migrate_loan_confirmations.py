from django.db import migrations


def copy_loan_confirmations(apps, schema_editor):
    """
    Copy old confirmado_levantamento to new dual fields.
    Existing active loans get both confirmations set to maintain state.
    """
    Loan = apps.get_model('loans', 'Loan')

    for loan in Loan.objects.filter(confirmado_levantamento=True):
        loan.confirmado_tecnico = True
        loan.confirmado_utente = True
        if loan.data_confirmacao_levantamento:
            loan.data_confirmacao_tecnico = loan.data_confirmacao_levantamento
            loan.data_confirmacao_utente = loan.data_confirmacao_levantamento
        loan.save()


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0007_remove_loan_confirmado_levantamento_and_more'),
    ]

    operations = [
        migrations.RunPython(copy_loan_confirmations, reverse_code=migrations.RunPython.noop),
    ]
