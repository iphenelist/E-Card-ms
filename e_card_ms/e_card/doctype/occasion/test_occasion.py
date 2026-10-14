# Copyright (c) 2026, Innocent P Metumba and Contributors
# See license.txt

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = ["User"]

MANAGER = "occasion.manager.test@example.com"
OTHER_MANAGER = "other.manager.test@example.com"
STAFF = "system.staff.test@example.com"


def make_user(email, roles):
	if not frappe.db.exists("User", email):
		frappe.get_doc({
			"doctype": "User",
			"email": email,
			"first_name": email.split("@")[0],
			"user_type": "System User",
			"send_welcome_email": 0,
			"roles": [{"role": r} for r in roles],
		}).insert(ignore_permissions=True)
	return email


def make_occasion(owner=MANAGER, **kwargs):
	frappe.set_user(owner)
	doc = frappe.get_doc({
		"doctype": "Occasion",
		"occasion_name": kwargs.pop("occasion_name", f"Test Occasion {frappe.generate_hash(length=8)}"),
		"couple_names": "Amina & Baraka",
		"occasion_date": frappe.utils.add_days(frappe.utils.today(), 30),
		"occasion_time": "Saa 12:00 jioni",
		"venue_name": "Diamond Jubilee",
		**kwargs,
	})
	doc.insert()
	frappe.set_user("Administrator")
	return doc


def approve_subscription(occasion, guests=10):
	sub = frappe.get_doc({
		"doctype": "Occasion Subscription",
		"applicant_name": "Test",
		"email": occasion.assigned_user,
		"user": occasion.assigned_user,
		"occasion": occasion.name,
		"occasion_date": occasion.occasion_date,
		"number_of_guests": guests,
	})
	sub.flags.requested_from_occasion = True
	sub.insert(ignore_permissions=True)
	sub.submit()
	return sub


