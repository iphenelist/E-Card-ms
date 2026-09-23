import frappe


def get_context(context):
	# Public: only the per-guest-card price is exposed here (nothing else
	# from E Card Settings) so the applicant sees a live price estimate as
	# they type their guest count.
	context.price_per_guest_card = frappe.utils.flt(
		frappe.db.get_single_value("E Card Settings", "price_per_guest_card")
	)
