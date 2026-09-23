import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate


def execute(filters=None):
	filters = filters or {}
	from_date = getdate(filters.get("from_date"))
	to_date = getdate(filters.get("to_date"))
	status = filters.get("status")

	conditions = ["date(s.creation) between %(from_date)s and %(to_date)s"]
	params = {"from_date": from_date, "to_date": to_date}

	if status:
		conditions.append("s.status = %(status)s")
		params["status"] = status

	if "System Manager" not in frappe.get_roles():
		# Event Managers only see revenue from their own applicants, matching
		# Occasion Subscription's own permission model.
		conditions.append("s.user = %(user)s")
		params["user"] = frappe.session.user

	where = " and ".join(conditions)

	rows = frappe.db.sql(
		f"""
		select
			s.name as name,
			s.applicant_name as applicant_name,
			s.occasion as occasion,
			s.number_of_guests as number_of_guests,
			s.subscription_price as subscription_price,
			s.status as status,
			date(s.creation) as date
		from `tabOccasion Subscription` s
		where {where}
		order by s.creation desc
		""",
		params,
		as_dict=True,
	)

	total_revenue = sum(flt(r.subscription_price) for r in rows)
	total_guests = sum(r.number_of_guests or 0 for r in rows)
	total_subscriptions = len(rows)
	avg_revenue = flt(total_revenue / total_subscriptions) if total_subscriptions else 0

	report_summary = [
		{"value": total_subscriptions, "label": _("Total Subscriptions"), "datatype": "Int", "indicator": "blue"},
		{"value": total_guests, "label": _("Total Guests"), "datatype": "Int", "indicator": "blue"},
		{"value": total_revenue, "label": _("Total Revenue"), "datatype": "Currency", "indicator": "green"},
		{
			"value": avg_revenue,
			"label": _("Avg Revenue / Subscription"),
			"datatype": "Currency",
			"indicator": "green",
		},
	]

	date_revenue = {}
	current = from_date
	while current <= to_date:
		date_revenue[str(current)] = 0
		current = add_days(current, 1)

	for r in rows:
		key = str(r.date)
		if key in date_revenue:
			date_revenue[key] += flt(r.subscription_price)

	chart = {
		"data": {
			"labels": list(date_revenue.keys()),
			"datasets": [{"name": _("Revenue"), "values": list(date_revenue.values())}],
		},
		"type": "line",
		"lineOptions": {"regionFill": 1},
		"axisOptions": {"xIsSeries": True},
		"title": _("Subscription Revenue Trend"),
	}

	columns = [
		{"fieldname": "name", "label": _("Subscription"), "fieldtype": "Link", "options": "Occasion Subscription", "width": 160},
		{"fieldname": "applicant_name", "label": _("Applicant"), "fieldtype": "Data", "width": 150},
		{"fieldname": "occasion", "label": _("Occasion"), "fieldtype": "Link", "options": "Occasion", "width": 160},
		{"fieldname": "number_of_guests", "label": _("Guests"), "fieldtype": "Int", "width": 80},
		{"fieldname": "subscription_price", "label": _("Revenue"), "fieldtype": "Currency", "width": 120},
		{"fieldname": "status", "label": _("Status"), "fieldtype": "Data", "width": 100},
		{"fieldname": "date", "label": _("Date"), "fieldtype": "Date", "width": 100},
	]

	data = [dict(r) for r in rows]
	if data:
		data.append({
			"name": "",
			"applicant_name": _("TOTAL"),
			"occasion": "",
			"number_of_guests": total_guests,
			"subscription_price": total_revenue,
			"status": "",
			"date": "",
			"bold": 1,
		})

	return columns, data, None, chart, report_summary
