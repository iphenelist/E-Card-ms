"""Self sign-up for Occasion Managers, and Terms acceptance."""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, escape_html, validate_email_address

from e_card_ms.legal import get_legal_documents, record_acceptance, terms_pending
from e_card_ms.utils.credits import get_account

SIGNUP_ROLES = ("Occasion Manager", "Desk User")


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=60 * 60)
def sign_up(full_name: str, email: str, phone: str | None = None, accept_terms=None, website: str | None = None):
	"""Create a desk User with the Occasion Manager role. Frappe's welcome email
	carries the verification link where the user sets their password."""
	# Honeypot: the hidden "website" field is only ever filled in by bots.
	if website:
		return {"status": "ok", "message": _("Angalia barua pepe yako. / Please check your email.")}

	if not cint(accept_terms):
		frappe.throw(_("Tafadhali kubali Vigezo na Masharti. / Please accept the Terms & Conditions."))

	full_name = (full_name or "").strip()
	email = (email or "").strip().lower()
	if not full_name:
		frappe.throw(_("Enter your full name."))
	if not validate_email_address(email):
		frappe.throw(_("Enter a valid email address."))

	if frappe.db.exists("User", email):
		enabled = frappe.db.get_value("User", email, "enabled")
		return {
			"status": "exists",
			"message": _("Barua pepe hii tayari imesajiliwa. Ingia au badilisha nenosiri. / "
						 "This email is already registered. Log in or reset your password.")
			if enabled
			else _("This account is disabled. Contact support."),
		}

	max_per_hour = cint(frappe.get_system_settings("max_signups_allowed_per_hour") or 300)
	if frappe.db.get_creation_count("User", 60) >= max_per_hour:
		frappe.throw(_("Too many sign-ups right now. Please try again in an hour."), title=_("Temporarily Disabled"))

	user = frappe.get_doc({
		"doctype": "User",
		"email": email,
		"first_name": escape_html(full_name),
		"mobile_no": (phone or "").strip() or None,
		"user_type": "System User",
		"send_welcome_email": 1,
		"roles": [{"role": role} for role in SIGNUP_ROLES],
	})
	user.flags.ignore_permissions = True
	user.flags.ignore_password_policy = True
	user.insert()

	# After verifying the email and setting a password, land on their Occasion list in the Desk.
	frappe.cache.hset("redirect_after_login", user.name, "/app/occasion")
	get_account(user.name)
	record_acceptance(user.name, "Sign-up")

	if user.flags.email_sent:
		message = _("Akaunti imeundwa! Angalia barua pepe yako ({0}) kuthibitisha na kuweka nenosiri. / "
					"Account created! Check your email ({0}) to verify and set your password.").format(email)
	else:
		# Frappe skips the welcome email when no default outgoing Email Account
		# is set up (OutgoingEmailError). Mark it pending: the hourly
		# send_pending_welcome_emails job sends it as soon as email works.
		frappe.db.set_value("Message Credit Account", user.name, "welcome_email_pending", 1)
		message = _(
			"Akaunti imeundwa! Barua pepe ya kuweka nenosiri itatumwa kwa {0} muda si mrefu. / "
			"Account created! The email to set your password will be sent to {0} shortly."
		).format(email)
	return {"status": "ok", "message": message}


@frappe.whitelist()
def get_pending_terms() -> dict:
	"""For the desk modal: the current Terms, if this user still has to accept them."""
	if not terms_pending():
		return {"pending": False}
	docs = get_legal_documents()
	return {"pending": True, **docs}


@frappe.whitelist(methods=["POST"])
def accept_terms() -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in first."), frappe.PermissionError)
	if terms_pending():
		record_acceptance(frappe.session.user, "Re-acceptance")
	return {"pending": False}


def boot_session(bootinfo):
	bootinfo.ecard_terms_pending = terms_pending()


def send_pending_welcome_emails():
	"""Every 5 minutes: send the set-password email to people who signed up while no
	outgoing Email Account was configured. No admin action needed."""
	from frappe.email.doctype.email_account.email_account import EmailAccount

	pending = frappe.get_all("Message Credit Account", filters={"welcome_email_pending": 1}, pluck="user")
	if not pending or not EmailAccount.find_default_outgoing():
		return
	for user_name in pending:
		try:
			user = frappe.get_doc("User", user_name)
			if user.enabled and not user.last_login:
				user.send_welcome_mail_to_user()
			frappe.db.set_value("Message Credit Account", user_name, "welcome_email_pending", 0)
			frappe.db.commit()  # nosemgrep — one user at a time, so a failure doesn't resend the others
		except frappe.DoesNotExistError:
			frappe.db.set_value("Message Credit Account", user_name, "welcome_email_pending", 0)
		except Exception:
			frappe.db.rollback()
			frappe.log_error(title=f"E Card: welcome email for {user_name} failed", message=frappe.get_traceback())
