#!/usr/bin/env python3
"""
Script para configurar o agendamento de verificação de empréstimos
Este script pode ser usado para configurar cron jobs ou tarefas agendadas no Windows
"""

import os
import sys
import platform
from pathlib import Path


def get_django_command():
    """Retorna o comando Django correto para o sistema"""
    base_path = Path(__file__).parent.parent
    
    if platform.system() == "Windows":
        return f"py {base_path}/manage.py"
    else:
        return f"python {base_path}/manage.py"


def create_cron_entry():
    """Cria entrada para crontab (Linux/Mac)"""
    django_cmd = get_django_command()
    
    cron_entries = [
        # Verifica a cada 30 minutos durante horário comercial (8h-18h)
        f"*/30 8-18 * * * {django_cmd} check_loan_notifications --hours-before=2",
        # Verifica a cada hora fora do horário comercial
        f"0 0-7,19-23 * * * {django_cmd} check_loan_notifications --hours-before=2",
    ]
    
    print("📋 Entradas para adicionar ao crontab (Linux/Mac):")
    print("-" * 60)
    for entry in cron_entries:
        print(entry)
    print("-" * 60)
    print("💡 Para adicionar ao crontab, execute: crontab -e")
    print("💡 Copie e cole as linhas acima no arquivo que abrir")


def create_windows_task():
    """Instruções para Task Scheduler (Windows)"""
    django_cmd = get_django_command()
    
    print("📋 Configuração para Task Scheduler (Windows):")
    print("-" * 60)
    print("1. Abra o 'Agendador de Tarefas' (Task Scheduler)")
    print("2. Clique em 'Criar Tarefa Básica'")
    print("3. Nome: 'Verificação de Empréstimos'")
    print("4. Descrição: 'Verifica empréstimos e envia notificações'")
    print("5. Disparador: 'Diariamente'")
    print("6. Repetir a cada: '30 minutos'")
    print("7. Duração: '12 horas' (ou conforme necessário)")
    print("8. Ação: 'Iniciar um programa'")
    print(f"9. Programa: {django_cmd.split()[0]}")
    print(f"10. Argumentos: {' '.join(django_cmd.split()[1:])} check_loan_notifications --hours-before=2")
    print(f"11. Iniciar em: {Path(__file__).parent.parent / 'backend'}")
    print("-" * 60)


def create_docker_cron():
    """Cria arquivo de cron para Docker"""
    django_cmd = "python /app/manage.py"
    
    cron_content = f"""# Verificação de empréstimos - a cada 30 minutos durante horário comercial
*/30 8-18 * * * {django_cmd} check_loan_notifications --hours-before=2 >> /var/log/loan_notifications.log 2>&1

# Verificação de empréstimos - a cada hora fora do horário comercial  
0 0-7,19-23 * * * {django_cmd} check_loan_notifications --hours-before=2 >> /var/log/loan_notifications.log 2>&1
"""
    
    cron_file = Path(__file__).parent / "loan_notifications_cron"
    cron_file.write_text(cron_content)
    
    print(f"📋 Arquivo cron criado: {cron_file}")
    print("💡 Para usar no Docker, adicione ao Dockerfile:")
    print(f"COPY {cron_file.name} /etc/cron.d/loan_notifications")
    print("RUN chmod 0644 /etc/cron.d/loan_notifications")
    print("RUN crontab /etc/cron.d/loan_notifications")


def test_command():
    """Testa o comando de verificação"""
    django_cmd = get_django_command()
    test_cmd = f"{django_cmd} check_loan_notifications --verbose --hours-before=1"
    
    print("🧪 Testando comando de verificação:")
    print("-" * 60)
    print(f"Execute: {test_cmd}")
    print("💡 Este comando deve mostrar o status da verificação")


def main():
    """Função principal"""
    print("🔔 Configurador de Notificações de Empréstimos")
    print("=" * 60)
    
    system = platform.system()
    print(f"🖥️  Sistema detectado: {system}")
    
    if system == "Windows":
        create_windows_task()
    else:
        create_cron_entry()
    
    print("\n" + "=" * 60)
    create_docker_cron()
    
    print("\n" + "=" * 60)
    test_command()
    
    print("\n📚 Configurações recomendadas:")
    print("- Lembretes: 2 horas antes do vencimento")
    print("- Verificação: A cada 30 minutos durante horário comercial")
    print("- Verificação: A cada hora fora do horário comercial")
    print("- Logs: Salvar em arquivo para auditoria")


if __name__ == "__main__":
    main()