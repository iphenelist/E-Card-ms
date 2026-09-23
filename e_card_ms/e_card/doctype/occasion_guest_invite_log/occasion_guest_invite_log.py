import frappe
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
	"""Restrict Invite Log visibility to occasions assigned to the requesting user, unless System Manager."""
	if not user:
		user = frappe.session.user
	if "System Manager" in frappe.get_roles(user):
		return ""
	return (
		"`tabOccasion Guest Invite Log`.`occasion` in "
		f"(select `name` from `tabOccasion` where `assigned_user` = {frappe.db.escape(user)})"
	)


def has_permission(doc, ptype="read", user=None):
	"""Restrict direct Invite Log access to occasions assigned to the requesting user, unless System Manager."""
	if not user:
		user = frappe.session.user
	if "System Manager" in frappe.get_roles(user):
		return True
	return frappe.db.get_value("Occasion", doc.occasion, "assigned_user") == user


class OccasionGuestInviteLog(Document):
	pass
