import frappe


def after_install():
    # "Event Manager": internal staff role, granted access in occasion.json,
    # occasion_subscription.json and occasion_guest_invite_log.json.
    # "Occasion Client": auto-assigned to the User created for each applicant
    # on Occasion Subscription submission — granted access to Occasion only
    # (see occasion.json), never the Subscription, Invite Log, or reports.
    for role_name in ("Event Manager", "Occasion Client"):
        if not frappe.db.exists("Role", role_name):
            r = frappe.new_doc("Role")
            r.role_name = role_name
            r.desk_access = 1
            r.insert(ignore_permissions=True)

    frappe.db.commit()
    print("✅ Event Manager / Occasion Client roles installed successfully!")
