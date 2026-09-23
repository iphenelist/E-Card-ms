frappe.ui.form.on("Occasion Subscription", {
    create_occasion_btn(frm) {
        frappe.confirm(
            __("Create a new Occasion for {0}?", [frm.doc.applicant_name]),
            function () {
                frappe.call({
                    method: "create_occasion",
                    doc: frm.doc,
                    freeze: true,
                    freeze_message: __("Creating Occasion..."),
                    callback(r) {
                        if (!r.exc) {
                            frappe.show_alert({ message: __("Occasion created!"), indicator: "green" });
                            frm.reload_doc().then(() => {
                                frappe.set_route("Form", "Occasion", r.message);
                            });
                        }
                    }
                });
            }
        );
    }
});
