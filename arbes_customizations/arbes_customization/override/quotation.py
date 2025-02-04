
def after_insert(doc, method):
    if doc.amended_from:
        id = doc.name
        doc.custom_quotation_revision = last_value = id.split("-")[-1]
        doc.save(ignore_permissions=True)