import frappe
import random
import string
from frappe.model.document import Document


class OccasionGuest(Document):

    def before_insert(self):
        if not self.guest_code:
            self.guest_code = self._generate_unique_code()

    def before_save(self):
        if not self.guest_code:
            self.guest_code = self._generate_unique_code()

    def _generate_unique_code(self):
        """Generate a unique 6-digit numeric code across all occasions"""
        for _ in range(100):
            code = ''.join(random.choices(string.digits, k=6))
            exists = frappe.db.exists("Occasion Guest", {"guest_code": code})
            if not exists:
                return code
        frappe.throw("Could not generate a unique guest code. Please try again.")
