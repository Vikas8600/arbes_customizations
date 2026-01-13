__version__ = "0.0.1"


import erpnext.accounts.report.general_ledger.general_ledger as gl_module

_original_get_gl_entries = gl_module.get_gl_entries

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
                entry["party_name"] = voucher_party_map[voucher_no]["party_name"]

    return gl_entries

gl_module.get_gl_entries = _custom_get_gl_entries
