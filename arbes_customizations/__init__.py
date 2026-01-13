__version__ = "0.0.1"


from erpnext.accounts.report.accounts_receivable.accounts_receivable import (
            ReceivablePayableReport,
        )
import erpnext.accounts.report.general_ledger.general_ledger as gl_module


def _get_custom_set_ageing():
    from frappe.utils import getdate

    def custom_set_ageing(self, row):
        if self.account_type == "Receivable" and row.outstanding < 0:
            for i in self.range_numbers:
                setattr(row, f"range{i}", 0.0)
            row.age = 0
            row.total_due = 0
            return

        if self.filters.ageing_based_on == "Due Date":
            entry_date = row.due_date or row.posting_date
        elif self.filters.ageing_based_on == "Supplier Invoice Date":
            entry_date = row.bill_date
        else:
            entry_date = row.posting_date

        self.get_ageing_data(entry_date, row)

        if getdate(entry_date) > getdate(self.age_as_on):
            for i in self.range_numbers:
                setattr(row, f"range{i}", 0.0)

        row.total_due = sum(row[f"range{i}"] for i in self.range_numbers)

    return custom_set_ageing


ReceivablePayableReport.set_ageing = _get_custom_set_ageing()



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
