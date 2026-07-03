"""Add the mx=false fast-mode param to Contact Validation's OpenAPI /email."""
import json
import os

p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                 "contact-validation-api", "docs", "openapi.json")
d = json.load(open(p, encoding="utf-8"))
get = d["paths"]["/email"]["get"]
params = get.setdefault("parameters", [])
if not any(x.get("name") == "mx" for x in params):
    params.append({
        "name": "mx",
        "in": "query",
        "required": False,
        "schema": {"type": "string", "enum": ["true", "false"], "default": "true"},
        "description": "Set mx=false to skip the DNS/deliverability lookup for a "
                       "faster, network-free syntax + disposable check "
                       "(returns deliverable=unknown, reason=mx_check_skipped).",
    })
    json.dump(d, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print("added mx param")
else:
    print("mx param already present")
