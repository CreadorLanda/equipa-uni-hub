"""
Loan Request PDF Generation Service

Generates PDF documents for special loan requests that exceed the configured limits.
"""

from io import BytesIO
from datetime import datetime
from django.conf import settings

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class LoanRequestPDFGenerator:
    """
    Generates PDF documents for loan requests requiring special approval
    """
    
    def __init__(self, loan_request):
        """
        Initialize PDF generator with loan request data
        
        Args:
            loan_request: LoanRequest model instance
        """
        self.loan_request = loan_request
        self.buffer = BytesIO()
        self.page_width = A4[0]
        self.page_height = A4[1]
        
    def _create_header(self, canvas, doc):
        """Create header for each page"""
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 16)
        canvas.drawCentredString(
            self.page_width / 2.0,
            self.page_height - 2*cm,
            "UNIVERSIDADE METODISTA DE ANGOLA"
        )
        canvas.setFont('Helvetica', 12)
        canvas.drawCentredString(
            self.page_width / 2.0,
            self.page_height - 2.5*cm,
            "Sistema de Gestão de Equipamentos - EquipaHub"
        )
        canvas.line(2*cm, self.page_height - 3*cm, self.page_width - 2*cm, self.page_height - 3*cm)
        canvas.restoreState()
        
    def _create_footer(self, canvas, doc):
        """Create footer for each page"""
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.drawString(
            2*cm,
            1.5*cm,
            f"Generated on {datetime.now().strftime('%d/%m/%Y at %H:%M')}"
        )
        canvas.drawRightString(
            self.page_width - 2*cm,
            1.5*cm,
            f"Page {doc.page}"
        )
        canvas.restoreState()
        
    def generate(self):
        """
        Generate PDF document and return buffer
        
        Returns:
            BytesIO: Buffer containing PDF data
        """
        # Create document
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=4*cm,
            bottomMargin=2*cm
        )
        
        # Build story (content)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        story.append(Paragraph("SOLICITAÇÃO ESPECIAL DE EMPRÉSTIMO", title_style))
        story.append(Spacer(1, 0.5*cm))
        
        # Request number and status
        request_info = [
            ['Número da Solicitação:', f'#{self.loan_request.id}'],
            ['Status:', self.loan_request.get_status_display().upper()],
            ['Data da Solicitação:', self.loan_request.created_at.strftime('%d/%m/%Y às %H:%M')],
        ]
        
        request_table = Table(request_info, colWidths=[7*cm, 10*cm])
        request_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(request_table)
        story.append(Spacer(1, 0.7*cm))
        
        # User information
        story.append(Paragraph("1. INFORMAÇÕES DO SOLICITANTE", heading_style))
        
        user_info = [
            ['Nome:', self.loan_request.user_name],
            ['Email:', self.loan_request.user.email],
            ['Função:', self.loan_request.user.get_role_display()],
        ]
        
        if self.loan_request.user.department:
            user_info.append(['Departamento:', self.loan_request.user.department])
        
        if self.loan_request.user.contact:
            user_info.append(['Contacto:', self.loan_request.user.contact])
        
        user_table = Table(user_info, colWidths=[5*cm, 12*cm])
        user_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(user_table)
        story.append(Spacer(1, 0.7*cm))
        
        # Loan details
        story.append(Paragraph("2. DETALHES DA SOLICITAÇÃO", heading_style))
        
        expected_return = self.loan_request.expected_return_date.strftime('%d/%m/%Y')
        if self.loan_request.expected_return_time:
            expected_return += f" às {self.loan_request.expected_return_time.strftime('%H:%M')}"
        
        loan_details = [
            ['Quantidade de Equipamentos:', str(self.loan_request.quantity)],
            ['Data Prevista de Devolução:', expected_return],
            ['Finalidade:', self.loan_request.purpose],
        ]
        
        if self.loan_request.notes:
            loan_details.append(['Observações:', self.loan_request.notes])
        
        loan_table = Table(loan_details, colWidths=[6*cm, 11*cm])
        loan_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(loan_table)
        story.append(Spacer(1, 0.7*cm))
        
        # Equipment list (if available)
        equipments = list(self.loan_request.equipments.all())
        if equipments:
            story.append(Paragraph("3. EQUIPAMENTOS SOLICITADOS", heading_style))
            
            equipment_data = [['#', 'Nome', 'Tipo', 'Localização']]
            
            for idx, eq in enumerate(equipments, 1):
                equipment_data.append([
                    str(idx),
                    eq.name,
                    eq.type,
                    eq.location or 'N/A'
                ])
            
            equipment_table = Table(equipment_data, colWidths=[1.5*cm, 7*cm, 4*cm, 4.5*cm])
            equipment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            story.append(equipment_table)
            story.append(Spacer(1, 0.7*cm))
        
        # Reason for special approval
        story.append(Paragraph("4. JUSTIFICATIVA PARA APROVAÇÃO ESPECIAL", heading_style))
        
        limits = settings.LOAN_REQUEST_LIMITS
        max_equipment = limits.get('max_equipment_count', 50)
        max_days = limits.get('max_days', 1)
        
        justification_text = f"""
        Esta solicitação requer aprovação especial da Reitoria pois excede os limites configurados 
        no sistema ({max_equipment} equipamentos ou {max_days} dia(s)). A solicitação atual envolve 
        <b>{self.loan_request.quantity} equipamentos</b>, portanto necessita de autorização formal 
        antes de ser processada pelo setor técnico.
        """
        
        story.append(Paragraph(justification_text, styles['BodyText']))
        story.append(Spacer(1, 1*cm))
        
        # Approval section
        story.append(Paragraph("5. APROVAÇÃO DA REITORIA", heading_style))
        
        if self.loan_request.status == 'pendente':
            approval_text = """
            <para alignment="center">
            <b>AGUARDANDO DECISÃO</b><br/>
            Esta solicitação ainda não foi analisada pela Reitoria.
            </para>
            """
            story.append(Paragraph(approval_text, styles['BodyText']))
            story.append(Spacer(1, 0.5*cm))
            
            # Signature fields
            signature_data = [
                ['', ''],
                ['_____________________________________', '_____________________________________'],
                ['Assinatura do Coordenador', 'Data da Decisão'],
            ]
            
            signature_table = Table(signature_data, colWidths=[8.5*cm, 8.5*cm])
            signature_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, 0), 20),
            ]))
            story.append(signature_table)
            
        else:
            approval_info = [
                ['Decisão:', self.loan_request.get_status_display().upper()],
                ['Aprovado/Rejeitado por:', self.loan_request.aprovador_name or 'N/A'],
                ['Data da Decisão:', self.loan_request.data_decisao.strftime('%d/%m/%Y às %H:%M') if self.loan_request.data_decisao else 'N/A'],
            ]
            
            if self.loan_request.motivo_decisao:
                approval_info.append(['Motivo:', self.loan_request.motivo_decisao])
            
            approval_table = Table(approval_info, colWidths=[5*cm, 12*cm])
            approval_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(approval_table)
        
        story.append(Spacer(1, 1.5*cm))
        
        # Footer note
        footer_note = """
        <para fontSize="8" textColor="#6b7280" alignment="center">
        <i>Este documento foi gerado automaticamente pelo Sistema EquipaHub.<br/>
        Para mais informações, contacte o setor técnico ou a Reitoria.</i>
        </para>
        """
        story.append(Paragraph(footer_note, styles['BodyText']))
        
        # Build PDF
        doc.build(
            story,
            onFirstPage=self._create_header,
            onLaterPages=self._create_header
        )
        
        # Get PDF data
        self.buffer.seek(0)
        return self.buffer
    
    def save_to_file(self, file_path):
        """
        Save PDF to file
        
        Args:
            file_path (str): Path to save PDF file
        """
        pdf_buffer = self.generate()
        with open(file_path, 'wb') as f:
            f.write(pdf_buffer.read())


def generate_loan_request_pdf(loan_request):
    """
    Helper function to generate PDF for loan request
    
    Args:
        loan_request: LoanRequest model instance
        
    Returns:
        BytesIO: Buffer containing PDF data
    """
    generator = LoanRequestPDFGenerator(loan_request)
    return generator.generate()
