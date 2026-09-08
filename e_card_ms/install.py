import frappe


def after_install():
    # Create the "Event Manager" role — the one actually granted access in
    # occasion.json's DocType permissions.
    if not frappe.db.exists("Role", "Event Manager"):
        r = frappe.new_doc("Role")
        r.role_name = "Event Manager"
        r.insert(ignore_permissions=True)

    frappe.db.commit()
    print("✅ Event Manager role installed successfully!")
