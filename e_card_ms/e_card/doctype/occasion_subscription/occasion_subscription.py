import frappe
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
	"""Restrict Occasion Subscription list/report views to the applicant's own record, unless System Manager."""
	if not user:
		user = frappe.session.user
	if "System Manager" in frappe.get_roles(user):
		return ""
	return f"`tabOccasion Subscription`.`user` = {frappe.db.escape(user)}"


def has_permission(doc, ptype="read", user=None):
	"""Restrict direct Occasion Subscription access to the applicant, unless System Manager."""
	if not user:
		user = frappe.session.user
	if "System Manager" in frappe.get_roles(user):
		return True
	return doc.user == user


class OccasionSubscription(Document):

	def validate(self):
		price_per_guest_card = frappe.utils.flt(
			frappe.db.get_single_value("E Card Settings", "price_per_guest_card")
		)
		self.subscription_price = frappe.utils.flt(self.number_of_guests) * price_per_guest_card

	def before_submit(self):
		"""User creation is deliberately deferred until a System Manager submits
		this Subscription (i.e. approves it) — not at web-form insert time."""
		if not self.user:
			self.user = self._get_or_create_user()

	def _get_or_create_user(self) -> str:
		if frappe.db.exists("User", self.email):
			user = frappe.get_doc("User", self.email)
			existing_roles = [r.role for r in user.roles]
			missing_roles = [r for r in ("Occasion Client", "Desk User") if r not in existing_roles]
			if missing_roles:
				user.append_roles(*missing_roles)
				user.save(ignore_permissions=True)
			return user.name

		user = frappe.get_doc({
			"doctype": "User",
			"email": self.email,
			"first_name": self.applicant_name,
			"send_welcome_email": 1,
			"user_type": "System User",
			# "Occasion Client" only grants access to the Occasion doctype (see
			# occasion.json permissions) — never Occasion Subscription, the
			# Invite Log, or any report — so this applicant can only ever see
			# their own Occasion once it's linked below. "Desk User" is set
			# explicitly (rather than relying on Role.desk_access propagation)
			# so desk login works regardless of that background sync.
			"roles": [{"role": "Occasion Client"}, {"role": "Desk User"}],
		})
		user.insert(ignore_permissions=True)
		return user.name

	@frappe.whitelist()
	def create_occasion(self) -> str:
		"""Whitelisted: create a new Occasion for this applicant, linked via
		assigned_user to the User created on submit. Shown as a form button
		once the User exists and no Occasion is linked yet."""
		if self.docstatus != 1:
			frappe.throw("Submit this Subscription before creating an Occasion.")
		if not self.user:
			frappe.throw("No User is linked to this Subscription yet.")
		if self.occasion:
			frappe.throw(f"An Occasion ({self.occasion}) is already linked to this Subscription.")

		occasion = frappe.get_doc({
			"doctype": "Occasion",
			"occasion_name": f"{self.applicant_name}'s Occasion ({frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')})",
			"couple_names": self.applicant_name,
			"occasion_date": self.occasion_date,
			"occasion_time": "TBD",
			"venue_name": "TBD",
			"assigned_user": self.user,
		})
		occasion.insert(ignore_permissions=True)

		# db_set (not self.save()) so this works cleanly on a submitted document
		# without fighting the submit-lifecycle's field lock/hook routing.
		self.db_set("occasion", occasion.name, update_modified=True)
		self._link_occasion_to_applicant()

		return occasion.name

	def on_update(self):
		"""Fallback for a draft doc whose occasion link was set directly
		(e.g. by a System Manager editing the field by hand) rather than via
		create_occasion() — the normal path for a submitted Subscription."""
		before = self.get_doc_before_save()
		occasion_newly_linked = self.occasion and (not before or not before.occasion)
		if occasion_newly_linked:
			self._link_occasion_to_applicant()

	def _link_occasion_to_applicant(self):
		frappe.db.set_value("Occasion", self.occasion, "assigned_user", self.user)
		frappe.db.set_value("Occasion Subscription", self.name, "status", "Active")

		occasion_name = frappe.db.get_value("Occasion", self.occasion, "occasion_name")
		base = frappe.utils.get_url().rstrip("/")
		occasion_link = f"{base}/app/occasion/{self.occasion}"

		# Linking the Occasion (assigned_user + status, above) must stick even if
		# no outgoing Email Account is configured yet — don't let a notification
		# failure roll back the actual linking.
		try:
			frappe.sendmail(
				recipients=[self.email],
				subject=f"Your occasion '{occasion_name}' is ready",
				message=(
					f"Habari {self.applicant_name},<br><br>"
					f"Your occasion <b>{occasion_name}</b> has been set up. "
					f"You can manage its guests and cards here:<br>"
					f"<a href='{occasion_link}'>{occasion_link}</a>"
				),
			)
		except Exception:
			frappe.log_error(
				title=f"Failed to email Occasion link to {self.email}",
				message=frappe.get_traceback(),
			)
