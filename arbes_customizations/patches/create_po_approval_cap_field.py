import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    """Create custom field for PO Approval Amount Cap in Buying Settings"""

    custom_fields = {
        "Buying Settings": [
            {
                "fieldname": "po_approval_amount_cap",
                "fieldtype": "Currency",
                "label": "PO Approval Amount Cap (in Lakhs)",
                "insert_after": "maintain_same_rate",
                "description": "If PO amount exceeds this value (in Lakhs), System Manager approval is required. Set 0 to skip this check. E.g., 5 means 5 Lakhs."
            }
        ]
    }

    create_custom_fields(custom_fields, update=True)
