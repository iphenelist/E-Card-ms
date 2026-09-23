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

    def _already_invited_guest_codes(self, channel: str) -> set:
        rows = frappe.get_all(
            "Occasion Guest Invite Log",
            filters={"occasion": self.name, "channel": channel},
            pluck="guest_code",
        )
        return set(rows)

    @frappe.whitelist()
    def send_all_whatsapp(self):
        """Send WhatsApp messages to all guests not yet sent (first send only —
        repeat reminders are handled by the Occasion Subscription's automatic
        sending schedule, not this manual action)."""
        from e_card_ms.api.whatsapp import send_invitation
        already_sent = self._already_invited_guest_codes("WhatsApp")
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.guests:
            if guest.guest_code in already_sent:
                continue
            try:
                send_invitation(self, guest)
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        return results

    @frappe.whitelist()
    def send_all_sms(self):
        """Send SMS invitations to all guests not yet sent (first send only —
        repeat reminders are handled by the Occasion Subscription's automatic
        sending schedule, not this manual action)."""
        from e_card_ms.api.sms import send_invitation
        already_sent = self._already_invited_guest_codes("SMS")
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.guests:
            if guest.guest_code in already_sent:
                continue
            try:
                send_invitation(self, guest)
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        return results

    @frappe.whitelist()
    def get_invited_count(self) -> int:
        """Count of distinct guests who have received at least one WhatsApp/SMS invite"""
        rows = frappe.db.sql(
            "SELECT COUNT(DISTINCT guest_code) FROM `tabOccasion Guest Invite Log` WHERE occasion = %s",
            self.name,
        )
        return rows[0][0] if rows else 0
