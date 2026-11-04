from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.formula import ArrayFormula
 
wb = Workbook()
data = wb.active; data.title = "Data"
cfg = wb.create_sheet("Config")
other = wb.create_sheet("My Sheet")   # space in name -> quoting
 
data.append(["Item", "Price", "Qty"])
for r in [("A", 2.5, 4), ("B", 3, 2), ("C", 10, 1)]:
    data.append(r)
cfg["A1"] = "TaxRate"; cfg["B1"] = 0.2
cfg["A2"] = "Region";  cfg["B2"] = "EU"
other["A1"] = "Local"; other["B1"] = 42
 
def name(n, ref, **kw): return DefinedName(n, attr_text=ref, **kw)
 
# workbook-scoped
wb.defined_names["TaxRate"]   = name("TaxRate", "Config!$B$1")
wb.defined_names["Prices"]    = name("Prices", "Data!$B$2:$B$4")
wb.defined_names["Everything"] = name("Everything", "Data!$A$1:$C$4")
# same name, sheet-scoped -> shadows workbook-level "Prices" on Data
data.defined_names["Prices"]  = name("Prices", "Data!$C$2:$C$4")
# sheet name needing quotes
wb.defined_names["LocalVal"]  = name("LocalVal", "'My Sheet'!$B$1")
# non-range targets: constant, formula, dynamic
wb.defined_names["Pi2"]       = name("Pi2", "3.14159")
wb.defined_names["Greeting"]  = name("Greeting", '"hello"')
wb.defined_names["TaxedTotal"] = name("TaxedTotal", "SUM(Data!$B$2:$B$4)*(1+Config!$B$1)")
wb.defined_names["Dynamic"]   = name("Dynamic", "OFFSET(Data!$A$1,0,0,COUNTA(Data!$A:$A),3)")
# hidden
wb.defined_names["_Hidden"]   = name("_Hidden", "Config!$B$2", hidden=True)
# built-in print area (sheet-scoped)
data.print_area = "A1:C4"
# multi-area reference
wb.defined_names["TwoAreas"]  = name("TwoAreas", "Data!$A$2:$A$4,Data!$C$2:$C$4")
 
# Excel Table (separate namespace from defined names)
t = Table(displayName="Items", ref="A1:C4")
t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
data.add_table(t)
 
wb.save("defined_names.xlsx")