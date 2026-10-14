import frappe


def execute():
	"""Extra guests added later keep the customer's earlier card rate for at
	most 20% of the cards already paid (see e_card_ms.utils.pricing)."""
	from e_card_ms.install import _saved_before

	if not _saved_before("top_up_locked_percent"):
		frappe.db.set_single_value("E Card Settings", "top_up_locked_percent", 20)
		frappe.db.commit()
