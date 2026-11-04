from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.formula import ArrayFormula

wb = Workbook()
d = wb.active; d.title = "Data"
c = wb.create_sheet("Config")
o = wb.create_sheet("My Sheet")
 
d.append(["Item", "Price", "Qty", "Total", "Note"])
rows = [("A", 2.5, 4), ("B", 3, 2), ("C", 10, 1)]
for i, (a, b, q) in enumerate(rows, start=2):
    d.append([a, b, q, f"=B{i}*C{i}", f'=IF(D{i}>8,"big","small")'])
d["A6"] = "Sum";   d["D6"] = "=SUM(D2:D4)"
d["A7"] = "Taxed"; d["D7"] = "=D6*(1+TaxRate)"          # defined name in formula
d["A8"] = "Mixed"; d["D8"] = "=$B$2+B$3+$C4"            # absolute / mixed refs
d["A9"] = "Cross"; d["D9"] = "=Config!B1+'My Sheet'!B1" # cross-sheet + quoted
d["A10"] = "Text"; d["D10"] = '=A2&"-"&TEXT(B2,"0.00")&" ""quoted"""'
d["A11"] = "Nested"; d["D11"] = '=IF(AND(B2>1,C2<10),MAX(B2:B4)*2,IFERROR(1/0,-1))'
d["A12"] = "Lookup"; d["D12"] = "=INDEX(B2:B4,MATCH(\"B\",A2:A4,0))"
d["A13"] = "Range op"; d["D13"] = "=SUMPRODUCT(B2:B4,C2:C4)"
d["A14"] = "Whole col"; d["D14"] = "=COUNTA(A:A)"
d["A15"] = "Array"; d["D15"] = ArrayFormula("D15:D15", "=SUM(B2:B4*C2:C4)")
d["A16"] = "Const"; d["D16"] = "=1+2*3^2%"                # operator precedence, %
d["A17"] = "Bool/cmp"; d["D17"] = "=OR(B2<>B3,C2>=4)"
c["A1"] = "TaxRate"; c["B1"] = 0.2
o["A1"] = "Local";   o["B1"] = 42
wb.defined_names["TaxRate"] = DefinedName("TaxRate", attr_text="Config!$B$1")
wb.save("formulas.xlsx")
