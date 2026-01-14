import frappe
import erpnext.accounts.report.general_ledger.general_ledger as gl_module

_patched = False
_original_get_gl_entries = None


def _custom_get_gl_entries(filters, accounting_dimensions):
    gl_entries = _original_get_gl_entries(filters, accounting_dimensions)

    voucher_party_map = {}

    for entry in gl_entries:
        voucher_no = entry.get("voucher_no")
        if voucher_no and entry.get("party_type") and entry.get("party"):
            if voucher_no not in voucher_party_map:
                voucher_party_map[voucher_no] = {
                    "party_type": entry.get("party_type"),
                    "party": entry.get("party"),
                    "party_name": entry.get("party_name")
                }

    for entry in gl_entries:
        voucher_no = entry.get("voucher_no")
        if voucher_no and voucher_no in voucher_party_map:
            if not entry.get("party_type"):
                entry["party_type"] = voucher_party_map[voucher_no]["party_type"]
            if not entry.get("party"):
                entry["party"] = voucher_party_map[voucher_no]["party"]
            if not entry.get("party_name"):
                party_info = voucher_party_map[voucher_no]
                party_type = party_info["party_type"]
                party = party_info["party"]
                # Fetch party_name from database
                if party_type == "Supplier":
                    entry["party_name"] = frappe.db.get_value("Supplier", party, "supplier_name")
                elif party_type == "Customer":
                    entry["party_name"] = frappe.db.get_value("Customer", party, "customer_name")
                else:
                    entry["party_name"] = party

    return gl_entries


def apply_patch():
    global _patched, _original_get_gl_entries
    if not _patched:
        _original_get_gl_entries = gl_module.get_gl_entries
        gl_module.get_gl_entries = _custom_get_gl_entries
        _patched = True


def before_request():
    from arbes_customizations.arbes_customization.override.accounts_receivable import apply_patch as apply_ar_patch
    apply_patch()
    apply_ar_patch()
