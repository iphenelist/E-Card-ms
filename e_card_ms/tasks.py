import frappe


def process_subscriptions():
    """Hourly job: for every Occasion Subscription whose send schedule has started,
    send/re-send WhatsApp and SMS invitations to its Occasion's guests, up to
    the configured repeat count and interval."""
    now = frappe.utils.now_datetime()
    subscriptions = frappe.get_all(
        "Occasion Subscription",
        filters={"occasion": ["is", "set"], "send_start_date": ["<=", now]},
        fields=["name", "occasion", "repeat_count", "repeat_interval_days"],
    )
    for subscription in subscriptions:
        _process_occasion(subscription)


def _process_occasion(subscription):
    from e_card_ms.api.sms import send_invitation as send_sms_invitation
    from e_card_ms.api.whatsapp import send_invitation as send_whatsapp_invitation

    occasion = frappe.get_doc("Occasion", subscription.occasion)
    for guest in occasion.guests:
        _maybe_send(guest, occasion, "WhatsApp", send_whatsapp_invitation, subscription)
        _maybe_send(guest, occasion, "SMS", send_sms_invitation, subscription)


def _maybe_send(guest, occasion, channel, send_fn, subscription):
    sent_at_values = frappe.get_all(
        "Occasion Guest Invite Log",
        filters={"occasion": occasion.name, "guest_code": guest.guest_code, "channel": channel},
        pluck="sent_at",
    )
    if len(sent_at_values) >= subscription.repeat_count:
        return

    last_sent_at = max(sent_at_values, default=None)
    if last_sent_at:
        days_since_last_send = (frappe.utils.now_datetime() - last_sent_at).days
        if days_since_last_send < subscription.repeat_interval_days:
            return

    try:
        send_fn(occasion, guest)
    except Exception:
        frappe.log_error(
            title=f"Auto-send {channel} failed for {guest.guest_name}",
            message=frappe.get_traceback(),
        )
