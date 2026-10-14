import random
import secrets
import string
from collections import defaultdict

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, getdate, today

from e_card_ms.permissions import is_staff
from e_card_ms.utils.phone import normalize_phone

CONTRIBUTOR_ID_PREFIX = "C-"
CARD_TYPES = ("SINGLE", "DOUBLE", "VIP", "TABLE")
FIXED_CARD_ADMITS = {"SINGLE": 1, "VIP": 1, "DOUBLE": 2}
DEFAULT_TABLE_SIZE = 10


def card_admits(card_type: str | None, admits=None, table_size=None) -> int:
    """How many people one card lets in at the gate. TABLE cards keep their own
    size when set (2 or more), otherwise use the Occasion's table size."""
    fixed = FIXED_CARD_ADMITS.get(card_type or "SINGLE")
    if fixed:
        return fixed
    if cint(admits) >= 2:
        return cint(admits)
    return max(cint(table_size) or DEFAULT_TABLE_SIZE, 1)


def get_permission_query_conditions(user=None):
    """Occasion list/report views: everyone sees only the Occasions they created
    (or that a System Manager assigned to them); staff see all."""
    if not user:
        user = frappe.session.user
    if is_staff(user):
        return ""
    user = frappe.db.escape(user)
    return f"(`tabOccasion`.`owner` = {user} or `tabOccasion`.`assigned_user` = {user})"


def has_permission(doc, ptype="read", user=None):
    """Direct Occasion access: only its creator or assigned user, unless staff.
    Creating is allowed by role (Occasion Manager) — validate() then assigns
    the new Occasion to its creator."""
    if not user:
        user = frappe.session.user
    if is_staff(user):
        return True
    if ptype == "create" or doc.is_new():
        return True
    return user in (doc.owner, doc.assigned_user)


