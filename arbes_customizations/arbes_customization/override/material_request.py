import frappe
import json
from collections import defaultdict


@frappe.whitelist()
def get_item_suppliers(item_code, search=None):
    suppliers = {}

    history_suppliers = frappe.db.sql("""
        SELECT DISTINCT po.supplier
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE poi.item_code = %s AND po.docstatus = 1

        UNION

        SELECT DISTINCT pr.supplier
        FROM `tabPurchase Receipt Item` pri
        INNER JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
        WHERE pri.item_code = %s AND pr.docstatus = 1

        UNION

        SELECT DISTINCT pi.supplier
        FROM `tabPurchase Invoice Item` pii
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
        WHERE pii.item_code = %s AND pi.docstatus = 1
    """, (item_code, item_code, item_code), as_dict=True)

    for r in history_suppliers:
        if r.supplier:
            suppliers[r.supplier] = "Previously Used"

    default_suppliers = frappe.get_all(
        "Item Default",
        filters={"parent": item_code},
        fields=["default_supplier"]
    )

    for r in default_suppliers:
        if r.default_supplier and r.default_supplier not in suppliers:
            suppliers[r.default_supplier] = "Default"

    price_suppliers = frappe.get_all(
        "Item Price",
        filters={"item_code": item_code, "buying": 1},
        fields=["supplier"]
    )

    for r in price_suppliers:
        if r.supplier and r.supplier not in suppliers:
            suppliers[r.supplier] = "Price List"

    other_suppliers = frappe.get_all(
        "Supplier",
        filters={"disabled": 0},
        fields=["name"]
    )

    for r in other_suppliers:
        if r.name not in suppliers:
            suppliers[r.name] = "Other Supplier"

    # Get supplier names for all suppliers
    supplier_names = {}
    if suppliers:
        supplier_docs = frappe.get_all(
            "Supplier",
            filters={"name": ["in", list(suppliers.keys())]},
            fields=["name", "supplier_name"]
        )
        for s in supplier_docs:
            supplier_names[s.name] = s.supplier_name or s.name

    return [
        {"supplier": s, "supplier_name": supplier_names.get(s, s), "tag": tag}
        for s, tag in suppliers.items()
        if not search or search.lower() in s.lower() or search.lower() in supplier_names.get(s, "").lower()
    ]






@frappe.whitelist()
def send_supplier_inquiry(material_request, supplier_map):
    print("▶ send_supplier_inquiry called")

    if isinstance(supplier_map, str):
        supplier_map = json.loads(supplier_map)

    mr = frappe.get_doc("Material Request", material_request)

    if mr.docstatus != 1:
        frappe.throw("Inquiry can only be sent for Submitted Material Requests")

    if mr.material_request_type != "Purchase":
        frappe.throw("Inquiry can only be sent for Purchase type")

    supplier_items = defaultdict(list)

    for item in mr.items:
        key = f"suppliers_{item.idx}"
        selected_suppliers = supplier_map.get(key) or []
        print(f"▶ Item {item.item_code} → Suppliers: {selected_suppliers}")

        if selected_suppliers:
            frappe.db.set_value(
                "Material Request Item",
                item.name,
                "custom_inquiry_count",
                len(selected_suppliers)
            )

        for supplier in selected_suppliers:
            supplier_items[supplier].append(item)

    print(f"▶ Final supplier map: {dict(supplier_items)}")

    for supplier, items in supplier_items.items():
        send_inquiry_email(supplier, items, mr)


def send_inquiry_email(supplier, items, mr):

    contacts = frappe.db.sql("""
        SELECT
            c.name,
            ce.email_id
        FROM `tabContact` c
        INNER JOIN `tabDynamic Link` dl
            ON dl.parent = c.name
            AND dl.parenttype = 'Contact'
        INNER JOIN `tabContact Email` ce
            ON ce.parent = c.name
            AND ce.is_primary = 1
        WHERE
            dl.link_doctype = 'Supplier'
            AND dl.link_name = %s
            AND (c.status = 'Active' OR c.status = 'Passive')
        LIMIT 1
    """, supplier, as_dict=True)

    if not contacts:
        return

    recipient_email = contacts[0].email_id

    rows = ""
    item_codes = []

    for idx, item in enumerate(items, start=1):
        item_desc = item.description or item.item_name or item.item_code
        item_codes.append(item.item_code)
        rows += f"""
            <tr>
                <td style="text-align:center;">{idx}</td>
                <td>{item_desc}</td>
                <td style="text-align:center;">{item.qty} {item.uom}</td>
                <td style="text-align:center;">{item.schedule_date}</td>
            </tr>
        """

    # Get attachments for all items
    attachments = []
    if item_codes:
        files = frappe.get_all(
            "File",
            filters={
                "attached_to_doctype": "Item",
                "attached_to_name": ["in", item_codes]
            },
            fields=["name", "file_name", "file_url", "is_private"]
        )
        for f in files:
            attachments.append({"fid": f.name})

    subject = f"Purchase Inquiry - {mr.name}"

    message = f"""
<p>Dear Sir/Madam,</p>

<p>
Kindly confirm your techno commercial offer with maximum OEM discount
and earliest delivery period for material as per the below details.
</p>

<table border="1" cellpadding="8" cellspacing="0" width="100%" style="border-collapse:collapse;">
    <tr>
        <th style="text-align:center;">Sr No</th>
        <th>Item Description</th>
        <th style="text-align:center;">Quantity</th>
        <th style="text-align:center;">Required Date</th>
    </tr>
    {rows}
</table>

<p>
We look forward to hearing from you at the earliest with your best offer
and earliest delivery time.
</p>

<p>
Thanks &amp; Regards,<br>
{frappe.session.user}<br>
Purchase Executive

</p>
"""

    frappe.sendmail(
        recipients=[recipient_email],
        sender="purchaseteam@arbestools.com",
        subject=subject,
        message=message,
        reference_doctype="Material Request",
        reference_name=mr.name,
        attachments=attachments if attachments else None,
        delayed=True,
        now=False
    )
    for item in items:
        frappe.db.set_value(
            "Material Request Item",
            item.name,
            "custom_inquiry_sent",
            1
        )

    comm = frappe.get_doc({
        "doctype": "Communication",
        "communication_type": "Communication",
        "communication_medium": "Email",
        "sent_or_received": "Sent",
        "subject": subject,
        "content": message,
        "status": "Linked",
        "reference_doctype": "Material Request",
        "reference_name": mr.name,
        "recipients": recipient_email
    })
    comm.insert(ignore_permissions=True)


