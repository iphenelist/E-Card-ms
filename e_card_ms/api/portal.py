"""Website dashboard (/dashboard) for Occasion Managers.

Everything an Occasion Manager does in the Desk, available on the website.
Every call goes through the Occasion's own permission checks (assigned user /
staff), and rows are saved one at a time so two people editing the same
event don't overwrite each other's lists.
"""

import frappe
from frappe import _
from frappe.utils import cint, flt

# Occasion fields a manager may edit from the website. assigned_user, gate_pin
# and the computed totals are deliberately absent.
EDITABLE_FIELDS = (
	"couple_names", "occasion_date", "occasion_time", "venue_name", "venue_address", "venue_location",
	"dress_code", "contact_1", "contact_2", "status",
	"card_design", "name_font_size", "name_color", "card_type_color", "name_font",
	"allow_reentry",
	"contribution_deadline", "payment_instructions", "auto_add_paid_contributors",
	"reminder_template", "auto_reminders", "reminder_interval_days",
)
CREATE_FIELDS = ("occasion_name", *EDITABLE_FIELDS)

EDITABLE_TABLES = {
	"guests": ("guest_name", "phone", "card_type", "rsvp_status"),
	"budget_items": ("category", "description", "budgeted_amount", "actual_amount", "notes"),
	"contributors": ("contributor_name", "phone", "card_type", "pledged_amount"),
	"contribution_payments": ("contributor_id", "payment_date", "amount", "method", "reference", "notes"),
}


def _require_login():
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in first."), frappe.PermissionError)


def _get(name: str, ptype: str = "read"):
	_require_login()
	doc = frappe.get_doc("Occasion", name)
	doc.check_permission(ptype)
	return doc


def _occasion_payload(doc) -> dict:
	from e_card_ms.legal import terms_pending

	data = doc.as_dict(convert_dates_to_str=True)
	invited = frappe.get_all(
		"Occasion Guest Invite Log",
		filters={"occasion": doc.name, "success": 1, "message_type": "Invitation"},
		fields=["guest_code", "channel"],
	)
	sent = {}
	for row in invited:
		sent.setdefault(row.guest_code, set()).add(row.channel)
	for guest in data["guests"]:
		channels = sent.get(guest["guest_code"], set())
		guest["sent_sms"] = "SMS" in channels
		guest["sent_whatsapp"] = "WhatsApp" in channels

	subscriptions = frappe.get_all(
		"Occasion Subscription",
		filters={"occasion": doc.name, "docstatus": ["<", 2]},
		fields=["name", "number_of_guests", "subscription_price", "docstatus", "payment_status",
				"receipt_url", "sms_credits_included", "whatsapp_credits_included", "creation"],
		order_by="creation desc",
	)
	for sub in subscriptions:
		sub.creation = str(sub.creation)

	return {
		"doc": data,
		"billing": doc.get_billing_status(),
		"timeseries": doc.get_timeseries(),
		"invited_count": doc.get_invited_count(),
		"subscriptions": subscriptions,
		"gate_url": frappe.utils.get_url(f"/gate-checkin?occasion={frappe.utils.quote(doc.name)}"),
		"terms_pending": terms_pending(),
	}


# ---------------------------------------------------------------- reading


@frappe.whitelist()
def get_home() -> dict:
	from e_card_ms.legal import terms_pending
	from e_card_ms.utils.credits import get_balances

	_require_login()
	occasions = frappe.get_list(
		"Occasion",
		fields=["name", "occasion_name", "couple_names", "occasion_date", "occasion_time", "venue_name", "status",
				"total_pledged", "total_collected", "total_budget", "card_design", "card_preview_image"],
		order_by="occasion_date asc",
		limit_page_length=200,
	)
	names = [o.name for o in occasions]
	counts = {}
	if names:
		for row in frappe.db.sql(
			"""select parent, count(*) as guests, sum(checked_in) as checked_in,
				sum(rsvp_status='Confirmed') as confirmed
			from `tabOccasion Guest` where parenttype='Occasion' and parent in %(names)s group by parent""",
			{"names": names},
			as_dict=True,
		):
			counts[row.parent] = row
	for occ in occasions:
		c = counts.get(occ.name) or {}
		occ.guests = cint(c.get("guests"))
		occ.checked_in = cint(c.get("checked_in"))
		occ.confirmed = cint(c.get("confirmed"))
		occ.occasion_date = str(occ.occasion_date) if occ.occasion_date else None

	user = frappe.db.get_value("User", frappe.session.user, ["full_name", "email"], as_dict=True)
	return {
		"user": user,
		"occasions": occasions,
		"balances": get_balances(frappe.session.user),
		"terms_pending": terms_pending(),
		"settings": _public_settings(),
	}


