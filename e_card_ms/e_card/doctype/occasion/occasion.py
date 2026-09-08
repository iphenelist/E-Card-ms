import frappe
import random
import string
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
    """Restrict Occasion list/report views to the assigned user, unless System Manager."""
    if not user:
        user = frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return ""
    return f"`tabOccasion`.`assigned_user` = {frappe.db.escape(user)}"


def has_permission(doc, ptype="read", user=None):
    """Restrict direct Occasion access to the assigned user, unless System Manager."""
    if not user:
        user = frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return True
    return doc.assigned_user == user


class Occasion(Document):

    def before_save(self):
        if self.card_design and not self.card_preview_image:
            # Sane default until the layout designer generates a styled composite
            self.card_preview_image = self.card_design

        base = frappe.utils.get_url().rstrip("/")
        for guest in self.guests:
            if guest.guest_code and not guest.download_url:
                guest.download_url = f"{base}/invitee/download/occasion-card/{guest.guest_code}"

    def _generate_unique_code(self):
        for _ in range(100):
            code = ''.join(random.choices(string.digits, k=6))
            if not frappe.db.exists("Occasion Guest", {"guest_code": code}):
                return code
        frappe.throw("Could not generate a unique guest code. Please try again.")

    @frappe.whitelist()
    def generate_all_cards(self):
        """Bulk generate QR + composed card images for all guests"""
        from e_card_ms.utils.card_composer import compose_card
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.guests:
            if not guest.guest_code:
                guest.guest_code = self._generate_unique_code()
                frappe.db.set_value("Occasion Guest", guest.name, "guest_code", guest.guest_code)
            try:
                compose_card(self, guest)
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        self.save()
        return results

    @frappe.whitelist()
    def send_all_whatsapp(self):
        """Send WhatsApp messages to all guests not yet sent"""
        from e_card_ms.api.whatsapp import send_invitation
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.guests:
            if guest.whatsapp_sent:
                continue
            try:
                send_invitation(self, guest)
                frappe.db.set_value("Occasion Guest", guest.name, {
                    "whatsapp_sent": 1,
                    "sent_at": frappe.utils.now()
                })
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        return results

    @frappe.whitelist()
    def send_all_sms(self):
        """Send SMS invitations to all guests not yet sent"""
        from e_card_ms.api.sms import send_invitation
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.guests:
            if guest.sms_sent:
                continue
            try:
                send_invitation(self, guest)
                frappe.db.set_value("Occasion Guest", guest.name, {
                    "sms_sent": 1,
                    "sms_sent_at": frappe.utils.now()
                })
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        return results
