import frappe
from frappe import _

def set_pending_amount(doc, method):
    doc.custom_pending_amount = doc.base_net_total * (100 - (doc.per_billed or 0)) / 100

def update_pending_amount_from_si(doc, method):
    so_names = set()
    for item in doc.items:
        if item.sales_order:
            so_names.add(item.sales_order)
    for so_name in so_names:
        so = frappe.get_doc("Sales Order", so_name)
        pending = so.base_net_total * (100 - (so.per_billed or 0)) / 100
        frappe.db.set_value("Sales Order", so_name, "custom_pending_amount", pending, update_modified=False)

def before_submit(self, method):
    missing_items = []
    for item in self.items:
        if frappe.get_value("Item", item.item_code, "custom_skip_sales_order_validation"):
            continue
        # Check if the item exists in any submitted BOM
        bom_exists = frappe.get_all("BOM",
            filters={"item": item.item_code, "docstatus": 1},
            fields=["name"])

        # Verify if any of the retrieved BOMs are submitted
        if not bom_exists:
            missing_items.append(item.item_code)

    # If there are missing items, prevent submission
    if missing_items:
        missing_items_str = ", ".join(missing_items)
        frappe.throw(
            _("The following items are not present in any submitted BOM and cannot be submitted: {0}").format(missing_items_str),
            title=_("BOM Validation Failed")
        )