class Occasion(Document):

    def validate(self):
        # assigned_user is permlevel 1: Frappe resets it for non-staff *after*
        # before_insert, so the creator is assigned here instead.
        if self.is_new() and not self.assigned_user and not is_staff():
            self.assigned_user = frappe.session.user
        if not self.gate_pin:
            self.gate_pin = "".join(secrets.choice(string.digits) for _digit in range(6))

        self._compute_budget()
        self._compute_contributions()
        if self.auto_add_paid_contributors:
            self._add_paid_contributors_to_guests()
        for guest in self.guests:
            guest.admits = card_admits(guest.card_type, guest.admits, self.table_size)

    def before_save(self):
        if self.card_design and not self.card_preview_image:
            # Sane default until the layout designer generates a styled composite
            self.card_preview_image = self.card_design

        base = frappe.utils.get_url().rstrip("/")
        for guest in self.guests:
            if guest.guest_code and not guest.download_url:
                guest.download_url = f"{base}/invitee/download/occasion-card/{guest.guest_code}"

    def _generate_unique_code(self):
        in_this_doc = {g.guest_code for g in self.guests if g.guest_code}
        for _attempt in range(100):
            code = ''.join(random.choices(string.digits, k=6))
            if code not in in_this_doc and not frappe.db.exists("Occasion Guest", {"guest_code": code}):
                return code
        frappe.throw("Could not generate a unique guest code. Please try again.")

    # ------------------------------------------------------------ budget & contributions

    def _compute_budget(self):
        self.total_budget = sum(flt(row.budgeted_amount) for row in self.budget_items)
        self.total_spent = sum(flt(row.actual_amount) for row in self.budget_items)

    def _compute_contributions(self):
        existing_ids = [c.contributor_id for c in self.contributors if c.contributor_id]
        duplicates = {cid for cid in existing_ids if existing_ids.count(cid) > 1}
        if duplicates:
            frappe.throw(_("Duplicate contributor ID(s): {0}").format(", ".join(sorted(duplicates))))

        next_number = max(
            (cint(cid[len(CONTRIBUTOR_ID_PREFIX):]) for cid in existing_ids if cid.startswith(CONTRIBUTOR_ID_PREFIX)),
            default=0,
        ) + 1
        for contributor in self.contributors:
            if not contributor.contributor_id:
                contributor.contributor_id = f"{CONTRIBUTOR_ID_PREFIX}{next_number:04d}"
                next_number += 1

        by_id = {c.contributor_id: c for c in self.contributors}
        paid = defaultdict(float)
        for payment in self.contribution_payments:
            contributor = by_id.get(payment.contributor_id)
            if not contributor:
                frappe.throw(
                    _("Payments row {0}: contributor '{1}' does not exist in the Contributors table.").format(
                        payment.idx, payment.contributor_id or ""
                    )
                )
            payment.contributor_name = contributor.contributor_name
            paid[payment.contributor_id] += flt(payment.amount)

        for contributor in self.contributors:
            contributor.paid_amount = paid[contributor.contributor_id]
            pledged = flt(contributor.pledged_amount)
            contributor.balance = max(pledged - contributor.paid_amount, 0)
            if contributor.paid_amount <= 0:
                contributor.payment_status = "Not Paid"
            elif contributor.paid_amount >= pledged:
                # Includes a payment with no pledge recorded: nothing left to pay.
                contributor.payment_status = "Fully Paid"
            else:
                contributor.payment_status = "Partially Paid"

        self.total_pledged = sum(flt(c.pledged_amount) for c in self.contributors)
        self.total_collected = sum(flt(c.paid_amount) for c in self.contributors)
        self.outstanding_pledges = sum(flt(c.balance) for c in self.contributors)
        self.funding_gap = flt(self.total_budget) - flt(self.total_collected)

    def _add_paid_contributors_to_guests(self) -> int:
        """Give every fully paid contributor a place on the Guests list (once).
        A contributor already in Guests (same phone) is linked, not duplicated.
        Contributors without a phone are skipped: a guest needs a phone to be
        invited (and Occasion Guest requires one)."""
        guests_by_phone = {normalize_phone(g.phone): g for g in self.guests if g.phone}
        added = 0
        for contributor in self.contributors:
            if contributor.payment_status != "Fully Paid" or contributor.guest_code or not contributor.phone:
                continue
            existing = guests_by_phone.get(normalize_phone(contributor.phone))
            if existing:
                if not existing.guest_code:
                    existing.guest_code = self._generate_unique_code()
                contributor.guest_code = existing.guest_code
                continue
            guest = self.append("guests", {
                "guest_name": contributor.contributor_name,
                "phone": contributor.phone,
                "card_type": contributor.card_type or "SINGLE",
                "guest_code": self._generate_unique_code(),
            })
            contributor.guest_code = guest.guest_code
            if guest.phone:
                guests_by_phone[normalize_phone(guest.phone)] = guest
            added += 1
        return added

    @frappe.whitelist()
    def add_paid_contributors_to_guests(self):
        self.check_permission("write")
        added = self._add_paid_contributors_to_guests()
        self.save()
        return added

    @frappe.whitelist()
    def record_payment(self, contributor_id: str, amount: float, payment_date: str | None = None,
                       payment_method: str | None = None, reference: str | None = None, notes: str | None = None):
        # Not "method": run_doc_method already uses that argument name.
        self.check_permission("write")
        if flt(amount) <= 0:
            frappe.throw(_("Amount must be more than 0."))
        if not any(c.contributor_id == contributor_id for c in self.contributors):
            frappe.throw(_("Contributor {0} not found.").format(contributor_id))
        self.append("contribution_payments", {
            "contributor_id": contributor_id,
            "amount": flt(amount),
            "payment_date": payment_date or today(),
            "method": payment_method or "Cash",
            "reference": reference,
            "notes": notes,
        })
        self.save()
        contributor = next(c for c in self.contributors if c.contributor_id == contributor_id)
        return {
            "paid_amount": contributor.paid_amount,
            "balance": contributor.balance,
            "payment_status": contributor.payment_status,
            "guest_code": contributor.guest_code,
        }

    @frappe.whitelist()
    def import_contributors(self, file_url: str):
        """Add contributors from an uploaded Excel/CSV that follows the template.
        Matches existing contributors by phone, so re-importing the same file
        doesn't create duplicates."""
        self.check_permission("write")
        rows = _read_spreadsheet(file_url, self)
        if not rows:
            frappe.throw(_("The file is empty."))

        header = [str(h or "").strip().lower() for h in rows[0]]
        col = {key: _find_column(header, aliases) for key, aliases in IMPORT_COLUMNS.items()}
        if col["name"] is None:
            frappe.throw(_("The file must have a 'Name' column. Download the template to see the expected columns."))

        by_phone = {normalize_phone(c.phone): c for c in self.contributors if c.phone}
        added, updated, skipped = 0, 0, []
        for line_no, row in enumerate(rows[1:], start=2):
            value = lambda key: (row[col[key]] if col[key] is not None and col[key] < len(row) else None)  # noqa: E731
            name = str(value("name") or "").strip()
            if not name:
                if any(cell not in (None, "") for cell in row):
                    skipped.append(_("Row {0}: missing name").format(line_no))
                continue
            phone = str(value("phone") or "").strip()
            if phone.endswith(".0"):  # Excel turns 0712... into 712345678.0
                phone = phone[:-2]
            try:
                pledged = flt(value("pledged") or 0)
                paid_so_far = flt(value("paid") or 0)
            except Exception:
                skipped.append(_("Row {0}: amounts must be numbers").format(line_no))
                continue
            card_type = str(value("card_type") or "SINGLE").strip().upper()
            if card_type not in CARD_TYPES:
                card_type = "SINGLE"

            existing = by_phone.get(normalize_phone(phone)) if phone else None
            if existing:
                existing.contributor_name = name
                if pledged:
                    existing.pledged_amount = pledged
                existing.card_type = card_type
                updated += 1
                continue

            contributor = self.append("contributors", {
                "contributor_name": name,
                "phone": phone,
                "pledged_amount": pledged,
                "card_type": card_type,
            })
            if phone:
                by_phone[normalize_phone(phone)] = contributor
            if paid_so_far > 0:
                # contributor_id is assigned in validate(); remember the row to link the payment after.
                contributor.flags.opening_payment = paid_so_far
            added += 1

        # Assign IDs first so opening payments can point at them.
        self._compute_contributions()
        for contributor in self.contributors:
            opening = contributor.flags.get("opening_payment") if contributor.flags else None
            if opening:
                self.append("contribution_payments", {
                    "contributor_id": contributor.contributor_id,
                    "amount": opening,
                    "payment_date": today(),
                    "method": "Other",
                    "notes": "Imported",
                })
        self.save()
        return {"added": added, "updated": updated, "skipped": skipped}

    # ------------------------------------------------------------ subscription & sending

    def paid_guest_capacity(self) -> int:
        """Guests covered by approved (submitted) card subscriptions for this Occasion."""
        if self.is_new():
            return 0
        return cint(frappe.db.sql(
            "select coalesce(sum(number_of_guests), 0) from `tabOccasion Subscription` "
            "where occasion=%s and docstatus=1",
            self.name,
        )[0][0])

    def assert_can_send(self):
        """Card generation and every outgoing message need an approved card
        subscription (staff are exempt) and, for managers, accepted Terms."""
        from e_card_ms.legal import assert_terms_accepted

        assert_terms_accepted()
        if is_staff():
            return
        if not self.paid_guest_capacity():
            frappe.throw(
                _(
                    "Lipia kadi za tukio hili kwanza, kwenye sehemu ya Malipo. / "
                    "Pay for this event's cards first, under Payments."
                ),
                title=_("Subscription required"),
            )

    @frappe.whitelist()
    def get_billing_status(self):
        from e_card_ms.utils import credits

        payer = self.assigned_user or frappe.session.user
        pending = frappe.get_all(
            "Occasion Subscription",
            filters={"occasion": self.name, "docstatus": 0},
            fields=["name", "number_of_guests", "subscription_price"],
        )
        return {
            "capacity": self.paid_guest_capacity(),
            "guests": len(self.guests),
            "pending_requests": pending,
            "balances": credits.get_balances(payer),
            "is_staff": is_staff(),
            "gate_pin": self.gate_pin,
        }

    @frappe.whitelist()
    def request_subscription(self, number_of_guests: int | None = None):
        """Occasion Manager asks to pay for cards; a System Manager approves by submitting."""
        self.check_permission("write")
        number_of_guests = cint(number_of_guests) or max(len(self.guests) - self.paid_guest_capacity(), 0)
        if number_of_guests <= 0:
            frappe.throw(_("Enter how many guest cards you need."))
        if frappe.db.exists("Occasion Subscription", {"occasion": self.name, "docstatus": 0}):
            frappe.throw(_("A subscription request for this occasion is already waiting for approval."))

        user = self.assigned_user or frappe.session.user
        user_doc = frappe.get_doc("User", user)
        subscription = frappe.get_doc({
            "doctype": "Occasion Subscription",
            "applicant_name": user_doc.full_name or user,
            "email": user_doc.email,
            # The Phone field only accepts international format (+255...).
            "phone": ("+" + normalize_phone(user_doc.mobile_no)) if user_doc.mobile_no else None,
            "user": user,
            "occasion": self.name,
            "occasion_date": self.occasion_date,
            "number_of_guests": number_of_guests,
            "status": "Pending",
        })
        subscription.flags.requested_from_occasion = True
        subscription.insert(ignore_permissions=True)
        return {"name": subscription.name, "price": subscription.subscription_price}

    @frappe.whitelist()
    def generate_all_cards(self):
        """Bulk generate QR + composed card images for all guests"""
        from e_card_ms.utils.card_composer import compose_card
        self.check_permission("write")
        self.assert_can_send()
        capacity = None if is_staff() else self.paid_guest_capacity()
        results = {"success": 0, "failed": 0, "errors": []}
        for position, guest in enumerate(self.guests, start=1):
            if capacity is not None and position > capacity:
                results["failed"] += 1
                results["errors"].append(
                    f"{guest.guest_name}: beyond your subscription of {capacity} cards — request more cards first."
                )
                continue
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

    def _invited_guest_codes(self, channel: str) -> set:
        """Guests who already received a successful invitation on this channel."""
        rows = frappe.get_all(
            "Occasion Guest Invite Log",
            filters={"occasion": self.name, "channel": channel, "success": 1, "message_type": "Invitation"},
            pluck="guest_code",
        )
        return set(rows)

    def uninvited_guests(self, channel: str) -> list:
        already_sent = self._invited_guest_codes(channel)
        return [g for g in self.guests if g.guest_code not in already_sent]

    def _send_all(self, channel: str, send_fn) -> dict:
        from e_card_ms.utils.credits import InsufficientCreditsError

        self.check_permission("write")
        self.assert_can_send()
        results = {"success": 0, "failed": 0, "errors": []}
        for guest in self.uninvited_guests(channel):
            try:
                send_fn(self, guest)
                results["success"] += 1
            except InsufficientCreditsError as e:
                results["failed"] += 1
                results["errors"].append(str(e))
                break
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{guest.guest_name}: {str(e)}")
        return results

    @frappe.whitelist()
    def send_all_whatsapp(self):
        """Send WhatsApp messages to all guests not yet sent (first send only —
        repeat reminders are handled by the Occasion Subscription's automatic
        sending schedule, not this manual action)."""
        from e_card_ms.api.whatsapp import send_invitation
        return self._send_all("WhatsApp", send_invitation)

    @frappe.whitelist()
    def send_all_sms(self):
        """Send SMS invitations to all guests not yet sent (first send only —
        repeat reminders are handled by the Occasion Subscription's automatic
        sending schedule, not this manual action)."""
        from e_card_ms.api.sms import send_invitation
        return self._send_all("SMS", send_invitation)

    @frappe.whitelist()
    def get_invited_count(self) -> int:
        """Count of distinct guests who have received at least one WhatsApp/SMS invite"""
        rows = frappe.db.sql(
            "SELECT COUNT(DISTINCT guest_code) FROM `tabOccasion Guest Invite Log` "
            "WHERE occasion = %s AND success = 1 AND message_type = 'Invitation'",
            self.name,
        )
        return rows[0][0] if rows else 0

    @frappe.whitelist()
    def get_timeseries(self) -> dict:
        """Cumulative series for the statistics line charts: contributions
        collected (by payment date), guests invited (first successful
        invitation per guest, by day) and gate arrivals (by check-in time)."""
        self.check_permission("read")

        collected = defaultdict(float)
        for payment in self.contribution_payments:
            if payment.payment_date:
                collected[str(getdate(payment.payment_date))] += flt(payment.amount)

        first_invite = frappe.db.sql(
            """
            select min(sent_at) from `tabOccasion Guest Invite Log`
            where occasion=%s and success=1 and message_type='Invitation' and guest_code is not null
            group by guest_code
            """,
            self.name,
        )
        invited = defaultdict(int)
        for (sent_at,) in first_invite:
            if sent_at:
                invited[str(getdate(sent_at))] += 1

        check_ins = sorted(
            frappe.utils.get_datetime(g.check_in_time) for g in self.guests if g.checked_in and g.check_in_time
        )
        arrivals = defaultdict(int)
        # Arrivals happen within hours on the day: bucket by 15 minutes then;
        # by day when check-ins span several days (re-entry, multi-day events).
        same_day = check_ins and check_ins[0].date() == check_ins[-1].date()
        for moment in check_ins:
            if same_day:
                key = moment.replace(minute=moment.minute - moment.minute % 15, second=0, microsecond=0)
                arrivals[key.strftime("%H:%M")] += 1
            else:
                arrivals[str(moment.date())] += 1

        def cumulative(buckets):
            total, points = 0, []
            for key in sorted(buckets):
                total += buckets[key]
                points.append({"x": key, "y": total})
            return points

        return {
            "collected": cumulative(collected),
            "invited": cumulative(invited),
            "arrivals": cumulative(arrivals),
            "arrivals_by_time": bool(same_day),
            "guests": len(self.guests),
            "pledged": flt(self.total_pledged),
        }


