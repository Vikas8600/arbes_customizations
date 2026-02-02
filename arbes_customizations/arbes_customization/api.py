import frappe
from frappe import _

@frappe.whitelist()
def get_mr_to_be_billed_count(from_date=None, to_date=None):
   
    filters = {
        "docstatus": 1,
        "material_request_type": "Purchase",
        "per_ordered": [">", 0]
    }

    if from_date and to_date:
        filters["transaction_date"] = ["between", [from_date, to_date]]

    mrs = frappe.get_all(
        "Material Request",
        filters=filters,
        fields=["name"]
    )

    if not mrs:
        return 0

    mr_names = [mr.name for mr in mrs]

    unbilled_mrs = frappe.db.sql("""
        SELECT DISTINCT mri.parent
        FROM `tabMaterial Request Item` mri
        INNER JOIN `tabPurchase Order Item` poi ON poi.material_request = mri.parent
            AND poi.material_request_item = mri.name
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE mri.parent IN %(mr_names)s
            AND po.docstatus = 1
            AND po.per_received = 100
            AND po.per_billed < 100
            AND po.status NOT IN ('Closed', 'Cancelled')
    """, {"mr_names": mr_names}, as_dict=True)

    return len(unbilled_mrs)


@frappe.whitelist()
def get_mr_po_amount(from_date=None, to_date=None, filter_type="total"):
   
    mr_filters = {
        "docstatus": 1,
        "material_request_type": "Purchase"
    }

    if from_date and to_date:
        mr_filters["transaction_date"] = ["between", [from_date, to_date]]

    if filter_type == "po_issued":
        mr_filters["per_ordered"] = [">", 0]
    elif filter_type == "to_receive":
        mr_filters["per_ordered"] = [">", 0]
        mr_filters["per_received"] = ["<", 100]
        mr_filters["status"] = ["not in", ["Stopped", "Cancelled"]]
    elif filter_type == "to_bill":
        mr_filters["per_ordered"] = [">", 0]

    mrs = frappe.get_all("Material Request", filters=mr_filters, fields=["name"])

    if not mrs:
        return 0

    mr_names = [mr.name for mr in mrs]

    po_status_filter = ""
    if filter_type == "to_receive":
        po_status_filter = "AND po.per_received < 100 AND po.status NOT IN ('Closed', 'Cancelled')"
    elif filter_type == "to_bill":
        po_status_filter = "AND po.per_billed < 100 AND po.status NOT IN ('Closed', 'Cancelled')"

    result = frappe.db.sql(f"""
        SELECT SUM(po.base_grand_total) as total_amount
        FROM `tabPurchase Order` po
        INNER JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
        INNER JOIN `tabMaterial Request Item` mri ON poi.material_request = mri.parent
            AND poi.material_request_item = mri.name
        WHERE mri.parent IN %(mr_names)s
            AND po.docstatus = 1
            {po_status_filter}
    """, {"mr_names": mr_names}, as_dict=True)

    return result[0].total_amount if result and result[0].total_amount else 0


@frappe.whitelist()
def get_subcon_po_amounts(from_date=None, to_date=None, company=None):
 
    total_result = frappe.db.sql("""
        SELECT SUM(po.base_grand_total) as total_amount
        FROM `tabPurchase Order` po
        WHERE po.docstatus = 1
        AND po.is_subcontracted = 1
        AND po.status NOT IN ('Stopped', 'On Hold')
        AND po.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        AND (%(company)s IS NULL OR po.company = %(company)s)
    """, {"from_date": from_date, "to_date": to_date, "company": company}, as_dict=True)

    bill_result = frappe.db.sql("""
        SELECT
            SUM(poi.base_amount) as amount,
            SUM(poi.billed_amt * IFNULL(po.conversion_rate, 1)) as billed_amount,
            SUM(poi.base_amount - (poi.billed_amt * IFNULL(po.conversion_rate, 1))) as pending_amount
        FROM `tabPurchase Order` po
        INNER JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
        WHERE po.docstatus = 1
        AND po.is_subcontracted = 1
        AND po.status NOT IN ('Stopped', 'On Hold')
        AND po.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        AND (%(company)s IS NULL OR po.company = %(company)s)
    """, {"from_date": from_date, "to_date": to_date, "company": company}, as_dict=True)

    received_result = frappe.db.sql("""
        SELECT SUM(pri.base_amount) as received_amount
        FROM `tabPurchase Receipt` pr
        INNER JOIN `tabPurchase Receipt Item` pri ON pri.parent = pr.name
        INNER JOIN `tabPurchase Order Item` poi ON pri.purchase_order_item = poi.name
        INNER JOIN `tabPurchase Order` po ON poi.parent = po.name
        WHERE pr.docstatus = 1
        AND po.is_subcontracted = 1
        AND po.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        AND (%(company)s IS NULL OR po.company = %(company)s)
    """, {"from_date": from_date, "to_date": to_date, "company": company}, as_dict=True)

    total_amount = float(total_result[0].total_amount or 0) if total_result else 0
    amount = float(bill_result[0].amount or 0) if bill_result else 0
    billed_amount = float(bill_result[0].billed_amount or 0) if bill_result else 0
    pending_amount = float(bill_result[0].pending_amount or 0) if bill_result else 0
    received_amount = float(received_result[0].received_amount or 0) if received_result else 0

    return {
        "total_amount": total_amount,  
        "amount": amount,  
        "billed_amount": billed_amount,
        "pending_amount": pending_amount,  
        "received_amount": received_amount,
        "to_receive_amount": amount - received_amount  
    }