@frappe.whitelist()
def get_occasion(name: str) -> dict:
	return _occasion_payload(_get(name))


def _public_settings() -> dict:
	settings = frappe.get_cached_doc("E Card Settings")
	return {
		"sms_price": flt(settings.sms_credit_price),
		"whatsapp_price": flt(settings.whatsapp_credit_price),
		"top_up_percent": cint(settings.top_up_locked_percent),
		"online_payment": bool(cint(settings.payment_enabled)),
	}


# ---------------------------------------------------------------- writing


@frappe.whitelist(methods=["POST"])
def create_occasion(values) -> dict:
	_require_login()
	values = frappe.parse_json(values) or {}
	if not frappe.has_permission("Occasion", "create"):
		frappe.throw(_("You are not allowed to create occasions."), frappe.PermissionError)
	doc = frappe.new_doc("Occasion")
	for field in CREATE_FIELDS:
		if field in values:
			doc.set(field, values[field])
	doc.insert()
	return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def update_occasion(name: str, values) -> dict:
	doc = _get(name, "write")
	values = frappe.parse_json(values) or {}
	for field, value in values.items():
		if field not in EDITABLE_FIELDS:
			frappe.throw(_("{0} can't be changed here.").format(field))
		doc.set(field, value)
	doc.save()
	return _occasion_payload(doc)


@frappe.whitelist(methods=["POST"])
def save_row(name: str, table: str, row) -> dict:
	"""Add a row (no `name`) or update one (with its `name`) in a child table."""
	if table not in EDITABLE_TABLES:
		frappe.throw(_("Unknown table {0}.").format(table))
	doc = _get(name, "write")
	row = frappe.parse_json(row) or {}
	values = {k: v for k, v in row.items() if k in EDITABLE_TABLES[table]}

	if row.get("name"):
		target = next((r for r in doc.get(table) if r.name == row["name"]), None)
		if not target:
			frappe.throw(_("That row no longer exists. Reload the page."))
		target.update(values)
	else:
		doc.append(table, values)
	doc.save()
	return _occasion_payload(doc)


@frappe.whitelist(methods=["POST"])
def delete_row(name: str, table: str, row_name: str) -> dict:
	if table not in EDITABLE_TABLES:
		frappe.throw(_("Unknown table {0}.").format(table))
	doc = _get(name, "write")
	rows = doc.get(table)
	target = next((r for r in rows if r.name == row_name), None)
	if not target:
		frappe.throw(_("That row no longer exists. Reload the page."))
	if table == "contributors" and any(p.contributor_id == target.contributor_id for p in doc.contribution_payments):
		frappe.throw(_("This contributor has payments recorded. Delete the payments first."))
	if table == "guests" and target.checked_in:
		frappe.throw(_("This guest has already checked in and can't be removed."))
	doc.set(table, [r for r in rows if r.name != row_name])
	doc.save()
	return _occasion_payload(doc)


@frappe.whitelist(methods=["POST"])
def run_action(name: str, action: str, args=None) -> dict:
	"""Occasion actions from the website, through the same controller methods
	the Desk uses (each re-checks permissions, subscription and credits)."""
	actions = {
		"generate_all_cards": "write",
		"send_all_sms": "write",
		"send_all_whatsapp": "write",
		"add_paid_contributors_to_guests": "write",
		"record_payment": "write",
		"import_contributors": "write",
		"request_subscription": "write",
	}
	if action not in actions:
		frappe.throw(_("Unknown action."))
	doc = _get(name, actions[action])
	args = frappe.parse_json(args) or {}
	result = getattr(doc, action)(**args)
	return {"result": result, "occasion": _occasion_payload(frappe.get_doc("Occasion", name))}
