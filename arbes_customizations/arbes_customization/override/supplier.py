import frappe

# this method to make supplier name uppercase
def before_insert(self, method):
    if self.supplier_name:
        self.supplier_name = self.supplier_name.upper()