@frappe.whitelist()
def get_sales_revenue_data(from_date=None, to_date=None):
   
    data = {
        "so_amount": 0,
        "si_amount": 0,
        "pending_amount": 0
    }

    so_result = frappe.db.sql("""
        SELECT
            SUM(base_grand_total) as so_total,
            SUM(CASE WHEN per_billed < 100
                THEN base_grand_total * (100 - per_billed) / 100
                ELSE 0 END) as pending_amount
        FROM `tabSales Order`
        WHERE docstatus = 1
        AND transaction_date BETWEEN %(from_date)s AND %(to_date)s
    """, {"from_date": from_date, "to_date": to_date}, as_dict=True)

    si_result = frappe.db.sql("""
        SELECT SUM(base_grand_total) as si_total
        FROM `tabSales Invoice`
        WHERE docstatus = 1
        AND posting_date BETWEEN %(from_date)s AND %(to_date)s
    """, {"from_date": from_date, "to_date": to_date}, as_dict=True)

    if so_result and so_result[0]:
        data["so_amount"] = so_result[0].so_total or 0
        data["pending_amount"] = so_result[0].pending_amount or 0

    if si_result and si_result[0]:
        data["si_amount"] = si_result[0].si_total or 0

    return data


@frappe.whitelist()
def get_monthly_revenue_data(from_date=None, to_date=None):
  
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    if not from_date or not to_date:
        return []

    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d")

    months_data = []
    current = datetime(start.year, start.month, 1)

    while current <= end:
        month_start = current.strftime("%Y-%m-%d")
        month_end = (current + relativedelta(months=1, days=-1)).strftime("%Y-%m-%d")

        so_result = frappe.db.sql("""
            SELECT
                SUM(base_grand_total) as so_total,
                SUM(CASE WHEN per_billed < 100
                    THEN base_grand_total * (100 - per_billed) / 100
                    ELSE 0 END) as pending_amount
            FROM `tabSales Order`
            WHERE docstatus = 1
            AND transaction_date BETWEEN %(start)s AND %(end)s
        """, {"start": month_start, "end": month_end}, as_dict=True)

        si_result = frappe.db.sql("""
            SELECT SUM(base_grand_total) as si_total
            FROM `tabSales Invoice`
            WHERE docstatus = 1
            AND posting_date BETWEEN %(start)s AND %(end)s
        """, {"start": month_start, "end": month_end}, as_dict=True)

        so_amount = so_result[0].so_total if so_result and so_result[0].so_total else 0
        si_amount = si_result[0].si_total if si_result and si_result[0].si_total else 0
        pending_amount = so_result[0].pending_amount if so_result and so_result[0].pending_amount else 0

        months_data.append({
            "month": current.strftime("%b %y"),
            "so_amount": float(so_amount) if so_amount else 0,
            "si_amount": float(si_amount) if si_amount else 0,
            "pending_amount": float(pending_amount) if pending_amount else 0
        })

        current = current + relativedelta(months=1)

    return months_data[-12:]


@frappe.whitelist()
def get_sales_bifurcation_pending(from_date=None, to_date=None, company=None):
   
    result = frappe.db.sql("""
        SELECT
            so.custom_domestic_export,
            so.territory,
            SUM(soi.base_amount - soi.billed_amt) as pending_amount
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
        WHERE so.docstatus = 1
        AND so.status NOT IN ('Stopped', 'On Hold', 'Closed')
        AND so.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        AND (%(company)s IS NULL OR so.company = %(company)s)
        AND soi.billed_amt < soi.amount
        GROUP BY so.custom_domestic_export, so.territory
    """, {"from_date": from_date, "to_date": to_date, "company": company}, as_dict=True)

    domestic_pending = 0
    export_usa_pending = 0
    export_row_pending = 0

    for row in result:
        pending = float(row.pending_amount or 0)
        dom_export = row.custom_domestic_export or ""
        territory = row.territory or ""

        if dom_export == "Domestic":
            domestic_pending += pending
        elif dom_export == "Export":
            if territory == "USA":
                export_usa_pending += pending
            else:
                export_row_pending += pending

    return {
        "domestic_pending": domestic_pending,
        "export_usa_pending": export_usa_pending,
        "export_row_pending": export_row_pending
    }
