frappe.ready(function () {
	const price_per_guest_card = {{ price_per_guest_card }};

	function update_subscription_price() {
		const guests = cint(frappe.web_form.get_value("number_of_guests")) || 0;
		frappe.web_form.set_value("subscription_price", guests * price_per_guest_card);
	}

	// frappe.web_form.on() only fires on blur (it hooks the field's model-commit,
	// not keystrokes) — bind the raw input too so the estimate updates live as
	// the applicant types, not just after they click away.
	const guests_field = frappe.web_form.get_field("number_of_guests");
	if (guests_field && guests_field.$input) {
		guests_field.$input.on("input", update_subscription_price);
	}

	frappe.web_form.events.on("after_load", update_subscription_price);
	frappe.web_form.on("number_of_guests", update_subscription_price);
});
