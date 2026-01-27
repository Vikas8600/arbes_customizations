import frappe

def validate(doc, method):
    update_kg_uom_from_weight(doc)


def update_kg_uom_from_weight(doc):
 
    if not doc.custom_total_weight:
        return

    weight = float(doc.custom_total_weight)

    if weight <= 0:
        return

    conversion_factor = 1 / weight

    kg_row = None
    for row in doc.uoms:
        if row.uom == "Kg":
            kg_row = row
            break

    if kg_row:
        if kg_row.conversion_factor != conversion_factor:
            kg_row.conversion_factor = conversion_factor
    else:
        doc.append("uoms", {
            "uom": "Kg",
            "conversion_factor": conversion_factor
        })
