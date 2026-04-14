import smtplib
import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

logger = logging.getLogger(__name__)


def _build_html(employee_name: str, task_name: str, due_datetime, priority: str) -> str:
    priority_colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#22c55e"}
    color = priority_colors.get(priority.lower(), "#6366f1")
    due_str = due_datetime.strftime("%B %d, %Y at %I:%M %p")
    return f"""
    <html>
    <head>
      <style>
        body {{ font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 0; }}
        .container {{ max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px;
                      box-shadow: 0 4px 20px rgba(0,0,0,.08); overflow: hidden; }}
        .header {{ background: #6366f1; padding: 28px 32px; }}
        .header h1 {{ color: #fff; margin: 0; font-size: 20px; }}
        .body {{ padding: 28px 32px; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 999px;
                  background: {color}22; color: {color}; font-size: 13px; font-weight: 600;
                  text-transform: capitalize; }}
        .task-box {{ background: #f8fafc; border-left: 4px solid {color};
                     border-radius: 8px; padding: 16px 20px; margin: 20px 0; }}
        .task-box p {{ margin: 0 0 6px; color: #475569; font-size: 14px; }}
        .task-box h2 {{ margin: 0 0 12px; color: #1e293b; font-size: 18px; }}
        .footer {{ padding: 16px 32px; background: #f8fafc; color: #94a3b8; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>⏰ Task Reminder</h1></div>
        <div class="body">
          <p>Hi <strong>{employee_name}</strong>,</p>
          <p>This is a friendly reminder that you have a task due in the next <strong>30 minutes</strong>.</p>
          <div class="task-box">
            <p>Task</p>
            <h2>{task_name}</h2>
            <p>📅 Due: <strong>{due_str}</strong></p>
            <p>Priority: <span class="badge">{priority}</span></p>
          </div>
          <p>Please ensure you complete it on time. Log in to the dashboard to mark it as done.</p>
        </div>
        <div class="footer">This is an automated reminder from TO-DO Automate &mdash; do not reply.</div>
      </div>
    </body>
    </html>
    """


def send_reminder_email(to_email: str, employee_name: str, task_name: str, due_datetime, priority: str) -> bool:
    """Send a single HTML reminder email. Returns True on success."""
    if not GMAIL_EMAIL or not GMAIL_APP_PASSWORD:
        logger.warning("Gmail credentials not configured – skipping email send.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"⏰ Reminder: '{task_name}' is due in 30 minutes"
    msg["From"] = GMAIL_EMAIL
    msg["To"] = to_email

    html_body = _build_html(employee_name, task_name, due_datetime, priority)
    msg.attach(MIMEText(html_body, "html"))

    for attempt in range(3):
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
                server.sendmail(GMAIL_EMAIL, to_email, msg.as_string())
            logger.info(f"Reminder sent to {to_email} for task '{task_name}'")
            return True
        except Exception as e:
            logger.error(f"Email attempt {attempt + 1} failed: {e}")

    return False
