import smtplib
import logging
import os
import io
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone, timedelta
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

logger = logging.getLogger(__name__)

IST_OFFSET = timedelta(hours=5, minutes=30)


def _gmail():
    """Read Gmail creds at call-time so .env changes are always picked up."""
    return os.getenv("GMAIL_EMAIL", ""), os.getenv("GMAIL_APP_PASSWORD", "")


def _smtp_send(msg) -> bool:
    """Send a pre-built MIMEMultipart message. Returns True on success."""
    gmail, app_pw = _gmail()
    if not gmail or not app_pw:
        logger.warning("Gmail credentials not configured – skipping email.")
        return False
    for attempt in range(3):
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as srv:
                srv.ehlo(); srv.starttls()
                srv.login(gmail, app_pw)
                srv.sendmail(gmail, msg["To"], msg.as_string())
            return True
        except Exception as e:
            logger.error(f"SMTP attempt {attempt + 1} failed: {e}")
    return False


# ── HTML builders ──────────────────────────────────────────────────────────────

def _build_reminder_html(employee_name: str, task_name: str, due_datetime, priority: str) -> str:
    priority_colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#22c55e"}
    color   = priority_colors.get(priority.lower(), "#6366f1")
    due_str = due_datetime.strftime("%B %d, %Y at %I:%M %p")
    return f"""
    <html><head><style>
      body{{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;}}
      .container{{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;
                  box-shadow:0 4px 20px rgba(0,0,0,.08);overflow:hidden;}}
      .header{{background:#6366f1;padding:28px 32px;}}
      .header h1{{color:#fff;margin:0;font-size:20px;}}
      .body{{padding:28px 32px;}}
      .badge{{display:inline-block;padding:4px 12px;border-radius:999px;
              background:{color}22;color:{color};font-size:13px;font-weight:600;text-transform:capitalize;}}
      .task-box{{background:#f8fafc;border-left:4px solid {color};
                 border-radius:8px;padding:16px 20px;margin:20px 0;}}
      .task-box p{{margin:0 0 6px;color:#475569;font-size:14px;}}
      .task-box h2{{margin:0 0 12px;color:#1e293b;font-size:18px;}}
      .footer{{padding:16px 32px;background:#f8fafc;color:#94a3b8;font-size:12px;}}
    </style></head>
    <body><div class="container">
      <div class="header"><h1>⏰ Task Reminder</h1></div>
      <div class="body">
        <p>Hi <strong>{employee_name}</strong>,</p>
        <p>This is a friendly reminder that you have a task due in the next <strong>30 minutes</strong>.</p>
        <div class="task-box">
          <p>Task</p><h2>{task_name}</h2>
          <p>📅 Due: <strong>{due_str}</strong></p>
          <p>Priority: <span class="badge">{priority}</span></p>
        </div>
        <p>Please ensure you complete it on time. Log in to the dashboard to mark it as done.</p>
      </div>
      <div class="footer">Automated reminder from TO-DO Automate — do not reply.</div>
    </div></body></html>"""


def _build_digest_html(employee_name: str, tasks: list, subject_line: str) -> str:
    priority_colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#22c55e"}
    rows = ""
    for t in tasks:
        color   = priority_colors.get((t.priority or "medium").lower(), "#6366f1")
        due_str = t.due_datetime.strftime("%b %d, %Y %I:%M %p") if t.due_datetime else "—"
        rows += f"""
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">{t.task_name}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">{due_str}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;">
            <span style="background:{color}22;color:{color};padding:3px 10px;border-radius:999px;
                         font-size:12px;font-weight:600;text-transform:capitalize;">{t.priority or 'medium'}</span>
          </td>
        </tr>"""
    return f"""
    <html><head></head>
    <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                  box-shadow:0 4px 20px rgba(0,0,0,.08);overflow:hidden;">
        <div style="background:#ef4444;padding:28px 32px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">{subject_line}</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#334155;">Hi <strong>{employee_name}</strong>,</p>
          <p style="color:#475569;font-size:14px;">
            You have <strong>{len(tasks)}</strong> pending task{'s' if len(tasks) != 1 else ''}.
            Your full task list is attached as an Excel file.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;
                         border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Task</th>
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Due</th>
              <th style="padding:10px 14px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;">Priority</th>
            </tr></thead>
            <tbody>{rows}</tbody>
          </table>
          <p style="color:#475569;font-size:14px;">
            Open the attached Excel file to view the full list, or log in to the dashboard to manage your tasks.
          </p>
        </div>
        <div style="padding:16px 32px;background:#f8fafc;color:#94a3b8;font-size:12px;">
          Automated digest from TO-DO Automate — do not reply.
        </div>
      </div>
    </body></html>"""


