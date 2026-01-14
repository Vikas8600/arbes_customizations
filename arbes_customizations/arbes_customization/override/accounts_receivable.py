from frappe.utils import getdate

_patched = False


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


def apply_patch():
    global _patched
    if not _patched:
        from erpnext.accounts.report.accounts_receivable.accounts_receivable import ReceivablePayableReport
        ReceivablePayableReport.set_ageing = custom_set_ageing
        _patched = True
