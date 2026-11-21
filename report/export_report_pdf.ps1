# Update the table of contents of Report_CO5103_VoVanDung.docx and export it to PDF with Word.
# Run after: python report/build_report_docx.py
$ErrorActionPreference = "Stop"
# [string]: Join-Path returns a wrapped string; passed to Word as-is, SaveAs2 hangs
[string]$docx = Join-Path $PSScriptRoot "Report_CO5103_VoVanDung.docx"
[string]$pdf = Join-Path $PSScriptRoot "Report_CO5103_VoVanDung.pdf"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $false, $false)
    # captions (SEQ), contents and the lists of figures and tables, then page numbers again
    [void]$doc.Fields.Update()
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($tof in $doc.TablesOfFigures) { $tof.Update() }
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) { $toc.UpdatePageNumbers() }
    foreach ($tof in $doc.TablesOfFigures) { $tof.UpdatePageNumbers() }
    $doc.Save()
    $doc.SaveAs2($pdf, 17)  # wdFormatPDF
    $doc.Close($false)
    "updated the contents and exported $pdf"
}
finally {
    $word.Quit()
}
