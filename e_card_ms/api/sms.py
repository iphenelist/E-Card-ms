import frappe
import requests

SMS_API_URL = "https://api.notify.africa/api/v1/api/messages/send"


def get_credentials():
    api_token = frappe.conf.get("notify_africa_api_token")
    sender_id = frappe.conf.get("notify_africa_sms_sender_id")
    if not api_token:
        frappe.throw("notify_africa_api_token is not set in site_config.json")
    if not sender_id:
        frappe.throw("notify_africa_sms_sender_id is not set in site_config.json")
    return api_token, sender_id


def normalize_phone(phone: str) -> str:
    return phone.replace("+", "").replace(" ", "").replace("-", "")


def send_sms(phone: str, message: str) -> dict:
    """Send a single SMS via the Notify Africa SMS API"""
    api_token, sender_id = get_credentials()

    response = requests.post(
        SMS_API_URL,
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json={
            "phone_number": normalize_phone(phone),
            "message": message,
            "sender_id": sender_id,
        },
        timeout=30,
    )
    if not response.ok:
        frappe.throw(f"Notify Africa SMS API error ({response.status_code}): {response.text}")
    return response.json()


def build_invitation_message(occasion_doc, guest_row) -> str:
    """Build the Swahili SMS text for a guest invitation"""
    date_str = frappe.utils.formatdate(occasion_doc.occasion_date, "dd-MM-yyyy")
    base = frappe.utils.get_url().rstrip("/")
    download_url = f"{base}/invitee/download/occasion-card/{guest_row.guest_code}"

    dress_line = f" DRESS CODE: {occasion_doc.dress_code}." if occasion_doc.dress_code else ""

    return (
        f"Habari {guest_row.guest_name}, Unakaribishwa kwenye {occasion_doc.occasion_name}, "
        f"Kadi yako ni {guest_row.card_type} Na Code yako ni {guest_row.guest_code}. "
        f"Tarehe: {date_str}, Ukumbi: {occasion_doc.venue_name}. "
        f"MUDA: Saa {occasion_doc.occasion_time} ALASIRI."
        f"{dress_line} "
        f"Fika na sms hii au Download card yako kwa kubonyeza link hii\n"
        f"{download_url}"
    )


def send_invitation(occasion_doc, guest_row) -> dict:
    """Send the invitation text to a guest via SMS"""
    if not guest_row.phone:
        frappe.throw(f"No phone number for {guest_row.guest_name}")

    message = build_invitation_message(occasion_doc, guest_row)
    result = send_sms(guest_row.phone, message)

    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Occasion",
        "reference_name": occasion_doc.name,
        "content": f"SMS sent to {guest_row.guest_name} ({guest_row.phone}). Response: {result}"
    }).insert(ignore_permissions=True)

    return result


@frappe.whitelist()
def send_single(occasion_name: str, guest_code: str):
    """Whitelisted: send SMS invitation to one guest by guest_code"""
    occasion = frappe.get_doc("Occasion", occasion_name)
    for guest in occasion.guests:
        if guest.guest_code == guest_code:
            result = send_invitation(occasion, guest)
            frappe.db.set_value("Occasion Guest", guest.name, {
                "sms_sent": 1,
                "sms_sent_at": frappe.utils.now()
            })
            return {"success": True, "result": result}
    frappe.throw(f"Guest with code '{guest_code}' not found in occasion '{occasion_name}'")
