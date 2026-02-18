# Copyright (c) 2026, hybrowlabs and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document


class SpareOrder(Document):
	pass


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_items_from_sales_orders(doctype, txt, searchfield, start, page_len, filters):
	sales_orders = filters.get("sales_orders", [])
	if isinstance(sales_orders, str):
		sales_orders = json.loads(sales_orders)

	if not sales_orders:
		return []

	return frappe.db.sql(
		"""
		SELECT DISTINCT soi.item_code, soi.item_name
		FROM `tabSales Order Item` soi
		WHERE soi.parent IN %(sales_orders)s
			AND soi.docstatus = 1
			AND (soi.item_code LIKE %(txt)s OR soi.item_name LIKE %(txt)s)
		LIMIT %(page_len)s OFFSET %(start)s
		""",
		{
			"sales_orders": sales_orders,
			"txt": f"%{txt}%",
			"page_len": page_len,
			"start": start,
		},
	)
