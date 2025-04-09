import frappe

# this method to make customer name uppercase
def before_insert(self, method):
    if self.customer_name:
        self.customer_name = self.customer_name.upper()