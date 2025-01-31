import frappe
from frappe import _
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