class IntegrationTestOccasion(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		make_user(MANAGER, ["Occasion Manager", "Desk User"])
		make_user(OTHER_MANAGER, ["Occasion Manager", "Desk User"])
		make_user(STAFF, ["System Manager", "Desk User"])
		# Managers must have accepted the current Terms to send.
		from e_card_ms.legal import record_acceptance

		for user in (MANAGER, OTHER_MANAGER):
			record_acceptance(user, "Sign-up")

	def tearDown(self):
		frappe.set_user("Administrator")

	# ------------------------------------------------------------ ownership & permissions

	def test_creator_is_assigned_and_isolated(self):
		occasion = make_occasion()
		self.assertEqual(occasion.assigned_user, MANAGER)
		self.assertEqual(len(occasion.gate_pin), 6)

		frappe.set_user(OTHER_MANAGER)
		self.assertFalse(frappe.has_permission("Occasion", "read", doc=occasion.name))
		self.assertNotIn(occasion.name, frappe.get_list("Occasion", pluck="name"))

		frappe.set_user(STAFF)
		self.assertTrue(frappe.has_permission("Occasion", "read", doc=occasion.name))
		self.assertIn(occasion.name, frappe.get_list("Occasion", pluck="name"))

	def test_manager_sees_only_own_occasions_and_no_other_doctypes(self):
		mine = make_occasion()
		frappe.set_user(OTHER_MANAGER)
		theirs = frappe.get_doc({
			"doctype": "Occasion", "occasion_name": f"Other {frappe.generate_hash(length=6)}",
			"couple_names": "C & D", "occasion_date": frappe.utils.add_days(frappe.utils.today(), 30),
			"occasion_time": "Saa 2 usiku", "venue_name": "Ukumbi",
		}).insert()
		self.assertEqual(theirs.owner, OTHER_MANAGER)
		self.assertIn(theirs.name, frappe.get_list("Occasion", pluck="name"))
		self.assertNotIn(mine.name, frappe.get_list("Occasion", pluck="name"))

		frappe.set_user(MANAGER)
		self.assertNotIn(theirs.name, frappe.get_list("Occasion", pluck="name"))
		self.assertFalse(frappe.has_permission("Occasion", "write", doc=theirs.name))
		for doctype in ("Occasion Subscription", "Message Credit Account", "Credit Transaction",
						"Credit Purchase", "Occasion Guest Invite Log", "Terms Acceptance", "E Card Settings"):
			self.assertFalse(frappe.has_permission(doctype, "read"), doctype)

	# ------------------------------------------------------------ contributions

	def test_contribution_totals_and_status(self):
		occasion = make_occasion()
		occasion.append("budget_items", {"category": "Ukumbi", "budgeted_amount": 1_000_000, "actual_amount": 400_000})
		occasion.append("contributors", {"contributor_name": "Juma", "phone": "0712000001", "pledged_amount": 100_000})
		occasion.append("contributors", {"contributor_name": "Neema", "phone": "0712000002", "pledged_amount": 200_000})
		occasion.append("contributors", {"contributor_name": "Grace", "phone": "0712000003", "pledged_amount": 50_000})
		occasion.auto_add_paid_contributors = 0
		occasion.save()

		ids = {c.contributor_name: c.contributor_id for c in occasion.contributors}
		self.assertEqual(ids, {"Juma": "C-0001", "Neema": "C-0002", "Grace": "C-0003"})

		occasion.append("contribution_payments", {"contributor_id": ids["Juma"], "amount": 60_000, "payment_date": frappe.utils.today()})
		occasion.append("contribution_payments", {"contributor_id": ids["Juma"], "amount": 40_000, "payment_date": frappe.utils.today()})
		occasion.append("contribution_payments", {"contributor_id": ids["Neema"], "amount": 50_000, "payment_date": frappe.utils.today()})
		occasion.save()

		by_name = {c.contributor_name: c for c in occasion.contributors}
		self.assertEqual(by_name["Juma"].payment_status, "Fully Paid")
		self.assertEqual(by_name["Neema"].payment_status, "Partially Paid")
		self.assertEqual(by_name["Neema"].balance, 150_000)
		self.assertEqual(by_name["Grace"].payment_status, "Not Paid")
		self.assertEqual(occasion.total_pledged, 350_000)
		self.assertEqual(occasion.total_collected, 150_000)
		self.assertEqual(occasion.outstanding_pledges, 200_000)
		self.assertEqual(occasion.total_budget, 1_000_000)
		self.assertEqual(occasion.total_spent, 400_000)
		self.assertEqual(occasion.funding_gap, 850_000)
		self.assertEqual(occasion.contribution_payments[0].contributor_name, "Juma")

	def test_payment_for_unknown_contributor_is_rejected(self):
		occasion = make_occasion()
		occasion.append("contribution_payments", {"contributor_id": "C-9999", "amount": 1000, "payment_date": frappe.utils.today()})
		self.assertRaises(frappe.ValidationError, occasion.save)

	def test_fully_paid_contributor_is_added_to_guests_once(self):
		occasion = make_occasion()
		occasion.append("guests", {"guest_name": "Existing", "phone": "+255 712 000 009", "card_type": "VIP"})
		occasion.append("contributors", {"contributor_name": "Juma", "phone": "0712000001", "pledged_amount": 100_000, "card_type": "DOUBLE"})
		occasion.append("contributors", {"contributor_name": "Existing Person", "phone": "0712000009", "pledged_amount": 10_000})
		occasion.save()
		ids = {c.contributor_name: c.contributor_id for c in occasion.contributors}

		occasion.record_payment(ids["Juma"], 100_000)
		occasion.record_payment(ids["Existing Person"], 10_000)
		occasion.reload()

		self.assertEqual(len(occasion.guests), 2, "same-phone contributor must not be duplicated")
		juma_guest = next(g for g in occasion.guests if g.guest_name == "Juma")
		self.assertEqual(juma_guest.card_type, "DOUBLE")
		self.assertTrue(juma_guest.guest_code)
		juma = next(c for c in occasion.contributors if c.contributor_name == "Juma")
		self.assertEqual(juma.guest_code, juma_guest.guest_code)

		# Saving again must not add the same contributor twice.
		occasion.save()
		self.assertEqual(len(occasion.guests), 2)

		# A fully paid contributor without a phone is left out instead of blocking the save.
		occasion.append("contributors", {"contributor_name": "No Phone", "pledged_amount": 5_000})
		occasion.save()
		occasion.record_payment(occasion.contributors[-1].contributor_id, 5_000)
		occasion.reload()
		self.assertEqual(len(occasion.guests), 2)
		self.assertEqual(occasion.contributors[-1].payment_status, "Fully Paid")

	def test_import_contributors_from_csv_is_idempotent(self):
		occasion = make_occasion()
		content = "Name,Phone,Pledge,Card Type,Paid so far\nJuma Ali,0712000001,100000,single,40000\nNeema,0712000002,50000,VIP,0\n,,,,\n"
		file_doc = frappe.get_doc({
			"doctype": "File",
			"file_name": "contributors.csv",
			"content": content,
			"attached_to_doctype": "Occasion",
			"attached_to_name": occasion.name,
			"is_private": 1,
		}).insert(ignore_permissions=True)

		res = occasion.import_contributors(file_doc.file_url)
		self.assertEqual((res["added"], res["updated"]), (2, 0))
		occasion.reload()
		juma = next(c for c in occasion.contributors if c.contributor_name == "Juma Ali")
		self.assertEqual(juma.paid_amount, 40_000)
		self.assertEqual(juma.payment_status, "Partially Paid")

		res = occasion.import_contributors(file_doc.file_url)
		self.assertEqual((res["added"], res["updated"]), (0, 2))
		occasion.reload()
		self.assertEqual(len(occasion.contributors), 2)

	# ------------------------------------------------------------ pay-to-send & credits

	def test_sending_requires_subscription_and_credits(self):
		from e_card_ms.utils.credits import add, get_balance

		occasion = make_occasion()
		occasion.append("guests", {"guest_name": "Rehema", "phone": "0712000010", "card_type": "SINGLE",
								   "guest_code": "123987", "card_image": "/files/x.jpg"})
		occasion.save()

		frappe.set_user(MANAGER)
		occasion = frappe.get_doc("Occasion", occasion.name)
		self.assertRaises(frappe.ValidationError, occasion.send_all_sms)

		frappe.set_user("Administrator")
		approve_subscription(occasion)
		add(MANAGER, "SMS", 10)
		start = get_balance(MANAGER, "SMS")

		frappe.set_user(MANAGER)
		occasion = frappe.get_doc("Occasion", occasion.name)
		with patch("e_card_ms.api.messaging._gateway_send", return_value={"success": True}):
			res = occasion.send_all_sms()
		self.assertEqual(res["success"], 1)
		from e_card_ms.api.sms import build_invitation_message
		from e_card_ms.utils.credits import sms_parts

		parts = sms_parts(build_invitation_message(occasion, occasion.guests[0]))
		self.assertEqual(get_balance(MANAGER, "SMS"), start - parts)

		# Already invited: a second bulk send does nothing.
		with patch("e_card_ms.api.messaging._gateway_send", return_value={"success": True}):
			self.assertEqual(occasion.send_all_sms()["success"], 0)

	def test_failed_send_refunds_and_allows_retry(self):
		from e_card_ms.utils.credits import add, get_balance

		occasion = make_occasion()
		occasion.append("guests", {"guest_name": "Rehema", "phone": "0712000011", "guest_code": "123988",
								   "card_image": "/files/x.jpg"})
		occasion.save()
		approve_subscription(occasion)
		add(MANAGER, "WhatsApp", 3)
		start = get_balance(MANAGER, "WhatsApp")

		frappe.set_user(MANAGER)
		occasion = frappe.get_doc("Occasion", occasion.name)
		with patch("e_card_ms.api.messaging._gateway_send", side_effect=Exception("gateway down")):
			res = occasion.send_all_whatsapp()
		self.assertEqual(res["failed"], 1)
		self.assertEqual(get_balance(MANAGER, "WhatsApp"), start)

		with patch("e_card_ms.api.messaging._gateway_send", return_value={"success": True}):
			res = occasion.send_all_whatsapp()
		self.assertEqual(res["success"], 1, "a failed attempt must not count as already invited")
		self.assertEqual(get_balance(MANAGER, "WhatsApp"), start - 1)

	def test_insufficient_credits_stops_bulk_send(self):
		occasion = make_occasion(occasion_name=f"Broke {frappe.generate_hash(length=6)}")
		for i in range(3):
			occasion.append("guests", {"guest_name": f"G{i}", "phone": f"07120001{i:02d}",
									   "guest_code": f"77{i:04d}", "card_image": "/files/x.jpg"})
		occasion.save()
		approve_subscription(occasion)
		frappe.db.set_value("Message Credit Account", MANAGER, "whatsapp_balance", 1)

		frappe.set_user(MANAGER)
		occasion = frappe.get_doc("Occasion", occasion.name)
		with patch("e_card_ms.api.messaging._gateway_send", return_value={"success": True}) as send:
			res = occasion.send_all_whatsapp()
		self.assertEqual(res["success"], 1)
		self.assertEqual(send.call_count, 1)
		self.assertIn("credits", res["errors"][0])

	# ------------------------------------------------------------ reminders & gate

	def test_reminder_message_and_selection(self):
		from e_card_ms.api.reminders import build_reminder_message, select_contributors

		occasion = make_occasion(payment_instructions="M-Pesa 0712 000 000")
		occasion.append("contributors", {"contributor_name": "Neema", "phone": "0712000002", "pledged_amount": 200_000})
		occasion.append("contributors", {"contributor_name": "Paid", "phone": "0712000003", "pledged_amount": 1000})
		occasion.append("contributors", {"contributor_name": "No Phone", "pledged_amount": 1000})
		occasion.auto_add_paid_contributors = 0
		occasion.save()
		occasion.record_payment(occasion.contributors[1].contributor_id, 1000)

		rows = select_contributors(occasion)
		self.assertEqual([c.contributor_name for c in rows], ["Neema"])
		message = build_reminder_message(occasion, rows[0])
		self.assertIn("Neema", message)
		self.assertIn("200,000", message)
		self.assertIn("M-Pesa 0712 000 000", message)
		self.assertIn("Amina & Baraka", message)

	def test_invitation_text_has_no_hardcoded_afternoon(self):
		from e_card_ms.api import sms, whatsapp

		occasion = make_occasion(occasion_time="Saa 4:00 asubuhi")
		guest = frappe._dict(guest_name="Rehema", card_type="SINGLE", guest_code="111222")
		for module in (sms, whatsapp):
			text = module.build_invitation_message(occasion, guest)
			self.assertIn("Saa 4:00 asubuhi", text)
			self.assertNotIn("ALASIRI", text)

	def test_gate_requires_pin_for_guests(self):
		validate_guest = frappe.get_attr("e_card_ms.www.gate-checkin.index.validate_guest")

		occasion = make_occasion()
		occasion.append("guests", {"guest_name": "Rehema", "phone": "0712000020", "guest_code": "555111"})
		occasion.save()

		frappe.set_user("Guest")
		res = validate_guest("555111", occasion.name)
		self.assertEqual(res["status"], "PIN Required")
		res = validate_guest("555111", occasion.name, pin="000000" if occasion.gate_pin != "000000" else "111111")
		self.assertEqual(res["status"], "PIN Required")
		with patch("frappe.db.commit"):
			res = validate_guest("555111", occasion.name, pin=occasion.gate_pin)
		self.assertEqual(res["status"], "Valid")
		with patch("frappe.db.commit"):
			res = validate_guest("555111", occasion.name, pin=occasion.gate_pin)
		self.assertEqual(res["status"], "Already Used")

	def test_double_and_table_cards_admit_several_people(self):
		validate_guest = frappe.get_attr("e_card_ms.www.gate-checkin.index.validate_guest")

		occasion = make_occasion(table_size=8)
		occasion.append("guests", {"guest_name": "Wawili", "phone": "0712000031", "card_type": "DOUBLE", "guest_code": "555201"})
		occasion.append("guests", {"guest_name": "Meza A", "phone": "0712000032", "card_type": "TABLE", "guest_code": "555202"})
		occasion.append("guests", {"guest_name": "Meza B", "phone": "0712000033", "card_type": "TABLE", "admits": 3, "guest_code": "555203"})
		occasion.append("guests", {"guest_name": "Mmoja", "phone": "0712000034", "card_type": "VIP", "admits": 5, "guest_code": "555204"})
		occasion.save()
		self.assertEqual([g.admits for g in occasion.guests], [2, 8, 3, 1])

		def scan(code):
			with patch("frappe.db.commit"):
				return validate_guest(code, occasion.name, pin=occasion.gate_pin)

		self.assertEqual((scan("555201")["status"], scan("555201")["entered"]), ("Valid", 2))
		res = scan("555201")
		self.assertEqual((res["status"], res["entered"], res["admits"]), ("Already Used", 2, 2))

		for expected in (1, 2, 3):
			self.assertEqual(scan("555203")["entered"], expected)
		self.assertEqual(scan("555203")["status"], "Already Used")
		self.assertEqual(scan("555202")["admits"], 8)

		self.assertEqual(scan("555204")["status"], "Valid")
		self.assertEqual(scan("555204")["status"], "Already Used")
		self.assertEqual(frappe.db.get_value("Occasion Guest", {"guest_code": "555201"}, "entered_count"), 2)

	def test_new_terms_version_blocks_sending_until_accepted(self):
		from e_card_ms.legal import record_acceptance, terms_pending

		occasion = make_occasion()
		approve_subscription(occasion)
		original = frappe.db.get_single_value("E Card Settings", "terms_version")
		frappe.db.set_single_value("E Card Settings", "terms_version", "test-2.0")
		try:
			self.assertTrue(terms_pending(MANAGER))
			self.assertFalse(terms_pending(STAFF), "staff never need to re-accept")
			frappe.set_user(MANAGER)
			doc = frappe.get_doc("Occasion", occasion.name)
			self.assertRaises(frappe.ValidationError, doc.assert_can_send)

			record_acceptance(MANAGER, "Re-acceptance")
			self.assertFalse(terms_pending(MANAGER))
			doc.assert_can_send()
		finally:
			frappe.set_user("Administrator")
			frappe.db.set_single_value("E Card Settings", "terms_version", original)

	# ------------------------------------------------------------ graduated card pricing

	def test_graduated_card_pricing(self):
		from e_card_ms.utils.pricing import quote

		self.assertEqual(quote(1)["price"], 900)
		self.assertEqual(quote(100)["price"], 90_000)
		self.assertEqual(quote(101)["price"], 91_200, "only card 101 costs 1,200 — no price cliff")
		q = quote(120)
		self.assertEqual((q["price"], q["profit"]), (114_000, 48_000))
		self.assertEqual((q["sms_credits"], q["whatsapp_credits"]), (100 * 10 + 20 * 14, 100 * 3 + 20 * 6))
		# Top-ups keep the old rate for at most `locked_allowance` cards; only
		# cards that would otherwise cost more use the allowance.
		self.assertEqual(quote(20, already_paid=100, locked_allowance=20)["price"], 18_000, "100 paid + 20 = 20 x 900")
		self.assertEqual(quote(30, already_paid=100, locked_allowance=20)["price"], 30_000, "20 x 900 + 10 x 1,200")
		self.assertEqual(quote(40, already_paid=60, locked_allowance=12)["price"], 36_000, "cards 61-100 are 900 anyway")
		self.assertEqual(quote(40, already_paid=60, locked_allowance=12)["locked_cards"], 0, "allowance not used inside tier 1")
		self.assertEqual(quote(30, already_paid=80, locked_allowance=16)["price"], 20 * 900 + 10 * 900, "cards 81-100 at 900 + 10 extra kept at 900")
		self.assertEqual(quote(10, already_paid=150, locked_allowance=30)["price"], 12_000, "already at 1,200: nothing cheaper to keep")
		self.assertEqual(quote(499, already_paid=1, locked_allowance=0)["price"], 99 * 900 + 400 * 1200, "no loophole via a 1-guest booking")

	def test_public_quote_hides_profit(self):
		from e_card_ms.utils.pricing import get_quote

		frappe.set_user("Guest")
		q = get_quote(150)
		self.assertEqual(q["price"], 150_000)
		self.assertNotIn("profit", frappe.as_json(q))

	def test_subscription_price_credits_and_private_profit(self):
		from e_card_ms.utils.credits import get_balance

		occasion = make_occasion()
		first = approve_subscription(occasion, guests=80)
		self.assertEqual(first.subscription_price, 72_000)
		self.assertEqual(first.profit_amount, 32_000)
		self.assertEqual(first.message_budget, 40_000)

		sms_before = get_balance(MANAGER, "SMS")
		wa_before = get_balance(MANAGER, "WhatsApp")
		# 80 paid -> up to 16 extra cards keep 900. Cards 81-100 are 900 anyway,
		# cards 101-116 keep 900, cards 117-120 pay 1,200.
		second = approve_subscription(occasion, guests=40)
		self.assertEqual(second.locked_rate_cards, 16)
		self.assertEqual(second.subscription_price, 36 * 900 + 4 * 1200)
		self.assertEqual(get_balance(MANAGER, "SMS"), sms_before + 36 * 10 + 4 * 14)
		self.assertEqual(get_balance(MANAGER, "WhatsApp"), wa_before + 36 * 3 + 4 * 6)
		self.assertEqual(occasion.paid_guest_capacity(), 120)

		# The allowance is shared by all top-ups: 120 paid -> 24 allowed, 16 used, 8 left.
		from e_card_ms.utils.pricing import quote_for_occasion

		third = quote_for_occasion(10, occasion.name)
		self.assertEqual((third["locked_cards"], third["price"]), (8, 8 * 900 + 2 * 1200))

		frappe.set_user(MANAGER)
		doc = frappe.get_doc("Occasion Subscription", second.name)
		self.assertFalse(doc.has_permlevel_access_to("profit_amount", permission_type="read"))
		frappe.set_user("Administrator")

		second.reload()
		second.cancel()
		self.assertEqual(get_balance(MANAGER, "SMS"), sms_before)
		self.assertEqual(get_balance(MANAGER, "WhatsApp"), wa_before)

	def test_card_payment_webhook_approves_subscription(self):
		from e_card_ms.api import payments
		from e_card_ms.utils.credits import get_balance

		occasion = make_occasion()
		frappe.set_user(MANAGER)
		occasion = frappe.get_doc("Occasion", occasion.name)
		req = occasion.request_subscription(number_of_guests=10)
		frappe.set_user("Administrator")
		frappe.db.set_value("Occasion Subscription", req["name"], {"payment_status": "Pending", "gateway_reference": "abl_sub_1"})
		sms_before = get_balance(MANAGER, "SMS")

		with patch("frappe.db.commit"), patch("e_card_ms.receipts.queue_receipt"):
			result = payments._resolve_subscription(req["name"], "transaction.completed", "completed", "abl_sub_1")
			again = payments._resolve_subscription(req["name"], "transaction.completed", "completed", "abl_sub_1")
		self.assertEqual(result["status"], "success")
		self.assertEqual(again["message"], "Already processed")
		sub = frappe.get_doc("Occasion Subscription", req["name"])
		self.assertEqual((sub.docstatus, sub.payment_status, sub.subscription_price), (1, "Paid", 9_000))
		self.assertEqual(get_balance(MANAGER, "SMS"), sms_before + 100)
		self.assertEqual(occasion.paid_guest_capacity(), 10)
		self.assertEqual(payments._find_payment_target("", "abl_sub_1"), ("Occasion Subscription", req["name"]))
