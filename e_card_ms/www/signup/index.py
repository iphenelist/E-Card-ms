import frappe
from frappe.utils import cint

no_cache = 1


def get_context(context):
	if frappe.session.user != "Guest":
		frappe.local.flags.redirect_location = "/dashboard"
		raise frappe.Redirect

	settings = frappe.get_cached_doc("E Card Settings")
	context.title = "Jisajili — E Card"
	context.body_class = "ec-body"
	context.no_breadcrumbs = 1
	context.ec_business_name = settings.business_legal_name
	context.signup_bonus_sms = cint(settings.signup_bonus_sms)
	context.signup_bonus_whatsapp = cint(settings.signup_bonus_whatsapp)
	context.terms_version = settings.terms_version or "1.0"