# ── Excel builder ──────────────────────────────────────────────────────────────

def _build_pending_excel(tasks: list, employee_name: str) -> bytes:
    """Build an in-memory .xlsx with the user's pending tasks."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Pending Tasks"

    header_fill = PatternFill(start_color="6366F1", end_color="6366F1", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    headers     = ["#", "Task Name", "Description", "Due Date", "Due Time", "Priority", "Status"]
    col_widths  = [5, 35, 38, 14, 13, 12, 12]

    for col, (h, w) in enumerate(zip(headers, col_widths), start=1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.column_dimensions[cell.column_letter].width = w
    ws.row_dimensions[1].height = 22

    priority_colors = {"high": "FEE2E2", "medium": "FEF3C7", "low": "DCFCE7"}

    for idx, task in enumerate(tasks, start=1):
        due_dt = task.due_datetime
        if due_dt:
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            due_ist      = due_dt.astimezone(timezone(IST_OFFSET))
            due_date_str = due_ist.strftime("%Y-%m-%d")
            due_time_str = due_ist.strftime("%I:%M %p")
        else:
            due_date_str = due_time_str = ""

        row_vals = [
            idx,
            task.task_name,
            task.description or "",
            due_date_str,
            due_time_str,
            task.priority.capitalize() if task.priority else "",
            task.status.capitalize()   if task.status   else "",
        ]
        row_num = idx + 1
        for col, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=row_num, column=col, value=val)
            cell.alignment = Alignment(vertical="center")

        p_color = priority_colors.get((task.priority or "").lower())
        if p_color:
            ws.cell(row=row_num, column=6).fill = PatternFill(
                start_color=p_color, end_color=p_color, fill_type="solid"
            )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ── Public send functions ──────────────────────────────────────────────────────

def send_reminder_email(to_email: str, employee_name: str, task_name: str,
                        due_datetime, priority: str) -> bool:
    gmail, _ = _gmail()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"⏰ Reminder: '{task_name}' is due in 30 minutes"
    msg["From"]    = gmail
    msg["To"]      = to_email
    msg.attach(MIMEText(_build_reminder_html(employee_name, task_name, due_datetime, priority), "html"))
    ok = _smtp_send(msg)
    if ok:
        logger.info(f"Reminder sent to {to_email} for task '{task_name}'")
    return ok


def send_digest_email(to_email: str, employee_name: str, tasks: list) -> bool:
    """Afternoon digest — HTML only (no attachment)."""
    gmail, _ = _gmail()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📋 {len(tasks)} overdue task{'s' if len(tasks) != 1 else ''} pending — TO-DO Automate"
    msg["From"]    = gmail
    msg["To"]      = to_email
    msg.attach(MIMEText(_build_digest_html(employee_name, tasks, "📋 Overdue Task Digest"), "html"))
    ok = _smtp_send(msg)
    if ok:
        logger.info(f"Digest sent to {to_email} ({len(tasks)} tasks)")
    return ok


def send_morning_digest_with_excel(to_email: str, employee_name: str,
                                    tasks: list, username: str) -> bool:
    """
    Morning 9:30 AM digest — HTML body + Excel attachment of all pending tasks.
    """
    gmail, _ = _gmail()
    today_str = datetime.now(timezone(IST_OFFSET)).strftime("%d %b %Y")

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"📅 Good Morning {employee_name.split()[0]}! Your pending tasks for {today_str}"
    msg["From"]    = gmail
    msg["To"]      = to_email

    # HTML body
    msg.attach(MIMEText(
        _build_digest_html(employee_name, tasks, "📅 Good Morning — Your Pending Tasks"),
        "html"
    ))

    # Excel attachment
    excel_bytes = _build_pending_excel(tasks, employee_name)
    attachment  = MIMEBase("application",
                            "vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    attachment.set_payload(excel_bytes)
    encoders.encode_base64(attachment)
    filename = f"pending_tasks_{username}_{datetime.now(timezone(IST_OFFSET)).strftime('%Y%m%d')}.xlsx"
    attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(attachment)

    ok = _smtp_send(msg)
    if ok:
        logger.info(f"Morning digest + Excel sent to {to_email} ({len(tasks)} tasks)")
    return ok