# List view 


@frappe.whitelist()
def validate_mrs_for_inquiry(material_requests):
    material_requests = frappe.parse_json(material_requests)

    valid_mrs = []
    skipped = []

    for mr in material_requests:
        if not mr:
            continue

        doc = frappe.get_doc("Material Request", mr)

        if doc.docstatus != 1:
            skipped.append(f"{mr} (Draft)")
            continue

        if doc.material_request_type != "Purchase":
            skipped.append(f"{mr} (Type: {doc.material_request_type})")
            continue

        if not doc.items:
            skipped.append(f"{mr} (No items)")
            continue

        valid_mrs.append(mr)

    if not valid_mrs:
        return {
            "valid": False,
            "message": "No valid MRs selected. Only Submitted Purchase MRs are allowed."
        }

    return {
        "valid": True,
        "valid_mrs": valid_mrs,
        "skipped": skipped
    }



@frappe.whitelist()
def get_mr_items_for_inquiry(material_requests):
    material_requests = frappe.parse_json(material_requests)

    result = []

    for mr in material_requests:
        if not mr:
            continue

        doc = frappe.get_doc("Material Request", mr)

        if doc.docstatus != 1 or doc.material_request_type != "Purchase":
            continue

        for item in doc.items:
            if item.custom_inquiry_sent:
                continue

            result.append({
                "mr": mr,
                "idx": item.idx,
                "item_code": item.item_code,
                "item_name": item.item_name
            })

    return result

@frappe.whitelist()
def send_supplier_inquiry_from_list(material_requests, supplier_map):
    from collections import defaultdict
    import frappe

    material_requests = frappe.parse_json(material_requests)
    supplier_map = frappe.parse_json(supplier_map)

    for mr_name in material_requests:
        if not mr_name:
            continue

        mr = frappe.get_doc("Material Request", mr_name)

        if mr.docstatus != 1 or mr.material_request_type != "Purchase":
            continue

        supplier_items = defaultdict(list)

        for item in mr.items:
            key = f"suppliers_{mr_name}_{item.idx}"
            selected_suppliers = supplier_map.get(key) or []

            if selected_suppliers:
                frappe.db.set_value(
                    "Material Request Item",
                    item.name,
                    "custom_inquiry_count",
                    len(selected_suppliers)
                )

            for supplier in selected_suppliers:
                supplier_items[supplier].append(item)

        for supplier, items in supplier_items.items():
            send_inquiry_email(supplier, items, mr)


@frappe.whitelist()
def get_inquiry_stats(from_date=None, to_date=None):
 
    date_filter = ""
    if from_date and to_date:
        date_filter = f"AND mri.modified >= '{from_date}' AND mri.modified <= '{to_date} 23:59:59'"

    total_sent = frappe.db.sql(f"""
        SELECT COALESCE(SUM(mri.custom_inquiry_count), 0) as count
        FROM `tabMaterial Request Item` mri
        INNER JOIN `tabMaterial Request` mr ON mr.name = mri.parent
        WHERE mri.custom_inquiry_sent = 1
        AND mr.docstatus = 1
        AND mr.material_request_type = 'Purchase'
        {date_filter}
    """, as_dict=True)[0].count or 0

    items_sent = frappe.db.sql(f"""
        SELECT COUNT(*) as count
        FROM `tabMaterial Request Item` mri
        INNER JOIN `tabMaterial Request` mr ON mr.name = mri.parent
        WHERE mri.custom_inquiry_sent = 1
        AND mr.docstatus = 1
        AND mr.material_request_type = 'Purchase'
        {date_filter}
    """, as_dict=True)[0].count or 0

    items_pending = frappe.db.sql("""
        SELECT COUNT(*) as count
        FROM `tabMaterial Request Item` mri
        INNER JOIN `tabMaterial Request` mr ON mr.name = mri.parent
        WHERE mri.custom_inquiry_sent = 0
        AND mr.docstatus = 1
        AND mr.material_request_type = 'Purchase'
    """, as_dict=True)[0].count or 0

    return {
        "total_inquiries": total_sent,
        "items_sent": items_sent,
        "items_pending": items_pending
    }
