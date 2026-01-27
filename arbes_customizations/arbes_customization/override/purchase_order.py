import frappe
from frappe import _

def calculate_qty_from_default_uom(doc, method=None):
    for row in doc.items:
        if not (row.custom_default_uom_qty and row.custom_calculated_weight_kg):
            row.qty = 0
            continue
        
        qty_in_kg = float(row.custom_default_uom_qty) * float(row.custom_calculated_weight_kg)
        row.qty = qty_in_kg
