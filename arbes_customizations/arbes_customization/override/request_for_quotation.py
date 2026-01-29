import frappe
from frappe import _

@frappe.whitelist()
def get_rfq_suppliers_for_inquiry(rfq_names):
    """Get suppliers from multiple RFQs for inquiry with all contact emails"""
    if isinstance(rfq_names, str):
        import json
        rfq_names = json.loads(rfq_names)

    suppliers = []
    for rfq_name in rfq_names:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={"parent": rfq_name},
            fields=["supplier", "supplier_name", "email_id", "contact"]
        )
        for s in rfq_suppliers:
            # Get all emails from contact
            emails = get_supplier_contact_emails(s.supplier, s.contact, s.email_id)
            suppliers.append({
                "rfq": rfq_name,
                "supplier": s.supplier,
                "supplier_name": s.supplier_name,
                "emails": emails  # List of all email addresses
            })

    return suppliers


def get_supplier_contact_emails(supplier, contact_name=None, default_email=None):
    """Get all email addresses from supplier's contacts"""
    emails = []
    seen_emails = set()

    # If contact is specified in RFQ, get emails from that contact
    if contact_name:
        contact_emails = frappe.get_all(
            "Contact Email",
            filters={"parent": contact_name},
            fields=["email_id", "is_primary"]
        )
        for ce in contact_emails:
            if ce.email_id and ce.email_id not in seen_emails:
                emails.append({
                    "email": ce.email_id,
                    "is_primary": ce.is_primary,
                    "contact": contact_name
                })
                seen_emails.add(ce.email_id)

    # Also get emails from all contacts linked to this supplier
    linked_contacts = frappe.get_all(
        "Dynamic Link",
        filters={
            "link_doctype": "Supplier",
            "link_name": supplier,
            "parenttype": "Contact"
        },
        fields=["parent"]
    )

    for link in linked_contacts:
        contact = link.parent
        if contact == contact_name:
            continue  # Already processed

        contact_emails = frappe.get_all(
            "Contact Email",
            filters={"parent": contact},
            fields=["email_id", "is_primary"]
        )
        for ce in contact_emails:
            if ce.email_id and ce.email_id not in seen_emails:
                emails.append({
                    "email": ce.email_id,
                    "is_primary": ce.is_primary,
                    "contact": contact
                })
                seen_emails.add(ce.email_id)

    # If no emails found, use default email from RFQ
    if not emails and default_email:
        emails.append({
            "email": default_email,
            "is_primary": 1,
            "contact": None
        })

    return emails


@frappe.whitelist()
def send_rfq_inquiry(rfq_name, suppliers, custom_message=""):
    """Send inquiry email to suppliers for a single RFQ"""
    import json
    if isinstance(suppliers, str):
        suppliers = json.loads(suppliers)

    rfq = frappe.get_doc("Request for Quotation", rfq_name)
    items = rfq.items

    count = 0
    for supplier_data in suppliers:
        if not supplier_data.get("email"):
            continue

        send_inquiry_email(
            rfq=rfq,
            items=items,
            supplier_name=supplier_data.get("supplier_name"),
            recipient_email=supplier_data.get("email"),
            custom_message=custom_message
        )
        count += 1

    return {"success": True, "count": count}


@frappe.whitelist()
def send_rfq_inquiry_bulk(suppliers_data, custom_message=""):
    """Send inquiry emails to multiple suppliers from multiple RFQs"""
    import json
    if isinstance(suppliers_data, str):
        suppliers_data = json.loads(suppliers_data)

    # Group by RFQ
    rfq_suppliers = {}
    for s in suppliers_data:
        rfq_name = s.get("rfq")
        if rfq_name not in rfq_suppliers:
            rfq_suppliers[rfq_name] = []
        rfq_suppliers[rfq_name].append(s)

    count = 0
    for rfq_name, suppliers in rfq_suppliers.items():
        rfq = frappe.get_doc("Request for Quotation", rfq_name)
        items = rfq.items

        for supplier_data in suppliers:
            if not supplier_data.get("email"):
                continue

            send_inquiry_email(
                rfq=rfq,
                items=items,
                supplier_name=supplier_data.get("supplier_name"),
                recipient_email=supplier_data.get("email"),
                custom_message=custom_message
            )
            count += 1

    return {"success": True, "count": count}


def send_inquiry_email(rfq, items, supplier_name, recipient_email, custom_message=""):
    """Send inquiry email to a single supplier"""
    sender_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

    # Build items table
    items_html = ""
    for idx, item in enumerate(items, 1):
        desc = item.description or item.item_name
        # Clean HTML tags from description
        if desc:
            import re
            desc = re.sub('<[^<]+?>', '', desc).strip()

        items_html += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">{idx}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{desc}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{item.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{item.uom}</td>
        </tr>
        """

    custom_message_html = ""
    if custom_message:
        custom_message_html = f"<p>{custom_message}</p>"

    message = f"""
<p>Dear {supplier_name},</p>

<p>Kindly confirm your techno commercial offer with maximum OEM discount &amp; earliest delivery period for material as per the below details.</p>

{custom_message_html}

<table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
    <thead>
        <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left; width: 5%;">Sr.</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left; width: 65%;">Description</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">Qty</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">UOM</th>
        </tr>
    </thead>
    <tbody>
        {items_html}
    </tbody>
</table>

<p>We look forward to hearing from you at the earliest with your best offer &amp; earliest delivery time.</p>

<br>
<p>Thanks &amp; Regards,</p>
<p style="margin: 5px 0;"><strong>{sender_name}</strong></p>
<p style="margin: 5px 0;">Purchase Executive</p>
<br>
<p style="margin: 5px 0; font-weight: bold;">ARBES TOOLS PVT. LTD.</p>
<p style="margin: 2px 0; font-size: 12px;">D-29/8, TTC Industrial Area, MIDC Turbhe, Navi Mumbai 400705</p>
<p style="margin: 2px 0; font-size: 12px;">Tel: 022-69152911 / 2914 / 69152900 (board line)</p>
<p style="margin: 2px 0; font-size: 12px;">Mob no.: 08291002473</p>
"""

    subject = f"Inquiry for Quotation - {rfq.name}"

    frappe.sendmail(
        recipients=[recipient_email],
        sender="purchaseteam@arbestools.com",
        subject=subject,
        message=message,
        reference_doctype="Request for Quotation",
        reference_name=rfq.name,
        delayed=True,
        now=False
    )

    # Log communication
    comm = frappe.get_doc({
        "doctype": "Communication",
        "communication_type": "Communication",
        "communication_medium": "Email",
        "subject": subject,
        "content": message,
        "sender": frappe.session.user,
        "recipients": recipient_email,
        "reference_doctype": "Request for Quotation",
        "reference_name": rfq.name,
        "sent_or_received": "Sent",
        "status": "Linked"
    })
    comm.insert(ignore_permissions=True)