# ---------------------------------------------------------------- spreadsheet helpers

IMPORT_COLUMNS = {
    "name": ("name", "jina", "contributor", "contributor name", "mchangiaji"),
    "phone": ("phone", "simu", "namba ya simu", "phone number", "mobile"),
    "pledged": ("pledge", "pledged", "ahadi", "pledged amount"),
    "card_type": ("card type", "aina ya kadi", "kadi", "card"),
    "paid": ("paid so far", "paid", "amelipa", "imelipwa", "paid amount"),
}
TEMPLATE_HEADER = ["Name", "Phone", "Pledge", "Card Type", "Paid so far"]


def _find_column(header, aliases):
    for i, h in enumerate(header):
        if h in aliases:
            return i
    return None


def _read_spreadsheet(file_url: str, occasion) -> list:
    file_doc = frappe.get_doc("File", {"file_url": file_url})
    attached_here = file_doc.attached_to_doctype == "Occasion" and file_doc.attached_to_name == occasion.name
    if not (attached_here or file_doc.owner == frappe.session.user or is_staff()):
        frappe.throw(_("You can only import a file you uploaded."), frappe.PermissionError)

    content = file_doc.get_content()
    extension = (file_doc.file_name or file_url).rsplit(".", 1)[-1].lower()
    if extension == "xlsx":
        from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file

        return read_xlsx_file_from_attached_file(fcontent=content)
    if extension == "xls":
        from frappe.utils.xlsxutils import read_xls_file_from_attached_file

        return read_xls_file_from_attached_file(content)
    if extension == "csv":
        from frappe.utils.csvutils import read_csv_content

        return read_csv_content(content)
    frappe.throw(_("Upload an .xlsx, .xls or .csv file."))


