import frappe
from frappe.utils import flt

def set_default_uom_qty_from_po(doc, method):
    for row in doc.items:
        if row.purchase_order_item and not row.custom_default_uom_qty:
            row.custom_default_uom_qty = frappe.db.get_value(
                "Purchase Order Item",
                row.purchase_order_item,
                "custom_default_uom_qty"
            )

def calculate_extra_qty(doc, method):
    for row in doc.items:
        if row.purchase_order_item:
            po_item = frappe.db.get_value(
                "Purchase Order Item",
                row.purchase_order_item,
                ["qty", "custom_calculated_weight_kg", "custom_default_uom_qty"],
                as_dict=True
            )

            if po_item:
                po_qty_kg = flt(po_item.qty)
                received_qty_kg = flt(row.qty)
                weight_per_unit = flt(po_item.custom_calculated_weight_kg)

                extra_qty_kg = received_qty_kg - po_qty_kg
                row.custom_extra_qty_kg = extra_qty_kg

                if weight_per_unit > 0:
                    row.custom_extra_default_uom_qty = extra_qty_kg / weight_per_unit
                else:
                    row.custom_extra_default_uom_qty = 0
        else:
            row.custom_extra_qty_kg = 0
            row.custom_extra_default_uom_qty = 0

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

def calculate_extra_qty_for_pi(doc, method):
    for row in doc.items:
        if row.po_detail:
            po_item = frappe.db.get_value(
                "Purchase Order Item",
                row.po_detail,
                ["qty", "custom_calculated_weight_kg", "custom_default_uom_qty"],
                as_dict=True
            )

            if po_item:
                po_qty_kg = flt(po_item.qty)
                received_qty_kg = flt(row.qty)
                weight_per_unit = flt(po_item.custom_calculated_weight_kg)

                extra_qty_kg = received_qty_kg - po_qty_kg
                row.custom_extra_qty_kg = extra_qty_kg

                if weight_per_unit > 0:
                    row.custom_extra_default_uom_qty = extra_qty_kg / weight_per_unit
                else:
                    row.custom_extra_default_uom_qty = 0
        else:
            row.custom_extra_qty_kg = 0
            row.custom_extra_default_uom_qty = 0

