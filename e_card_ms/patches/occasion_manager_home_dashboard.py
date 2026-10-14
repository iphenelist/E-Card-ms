import frappe


def execute():
	"""Occasion Managers now work from the website dashboard (/dashboard)."""
	if frappe.db.exists("Role", "Occasion Manager"):
		frappe.db.set_value("Role", "Occasion Manager", "home_page", "/dashboard")
		frappe.cache.delete_value("home_page")
