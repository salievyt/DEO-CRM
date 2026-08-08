"""CSV and PDF export for Business Analytics reports.

CSV is generated with the stdlib ``csv`` module (UTF-8 with BOM so Excel
opens it correctly). PDF is generated with ReportLab tables.
"""

import csv
import io

from .services import get_managers, get_revenue_breakdown, get_sources, get_summary


def _money(value):
    try:
        return f"{float(value):,.2f}".replace(",", " ")
    except (TypeError, ValueError):
        return "0.00"


def _collect_data(scope, period):
    summary = get_summary(scope, period)
    revenue = get_revenue_breakdown(scope, period)
    managers = get_managers(scope, period)
    sources = get_sources(scope, period)

    kpis = [
        ("Выручка", _money(summary.get("revenue", 0))),
        ("Возвраты (refunds)", _money(summary.get("refunds", 0))),
        ("Себестоимость (COGS)", _money(summary.get("cogs", 0))),
        ("Расходы", _money(summary.get("expenses", 0))),
        ("Зарплаты", _money(summary.get("salaries", 0))),
        ("Валовая прибыль", _money(summary.get("gross_profit", 0))),
        ("Чистая прибыль", _money(summary.get("net_profit", 0))),
        ("Конверсия (won/leads), %", summary.get("conversion_rate", 0)),
        ("Средний размер сделки", _money(summary.get("avg_deal_size", 0))),
        ("Длительность цикла продаж, дней", summary.get("sales_cycle_days", 0)),
        ("LTV", _money(summary.get("ltv", 0))),
        ("CAC", _money(summary.get("cac", 0))),
        ("Churn rate, %", summary.get("churn", {}).get("churn_rate", 0)),
        ("Новые клиенты", summary.get("new_clients", 0)),
        ("Новые лиды", summary.get("total_leads", 0)),
        ("Выигранные сделки", summary.get("won_deals", 0)),
        ("Проигранные сделки", summary.get("lost_deals", 0)),
    ]
    return {
        "period": revenue.get("period", {}),
        "kpis": kpis,
        "dynamics": revenue.get("dynamics", {}).get("series", []),
        "sources": sources,
        "managers": managers,
    }


def build_csv(scope, period):
    data = _collect_data(scope, period)
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")

    writer.writerow(["Business Analytics — DEO CRM"])
    period_info = data["period"]
    writer.writerow([f"Период: {period_info.get('start', '')} — {period_info.get('end', '')}"])
    writer.writerow([])

    writer.writerow(["=== KPI ==="])
    for name, value in data["kpis"]:
        writer.writerow([name, value])
    writer.writerow([])

    writer.writerow(["=== Динамика выручки ==="])
    writer.writerow(["Дата", "Выручка", "Расходы", "Прибыль"])
    for point in data["dynamics"]:
        writer.writerow(
            [
                point["date"],
                _money(point["revenue"]),
                _money(point["expenses"]),
                _money(point["profit"]),
            ]
        )
    writer.writerow([])

    writer.writerow(["=== Эффективность источников ==="])
    writer.writerow(["Источник", "Лиды", "Сделки", "Won", "Конверсия %", "Выручка", "CAC", "ROI %"])
    for row in data["sources"]:
        writer.writerow(
            [
                row["source"],
                row["leads"],
                row["deals"],
                row["won"],
                row["conversion"],
                _money(row["revenue"]),
                _money(row["cac"]),
                row["roi"],
            ]
        )
    writer.writerow([])

    writer.writerow(["=== Эффективность менеджеров ==="])
    writer.writerow(
        [
            "Менеджер",
            "Лиды",
            "Обработано",
            "Сделки",
            "Won",
            "Lost",
            "Конверсия %",
            "Выручка",
            "Средний чек",
            "Цикл, дней",
        ]
    )
    for row in data["managers"]:
        writer.writerow(
            [
                row["user_name"],
                row["leads"],
                row["contacted"],
                row["deals"],
                row["won"],
                row["lost"],
                row["conversion"],
                _money(row["revenue"]),
                _money(row["avg_deal_size"]),
                row["sales_cycle"],
            ]
        )

    raw = buf.getvalue()
    return raw.encode("utf-8-sig")


def build_pdf(scope, period):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    data = _collect_data(scope, period)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        rightMargin=10 * mm,
        leftMargin=10 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="Business Analytics — DEO CRM",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=16, spaceAfter=4)
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"], fontSize=9, textColor=colors.grey, spaceAfter=10
    )
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, spaceBefore=10, spaceAfter=4)

    def make_table(header, rows, widths=None):
        table = Table([header] + rows, colWidths=widths, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f3f4f6")],
                    ),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        return table

    elements = []
    period_info = data["period"]
    elements.append(Paragraph("Business Analytics — DEO CRM", title_style))
    elements.append(
        Paragraph(
            f"Период: {period_info.get('start', '')} — {period_info.get('end', '')}", sub_style
        )
    )

    elements.append(Paragraph("Ключевые показатели", h2))
    # Flatten pairs into 4-column rows of plain strings
    kpi_rows = [
        [item for pair in data["kpis"][i : i + 2] for item in pair]
        for i in range(0, len(data["kpis"]), 2)
    ]
    elements.append(make_table(["Показатель", "Значение", "Показатель", "Значение"], kpi_rows))
    elements.append(Spacer(1, 4))

    elements.append(Paragraph("Динамика выручки", h2))
    dyn_header = ["Дата", "Выручка", "Расходы", "Прибыль"]
    dyn_rows = [
        [
            p["date"],
            _money(p["revenue"]),
            _money(p["expenses"]),
            _money(p["profit"]),
        ]
        for p in data["dynamics"]
    ]
    elements.append(make_table(dyn_header, dyn_rows))
    elements.append(Spacer(1, 4))

    elements.append(Paragraph("Эффективность источников", h2))
    src_header = ["Источник", "Лиды", "Сделки", "Won", "Конверсия %", "Выручка", "CAC", "ROI %"]
    src_rows = [
        [
            r["source"],
            r["leads"],
            r["deals"],
            r["won"],
            r["conversion"],
            _money(r["revenue"]),
            _money(r["cac"]),
            r["roi"],
        ]
        for r in data["sources"]
    ]
    elements.append(make_table(src_header, src_rows))
    elements.append(Spacer(1, 4))

    elements.append(Paragraph("Эффективность менеджеров", h2))

    mgr_header = [
        "Менеджер",
        "Лиды",
        "Обработано",
        "Сделки",
        "Won",
        "Lost",
        "Конверсия %",
        "Выручка",
        "Средний чек",
        "Цикл, дней",
    ]
    mgr_rows = [
        [
            r["user_name"],
            r["leads"],
            r["contacted"],
            r["deals"],
            r["won"],
            r["lost"],
            r["conversion"],
            _money(r["revenue"]),
            _money(r["avg_deal_size"]),
            r["sales_cycle"],
        ]
        for r in data["managers"]
    ]
    elements.append(make_table(mgr_header, mgr_rows))

    doc.build(elements)
    return buf.getvalue()
