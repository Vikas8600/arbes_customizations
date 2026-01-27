import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    """Create custom field for PO Approval Amount Cap in Buying Settings"""

    custom_fields = {
        "Buying Settings": [
            {
                "fieldname": "po_approval_amount_cap",
                "fieldtype": "Currency",
                "label": "PO Approval Amount Cap",
                "insert_after": "maintain_same_rate",

            }
        ]
    }

    create_custom_fields(custom_fields, update=True)