@frappe.whitelist()
def download_contributor_template():
    from frappe.utils.xlsxutils import build_xlsx_response

    build_xlsx_response(
        [TEMPLATE_HEADER, ["Mfano: Juma Ali", "0712345678", 100000, "SINGLE", 50000]],
        "contributors_template",
    )


@frappe.whitelist()
def export_contributors(occasion: str):
    from frappe.utils.xlsxutils import build_xlsx_response

    doc = frappe.get_doc("Occasion", occasion)
    doc.check_permission("read")
    data = [["ID", "Name", "Phone", "Card Type", "Pledge", "Paid", "Balance", "Status", "Guest Code"]]
    for c in doc.contributors:
        data.append([
            c.contributor_id, c.contributor_name, c.phone, c.card_type, flt(c.pledged_amount),
            flt(c.paid_amount), flt(c.balance), c.payment_status, c.guest_code or "",
        ])
    data.append([])
    data.append(["Payments"])
    data.append(["Contributor ID", "Name", "Date", "Amount", "Method", "Reference", "Notes"])
    for p in doc.contribution_payments:
        data.append([
            p.contributor_id, p.contributor_name, str(getdate(p.payment_date)) if p.payment_date else "",
            flt(p.amount), p.method, p.reference or "", p.notes or "",
        ])
    build_xlsx_response(data, frappe.scrub(f"{doc.name} contributors"))
