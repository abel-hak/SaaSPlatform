"""
Email service stub.

In development, emails are printed to the console/logs.
For production, replace the body of each function with your preferred provider:
  - SendGrid:  pip install sendgrid
  - AWS SES:   pip install boto3
  - SMTP:      use smtplib from stdlib

Example SendGrid replacement:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    message = Mail(from_email="noreply@yourdomain.com", to_emails=to, ...)
    SendGridAPIClient(os.environ["SENDGRID_API_KEY"]).send(message)
"""

import logging

logger = logging.getLogger(__name__)


def send_password_reset_email(
    email: str,
    token: str,
    frontend_origin: str = "http://localhost:5173",
) -> None:
    """
    Send a password-reset link to the given email address.
    Replace the body of this function with a real email provider in production.
    """
    reset_url = f"{frontend_origin}/reset-password?token={token}"
    logger.info("[EMAIL] Password reset requested for %s  →  %s", email, reset_url)
    # ── DEV: print to console so developers can test without a mail server ──
    print(
        f"\n{'='*60}\n"
        f"  [DEV EMAIL] Password Reset\n"
        f"  To:  {email}\n"
        f"  URL: {reset_url}\n"
        f"{'='*60}\n"
    )
    # TODO: replace above print() with real email delivery


def send_invite_email(
    email: str,
    token: str,
    org_name: str,
    inviter_email: str,
    frontend_origin: str = "http://localhost:5173",
) -> None:
    """
    Send a team invitation link to the given email address.
    Replace the body of this function with a real email provider in production.
    """
    invite_url = f"{frontend_origin}/accept-invite?token={token}"
    logger.info("[EMAIL] Invite sent for %s to join %s  →  %s", email, org_name, invite_url)
    # ── DEV: print to console so developers can test without a mail server ──
    print(
        f"\n{'='*60}\n"
        f"  [DEV EMAIL] Team Invitation\n"
        f"  To:      {email}\n"
        f"  From:    {inviter_email}\n"
        f"  Org:     {org_name}\n"
        f"  URL:     {invite_url}\n"
        f"{'='*60}\n"
    )
    # TODO: replace above print() with real email delivery
