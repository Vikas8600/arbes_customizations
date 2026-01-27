import frappe

def set_default_uom_qty_from_po(doc, method):
    for row in doc.items:
        if row.purchase_order_item and not row.custom_default_uom_qty:
            row.custom_default_uom_qty = frappe.db.get_value(
                "Purchase Order Item",
                row.purchase_order_item,
                "custom_default_uom_qty"
            )

@frappe.whitelist()
def get_default_uom_qty_from_po_item(purchase_order_item):
    if not purchase_order_item:
        return None

    return frappe.db.get_value(
        "Purchase Order Item",
        purchase_order_item,
        "custom_default_uom_qty"
    )


def set_default_uom_qty_for_pi(doc, method):
    for row in doc.items:
        if row.po_detail and not row.custom_default_uom_qty:
            row.custom_default_uom_qty = frappe.db.get_value(
                "Purchase Order Item",
                row.po_detail,
                "custom_default_uom_qty"
            )

def set_default_uom_qty_for_dn(doc, method):
    for row in doc.items:
        if row.so_detail and not row.custom_default_uom_qty:
            row.custom_default_uom_qty = frappe.db.get_value(
                "Sales Order Item",
                row.so_detail,
                "custom_default_uom_qty"
            )