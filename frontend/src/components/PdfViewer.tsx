import { Download, ExternalLink, FileText } from "lucide-react";
import { downloadPdf } from "../lib/api";
import { usePdfUrl } from "../lib/hooks";
import { Button, Spinner } from "./ui";

/** Loads the PDF through the authenticated API (token in header) and shows it in-page via a blob URL. */
export default function PdfViewer({ path, filename, height = "70vh" }: { path: string; filename: string; height?: string }) {
  const { url, error } = usePdfUrl(path);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-navy"><FileText className="h-4 w-4 text-royal" />{filename}</div>
        <div className="flex gap-2">
          {url && <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><ExternalLink className="h-3.5 w-3.5" />Open</a>}
          <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadPdf(path, filename)}>Download</Button>
        </div>
      </div>
      <div style={{ height }} className="grid place-items-stretch">
        {error ? <div className="grid place-items-center p-6 text-sm text-red-600">{error}</div>
          : !url ? <div className="grid place-items-center"><Spinner className="h-8 w-8" /></div>
          : <iframe title={filename} src={url} className="h-full w-full bg-white" />}
      </div>
    </div>
  );
}
