import frappe

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/dashboard"
		raise frappe.Redirect

	context.title = "Matukio yangu — E Card"
	context.body_class = "ec-body ec-body-portal"
	context.no_breadcrumbs = 1
	context.ec_business_name = frappe.db.get_single_value("E Card Settings", "business_legal_name")
