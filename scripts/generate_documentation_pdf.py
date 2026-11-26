"""Generate the repository documentation PDF from the verified Markdown sources."""
from pathlib import Path
import html
import re
from datetime import datetime
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor('#0B132B')
VIOLET = colors.HexColor('#7C3AED')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyVerified', fontName='Helvetica', fontSize=9, leading=13, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name='CellVerified', fontName='Helvetica', fontSize=7.5, leading=10, textColor=NAVY))
styles.add(ParagraphStyle(name='CoverVerified', fontSize=30, leading=36, textColor=VIOLET, alignment=TA_CENTER, spaceAfter=24))


def inline(text):
    text = html.escape(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', text)
    text = re.sub(r'\[([^]]+)\]\((https?://[^)]+)\)', r'<link href="\2" color="#7C3AED">\1</link>', text)
    text = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text)
    return text


def markdown(text):
    result, table, code = [], [], None
    def flush_table():
        if not table:
            return
        cells = [[Paragraph(inline(cell.strip()), styles['CellVerified']) for cell in row.strip().strip('|').split('|')] for row in table if not re.fullmatch(r'[| :\-]+', row)]
        columns = len(cells[0])
        widths = {2: [150, 345], 3: [80, 150, 265], 4: [25, 100, 270, 100]}.get(columns, [495 / columns] * columns)
        view = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
        view.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EDE9FE')),('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#E2DCBF')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
        result.extend([view, Spacer(1,12)])
        table.clear()
    for line in text.splitlines():
        if line.startswith('```'):
            if code is None:
                flush_table(); code = []
            else:
                result.extend([Preformatted('\n'.join(code), styles['Code'], maxLineLength=95), Spacer(1,10)]); code = None
            continue
        if code is not None:
            code.append(line); continue
        if line.startswith('|'):
            table.append(line); continue
        flush_table()
        if not line.strip():
            continue
        if line.startswith('#'):
            level = min(len(line) - len(line.lstrip('#')), 3)
            result.append(Paragraph(inline(line.lstrip('#').strip()), styles[f'Heading{level}']))
        else:
            result.append(Paragraph(inline(line), styles['BodyVerified']))
    flush_table()
    return result


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY); canvas.setFont('Helvetica',8)
    canvas.drawString(50,25,'ClientSphere | Verified implementation and evidence')
    canvas.drawRightString(A4[0]-50,25,str(doc.page))
    canvas.restoreState()


def main():
    output = ROOT / 'ClientSphere_Project_Documentation.pdf'
    story = [Spacer(1,90), Paragraph('ClientSphere', styles['CoverVerified']), Paragraph('CRM, Sales Intelligence & Workflow Automation', styles['Title']), Spacer(1,25), Paragraph('Implementation review, actual tests and deployment status', styles['BodyVerified']), Paragraph(datetime.now(ZoneInfo('Asia/Kolkata')).strftime('%d %B %Y, %H:%M IST'), styles['BodyVerified']), Spacer(1,20), Paragraph('<b>Railway deployment is blocked by the account free-plan resource limit. No live application URL has been verified.</b>', styles['BodyVerified']), PageBreak()]
    for filename in ['README.md','docs/ASSESSMENTS_CHECKLIST.md','docs/VERIFICATION_RESULTS.md','docs/RAILWAY_DEPLOYMENT_GUIDE.md','docs/INCIDENT_SIMULATION_RCA.md']:
        story.extend(markdown((ROOT / filename).read_text(encoding='utf-8')))
        story.append(PageBreak())
    SimpleDocTemplate(str(output), pagesize=A4, leftMargin=50, rightMargin=50, topMargin=45, bottomMargin=45, title='ClientSphere Verified Project Documentation', author='Nitin Sharma').build(story, onFirstPage=footer, onLaterPages=footer)
    print(f'Generated {output.name}')


if __name__ == '__main__':
    main()
